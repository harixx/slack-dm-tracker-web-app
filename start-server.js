const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Slack DM Tracker Server...');
console.log('📁 Working directory:', process.cwd());
console.log('📄 Server file:', path.join(__dirname, 'server', 'index.js'));

const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

server.on('close', (code) => {
  console.log(`🔴 Server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  server.kill();
  process.exit();
});