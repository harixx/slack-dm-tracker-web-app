import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { WebClient } from '@slack/web-api';
import { InstallProvider } from '@slack/oauth';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());

// Slack OAuth installer
const installer = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  scopes: ['chat:write', 'users:read'],
  userScopes: ['im:history', 'im:read', 'users:read'],
  installationStore: {
    storeInstallation: async (installation) => {
      // Store installation in database
      console.log('Installation stored:', installation.user.id);
      return await storeUserToken(installation);
    },
    fetchInstallation: async (installQuery) => {
      // Fetch installation from database
      return await fetchUserToken(installQuery.userId);
    },
    deleteInstallation: async (installQuery) => {
      // Delete installation from database
      return await deleteUserToken(installQuery.userId);
    }
  }
});

// In-memory storage for demo (replace with Supabase in production)
const userTokens = new Map();
const dmData = new Map();

// Store user token
async function storeUserToken(installation) {
  const userData = {
    userId: installation.user.id,
    teamId: installation.team.id,
    accessToken: installation.user.token,
    botToken: installation.bot.token,
    user: installation.user,
    team: installation.team,
    createdAt: new Date().toISOString()
  };
  
  userTokens.set(installation.user.id, userData);
  return userData;
}

// Fetch user token
async function fetchUserToken(userId) {
  return userTokens.get(userId);
}

// Delete user token
async function deleteUserToken(userId) {
  userTokens.delete(userId);
  dmData.delete(userId);
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.get('/slack/install', async (req, res) => {
  try {
    const url = await installer.generateInstallUrl({
      scopes: ['chat:write', 'users:read'],
      userScopes: ['im:history', 'im:read', 'users:read'],
      redirectUri: `https://localhost:3001/slack/oauth_redirect`
    });
    res.redirect(url);
  } catch (error) {
    console.error('Install error:', error);
    res.status(500).json({ error: 'Installation failed' });
  }
});

app.get('/slack/oauth_redirect', async (req, res) => {
  try {
    // Handle the OAuth callback
    const installation = await installer.handleCallback(req, res);
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: installation.user.id, teamId: installation.team.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify(installation.user))}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Error</h1>
          <p>Authentication failed: ${error.message}</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Return to App</a></p>
        </body>
      </html>
    `);
  }
});

app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const installation = await fetchUserToken(req.user.userId);
    if (!installation) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: installation.user,
      team: installation.team
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/dms', authenticateToken, async (req, res) => {
  try {
    const installation = await fetchUserToken(req.user.userId);
    if (!installation) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDms = dmData.get(req.user.userId) || [];
    res.json(userDms);
  } catch (error) {
    console.error('DMs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch DMs' });
  }
});

app.post('/api/sync-dms', authenticateToken, async (req, res) => {
  try {
    const installation = await fetchUserToken(req.user.userId);
    if (!installation) {
      return res.status(404).json({ error: 'User not found' });
    }

    await syncUserDMs(req.user.userId);
    const userDms = dmData.get(req.user.userId) || [];
    
    res.json({ 
      success: true, 
      count: userDms.length,
      dms: userDms 
    });
  } catch (error) {
    console.error('DM sync error:', error);
    res.status(500).json({ error: 'Failed to sync DMs' });
  }
});

app.post('/api/send-digest', authenticateToken, async (req, res) => {
  try {
    const installation = await fetchUserToken(req.user.userId);
    if (!installation) {
      return res.status(404).json({ error: 'User not found' });
    }

    const digest = await generateDailyDigest(req.user.userId);
    await sendDigestToUser(req.user.userId, digest);
    
    res.json({ success: true, digest });
  } catch (error) {
    console.error('Digest send error:', error);
    res.status(500).json({ error: 'Failed to send digest' });
  }
});

// DM syncing function
async function syncUserDMs(userId) {
  try {
    const installation = await fetchUserToken(userId);
    if (!installation) return;

    const slack = new WebClient(installation.accessToken);
    
    // Get all DM conversations
    const conversations = await slack.conversations.list({
      types: 'im',
      limit: 100
    });

    const userDms = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const conversation of conversations.channels) {
      try {
        // Get conversation history
        const history = await slack.conversations.history({
          channel: conversation.id,
          oldest: Math.floor(sevenDaysAgo.getTime() / 1000),
          limit: 100
        });

        // Get user info for the DM recipient
        const userInfo = await slack.users.info({
          user: conversation.user
        });

        // Filter messages sent by the authenticated user
        const userMessages = history.messages.filter(msg => 
          msg.user === userId && msg.type === 'message' && !msg.subtype
        );

        for (const message of userMessages) {
          // Check for replies (messages from the other user after this message)
          const repliesAfter = history.messages.filter(msg => 
            msg.user === conversation.user && 
            parseFloat(msg.ts) > parseFloat(message.ts) &&
            msg.type === 'message' && 
            !msg.subtype
          );

          const hasReply = repliesAfter.length > 0;
          const replyTimestamp = hasReply ? repliesAfter[0].ts : null;

          userDms.push({
            id: `${conversation.id}_${message.ts}`,
            user_id: userId,
            recipient_id: conversation.user,
            recipient_name: userInfo.user.real_name || userInfo.user.name,
            recipient_avatar: userInfo.user.profile.image_48,
            message: message.text || '',
            timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
            has_reply: hasReply,
            reply_timestamp: replyTimestamp ? new Date(parseFloat(replyTimestamp) * 1000).toISOString() : null,
            slack_link: `https://${installation.team.domain}.slack.com/archives/${conversation.id}/p${message.ts.replace('.', '')}`,
            date: new Date(parseFloat(message.ts) * 1000).toISOString().split('T')[0],
            channel_id: conversation.id
          });
        }
      } catch (error) {
        console.error(`Error processing conversation ${conversation.id}:`, error);
      }
    }

    // Sort by timestamp (newest first)
    userDms.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Store in memory (replace with database in production)
    dmData.set(userId, userDms);
    
    console.log(`Synced ${userDms.length} DMs for user ${userId}`);
    return userDms;
  } catch (error) {
    console.error('Error syncing DMs:', error);
    throw error;
  }
}

// Generate daily digest
async function generateDailyDigest(userId) {
  const userDms = dmData.get(userId) || [];
  const today = new Date().toISOString().split('T')[0];
  const todayDms = userDms.filter(dm => dm.date === today);
  
  const totalSent = todayDms.length;
  const totalReplies = todayDms.filter(dm => dm.has_reply).length;
  const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

  return {
    date: today,
    total_sent: totalSent,
    total_replies: totalReplies,
    reply_rate: replyRate,
    top_conversations: todayDms.slice(0, 5)
  };
}

// Send digest to user
async function sendDigestToUser(userId, digest) {
  try {
    const installation = await fetchUserToken(userId);
    if (!installation) return;

    const slack = new WebClient(installation.botToken);
    
    const digestMessage = `📊 *Daily DM Digest - ${digest.date}*

📤 Messages sent: ${digest.total_sent}
💬 Replies received: ${digest.total_replies}
📈 Reply rate: ${digest.reply_rate}%

${digest.top_conversations.length > 0 ? 
  `🔥 *Top conversations:*\n${digest.top_conversations.map(dm => 
    `• ${dm.recipient_name}: "${dm.message.substring(0, 50)}${dm.message.length > 50 ? '...' : ''}" ${dm.has_reply ? '✅' : '❌'}`
  ).join('\n')}` : 
  'No messages sent today.'
}

Keep up the great communication! 🚀`;

    await slack.chat.postMessage({
      channel: userId,
      text: digestMessage
    });

    console.log(`Digest sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending digest:', error);
    throw error;
  }
}

// Scheduled tasks
// Sync DMs every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('Running DM sync for all users...');
  for (const [userId] of userTokens) {
    try {
      await syncUserDMs(userId);
    } catch (error) {
      console.error(`Failed to sync DMs for user ${userId}:`, error);
    }
  }
});

// Send daily digest at 7 PM
cron.schedule('0 19 * * *', async () => {
  console.log('Sending daily digests...');
  for (const [userId] of userTokens) {
    try {
      const digest = await generateDailyDigest(userId);
      await sendDigestToUser(userId, digest);
    } catch (error) {
      console.error(`Failed to send digest to user ${userId}:`, error);
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Slack DM Tracker server running on port ${PORT}`);
  console.log(`📱 Install URL: http://localhost:${PORT}/slack/install`);
});