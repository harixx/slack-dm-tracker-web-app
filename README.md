# Production Slack DM Tracker

A production-grade web application that tracks Slack direct messages and provides analytics on reply rates and engagement.

## Features

- **Real Slack OAuth Integration**: Secure authentication with Slack workspaces
- **DM Tracking**: Automatically tracks direct messages sent by users
- **Reply Detection**: Monitors and detects replies to sent DMs
- **Analytics Dashboard**: Visual insights into DM activity and reply rates
- **Daily Digest**: Automated daily summaries sent via Slack
- **Multi-user Support**: Supports multiple users with secure token management
- **Real-time Sync**: Manual and automatic DM synchronization

## Setup Instructions

### 1. Slack App Configuration

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Enter app name and select your workspace
4. Configure the following scopes in "OAuth & Permissions":

**Bot Token Scopes:**
- `chat:write` - Send messages as the app
- `users:read` - View people in workspace

**User Token Scopes:**
- `im:history` - Read direct message history
- `im:read` - View basic info about direct messages
- `users:read` - View people in workspace

5. Add redirect URL: `http://localhost:3001/slack/oauth_redirect`
6. Install the app to your workspace

### 2. Environment Setup

The `.env` file is already configured with your Slack credentials:
- SLACK_CLIENT_ID: 6230140172132.9227849559104
- SLACK_CLIENT_SECRET: 72ea9a912ce402090c2492ba6e05229a
- SLACK_SIGNING_SECRET: a3125a6e373ce7b68b2e91d726798dbc

### 3. Installation & Running

```bash
# Install dependencies
npm install

# Run both frontend and backend
npm run dev:full

# Or run separately:
# Backend only
npm run server

# Frontend only  
npm run dev
```

### 4. Usage

1. Open http://localhost:5173
2. Click "Continue with Slack" to authenticate
3. Authorize the app in your Slack workspace
4. Use the dashboard to:
   - View DM analytics
   - Sync your DMs manually
   - Browse message history with reply status
   - Send daily digests to Slack

## API Endpoints

- `GET /slack/install` - Initiate Slack OAuth flow
- `GET /slack/oauth_redirect` - Handle OAuth callback
- `GET /api/user` - Get authenticated user info
- `GET /api/dms` - Fetch user's tracked DMs
- `POST /api/sync-dms` - Manually sync DMs from Slack
- `POST /api/send-digest` - Send daily digest to user

## Scheduled Tasks

- **Every 10 minutes**: Automatic DM synchronization for all users
- **Daily at 7 PM**: Send daily digest to all users via Slack DM

## Security Features

- JWT-based authentication
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Secure token storage

## Production Deployment

For production deployment:

1. Set up a proper database (PostgreSQL/MongoDB)
2. Configure environment variables for production
3. Set up SSL certificates
4. Configure proper CORS origins
5. Set up monitoring and logging
6. Use a process manager like PM2

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Authentication**: Slack OAuth 2.0, JWT
- **Scheduling**: node-cron
- **Security**: Helmet, CORS, Rate Limiting