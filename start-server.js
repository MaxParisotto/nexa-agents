/**
 * Simple script to start the Nexa Agents server
 * 
 * Usage:
 * node start-server.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Server file path
const serverPath = path.join(__dirname, 'src/server/index.js');

console.log('Starting Nexa Agents server...');
console.log(`Server path: ${serverPath}`);

// Spawn server process
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit'
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

// Print some helpful info
console.log('\nServer should be running at:');
console.log('- http://localhost:3001');
console.log('\nPress Ctrl+C to stop the server');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
}); 