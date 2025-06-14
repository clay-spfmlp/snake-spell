#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

// Change to project root
process.chdir(__dirname);

console.log('Current working directory:', process.cwd());
console.log('Looking for server file...');

const serverPath = path.join(__dirname, 'apps', 'game-server', 'dist', 'apps', 'game-server', 'src', 'index.js');
console.log('Server path:', serverPath);

// Check if file exists
const fs = require('fs');
if (!fs.existsSync(serverPath)) {
  console.error('Server file not found at:', serverPath);
  console.log('Directory contents:');
  console.log('Root:', fs.readdirSync(__dirname));
  
  if (fs.existsSync('apps')) {
    console.log('apps/:', fs.readdirSync('apps'));
  }
  
  if (fs.existsSync('apps/game-server')) {
    console.log('apps/game-server/:', fs.readdirSync('apps/game-server'));
  }
  
  if (fs.existsSync('apps/game-server/dist')) {
    console.log('apps/game-server/dist/:', fs.readdirSync('apps/game-server/dist'));
  }
  
  process.exit(1);
}

// Start the server
console.log('Starting server...');
const server = spawn('node', [serverPath], { stdio: 'inherit' });

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});