import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { WebClient } from '@slack/web-api';
import jwt from 'jsonwebtoken';

dotenv.config();

// Log environment variables at startup
console.log('🔧 Environment Variables Check:');
console.log(`SLACK_CLIENT_ID: ${process.env.SLACK_CLIENT_ID ? 'Set' : 'MISSING'}`);
console.log(`SLACK_CLIENT_SECRET: ${process.env.SLACK_CLIENT_SECRET ? 'Set' : 'MISSING'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'MISSING'}`);
console.log(`PORT: ${process.env.PORT || 3001}`);
console.log('---');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage for demo
const userTokens = new Map();
const dmData = new Map();

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'slack-dm-tracker-secret-key-2024';

// Store user token
async function storeUserToken(installation) {
  const userData = {
    userId: installation.user.id,
    teamId: installation.team?.id,
    accessToken: installation.user.token,
    botToken: installation.bot?.token,
    user: installation.user,
    team: installation.team,
    createdAt: new Date().toISOString()
  };
  
  userTokens.set(installation.user.id, userData);
  console.log(`Stored token for user: ${installation.user.id}`);
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
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Simple OAuth flow without InstallProvider
app.get('/slack/install', (req, res) => {
  console.log('🚀 Starting OAuth flow...');
  console.log('🔍 Request headers:', req.headers);
  console.log('🔍 Request origin:', req.get('origin'));
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = 'http://localhost:3001/slack/oauth_redirect';
  const scopes = 'chat:write,users:read,im:history,im:read';
  
  if (!clientId) {
    console.error('❌ SLACK_CLIENT_ID is missing!');
    return res.status(500).json({ error: 'Slack client ID not configured' });
  }
  
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('📱 Redirecting to Slack OAuth URL:', authUrl);
  res.redirect(authUrl);
});

app.get('/slack/oauth_redirect', async (req, res) => {
  console.log('🔄 OAuth redirect received');
  console.log('Query params:', req.query);
  
  const { code, error } = req.query;
  
  if (error) {
    console.error('❌ OAuth error from Slack:', error);
    return res.redirect(`http://localhost:5173?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('❌ No authorization code received from Slack');
    return res.redirect('http://localhost:5173?error=no_code');
  }

  console.log('✅ Authorization code received:', code.substring(0, 20) + '...');

  try {
    console.log('🔄 Exchanging authorization code for access token...');
    
    const tokenRequestBody = {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code: code,
      redirect_uri: 'http://localhost:3001/slack/oauth_redirect'
    };
    
    console.log('Token request body:', {
      ...tokenRequestBody,
      client_secret: tokenRequestBody.client_secret ? '[HIDDEN]' : 'MISSING'
    });
    
    // Exchange code for token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenRequestBody)
    });

    const tokenData = await tokenResponse.json();
    console.log('📋 Token response from Slack:', {
      ok: tokenData.ok,
      error: tokenData.error,
      access_token: tokenData.access_token ? '[RECEIVED]' : 'MISSING',
      authed_user: tokenData.authed_user ? 'PRESENT' : 'MISSING',
      team: tokenData.team ? 'PRESENT' : 'MISSING'
    });

    if (!tokenData.ok) {
      console.error('❌ Token exchange failed:', tokenData.error);
      throw new Error(tokenData.error || 'Token exchange failed');
    }

    console.log('🔄 Fetching user info from Slack...');
    // Get user info
    const slack = new WebClient(tokenData.access_token);
    const userInfo = await slack.users.info({ user: tokenData.authed_user.id });
    
    console.log('👤 User info response:', {
      ok: userInfo.ok,
      user_id: userInfo.user?.id,
      user_name: userInfo.user?.name,
      real_name: userInfo.user?.real_name
    });
    
    if (!userInfo.ok) {
      console.error('❌ Failed to get user info:', userInfo.error);
      throw new Error('Failed to get user info');
    }

    console.log('🔄 Creating installation object...');
    // Store installation data
    const installation = {
      user: {
        id: tokenData.authed_user.id,
        token: tokenData.access_token,
        name: userInfo.user.name,
        real_name: userInfo.user.real_name || userInfo.user.name,
        profile: userInfo.user.profile
      },
      team: {
        id: tokenData.team?.id,
        name: tokenData.team?.name,
        domain: tokenData.team?.name?.toLowerCase()
      },
      bot: {
        token: tokenData.access_token
      }
    };

    console.log('💾 Storing user token...');
    await storeUserToken(installation);

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: installation.user.id, 
        teamId: installation.team?.id 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎫 JWT token generated successfully');
    
    // Redirect to frontend with token and user data
    const frontendUrl = `http://localhost:5173?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify(installation.user))}`;
    console.log('🏠 Redirecting to frontend with auth data');
    res.redirect(frontendUrl);

  } catch (error) {
    console.error('❌ OAuth callback error:', error.message);
    res.redirect(`http://localhost:5173?error=${encodeURIComponent(error.message)}`);
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
            slack_link: `https://${installation.team?.domain || 'app'}.slack.com/archives/${conversation.id}/p${message.ts.replace('.', '')}`,
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
    
    // Store in memory
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

    const slack = new WebClient(installation.botToken || installation.accessToken);
    
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

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Scheduled tasks
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
  console.log('='.repeat(50));
  console.log(`🚀 Slack DM Tracker server running on port ${PORT}`);
  console.log(`📱 Install URL: http://localhost:${PORT}/slack/install`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret configured: ${JWT_SECRET ? 'Yes' : 'No'}`);
  console.log(`📋 Slack Client ID: ${process.env.SLACK_CLIENT_ID ? 'Configured' : 'Missing'}`);
  console.log('='.repeat(50));
});