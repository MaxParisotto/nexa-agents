/**
 * Migration script to separate client and server code
 * Run with: node migrate.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base directories
const baseDir = __dirname;
const srcDir = path.join(baseDir, 'src');
const clientDir = path.join(baseDir, 'client');
const serverDir = path.join(baseDir, 'server');
const sharedDir = path.join(baseDir, 'shared');

console.log('Creating directory structure...');

// Create directories if they don't exist
[
  clientDir, 
  serverDir, 
  sharedDir,
  path.join(clientDir, 'src'),
  path.join(clientDir, 'public'),
  path.join(serverDir, 'src'),
  path.join(serverDir, 'src', 'api'),
  path.join(serverDir, 'src', 'services'),
  path.join(sharedDir, 'constants'),
  path.join(sharedDir, 'types')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Copy files from src to client and server directories
console.log('Migrating files...');

// Client files
if (fs.existsSync(path.join(srcDir, 'client'))) {
  copyDir(path.join(srcDir, 'client'), path.join(clientDir, 'src'));
}

// Look for client files in root of src
const clientFiles = ['App.jsx', 'index.jsx', 'App.css', 'index.css']
  .map(file => path.join(srcDir, file))
  .filter(file => fs.existsSync(file));
  
clientFiles.forEach(file => {
  const dest = path.join(clientDir, 'src', path.basename(file));
  fs.copyFileSync(file, dest);
  console.log(`Copied ${file} to ${dest}`);
});

// Check if there are components directories
const componentsDir = path.join(srcDir, 'components');
if (fs.existsSync(componentsDir)) {
  copyDir(componentsDir, path.join(clientDir, 'src', 'components'));
}

// Server files
if (fs.existsSync(path.join(srcDir, 'server'))) {
  copyDir(path.join(srcDir, 'server'), path.join(serverDir, 'src'));
}
if (fs.existsSync(path.join(srcDir, 'gateway'))) {
  copyDir(path.join(srcDir, 'gateway'), path.join(serverDir, 'src', 'gateway'));
}

// Shared files
if (fs.existsSync(path.join(srcDir, 'shared'))) {
  copyDir(path.join(srcDir, 'shared'), sharedDir);
}

// Copy index.html to client
if (fs.existsSync(path.join(baseDir, 'index.html'))) {
  fs.copyFileSync(
    path.join(baseDir, 'index.html'), 
    path.join(clientDir, 'index.html')
  );
  console.log(`Copied index.html to client directory`);
}

// Create client package.json
console.log('Creating client package.json...');
const packageJson = JSON.parse(fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8'));
const clientPackageJson = {
  name: 'nexa-agents-client',
  version: packageJson.version || '1.0.0',
  type: 'module',
  description: 'Nexa Agents Frontend',
  scripts: {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .js,.jsx"
  },
  dependencies: {
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^6.4.6",
    "@mui/material": "6.4.6",
    "@mui/x-date-pickers": "7.27.1",
    "@reduxjs/toolkit": "^2.6.0",
    "axios": "1.8.1",
    "date-fns": "^2.30.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-router-dom": "^7.2.0",
    "recharts": "^2.12.0",
    "socket.io-client": "^4.7.4"
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^8.0.0",
    "prettier": "^2.8.8",
    "vite": "^6.2.0"
  }
};

// Write client package.json
fs.writeFileSync(
  path.join(clientDir, 'package.json'),
  JSON.stringify(clientPackageJson, null, 2)
);

// Create client vite.config.js
console.log('Creating client Vite config...');
const viteConfig = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
`;
fs.writeFileSync(path.join(clientDir, 'vite.config.js'), viteConfig);

// Create server package.json
console.log('Creating server package.json...');
const serverPackageJson = {
  name: 'nexa-agents-server',
  version: packageJson.version || '1.0.0',
  description: 'Nexa Agents Backend Server',
  type: 'commonjs',
  main: 'src/index.js',
  scripts: {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "metrics": "cd src/gateway && cargo run",
    "build:metrics": "cd src/gateway && cargo build --release",
    "lint": "eslint src --ext .js"
  },
  dependencies: {
    "cors": "^2.8.5",
    "dotenv": "^16.4.4",
    "express": "4.18.2",
    "node-fetch": "^2.7.0",
    "socket.io": "^4.7.4",
    "uuid": "^11.1.0",
    "winston": "^3.17.0"
  },
  devDependencies: {
    "eslint": "^8.0.0",
    "nodemon": "^3.0.3",
    "prettier": "^2.8.8"
  }
};

// Write server package.json
fs.writeFileSync(
  path.join(serverDir, 'package.json'),
  JSON.stringify(serverPackageJson, null, 2)
);

// Create .env files for client and server
console.log('Creating environment files...');

// Client .env
fs.writeFileSync(path.join(clientDir, '.env'), `VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
`);

// Server .env
fs.writeFileSync(path.join(serverDir, '.env'), `PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
METRICS_PORT=3005
METRICS_URL=http://localhost:3005
CORS_ORIGIN=*
`);

// Fix server imports (to handle ESM vs CommonJS)
console.log('Fixing server imports...');
fixServerFile(path.join(serverDir, 'src'));

// Create shared README
console.log('Creating shared README...');
fs.writeFileSync(path.join(sharedDir, 'README.md'), `# Shared Code

This directory contains code that is shared between the client and server.

## Usage

### In Client
\`\`\`js
import { API_ROUTES } from '@shared/constants';
import type { Workflow } from '@shared/types';
\`\`\`

### In Server
\`\`\`js
const { API_ROUTES } = require('../../shared/constants');
\`\`\`
`);

// Create README
console.log('Updating README...');
fs.writeFileSync(path.join(baseDir, 'README.md'), `# Nexa Agents

AI Agent Orchestration System with a clean separation between frontend and backend.

## Repository Structure

This project is organized into separate client and server applications:

\`\`\`
nexa-agents/
├── client/         # Frontend React application
├── server/         # Backend Express/Node.js API server
├── shared/         # Shared code between client and server
└── nexa-workspace.code-workspace  # VS Code workspace configuration
\`\`\`

## Development with VS Code

1. Open the VS Code workspace file:
   \`\`\`
   code nexa-workspace.code-workspace
   \`\`\`

2. Install the recommended extensions when prompted

3. Open a terminal in VS Code and install dependencies:
   \`\`\`
   cd client && npm install
   cd ../server && npm install
   \`\`\`

4. Start the development servers:
   - Use the Vite extension to start the client
   - Use the integrated terminal to run \`cd server && npm run dev\` for the backend
   - Use the integrated terminal to run \`cd server && npm run metrics\` for the metrics service

## Manual Development

### Client

\`\`\`bash
cd client
npm install
npm run dev
\`\`\`

The frontend will be available at http://localhost:3000

### Server

\`\`\`bash
cd server
npm install
npm run dev
\`\`\`

The API server will run on http://localhost:3001

### Metrics Service

\`\`\`bash
cd server
npm run metrics
\`\`\`

The metrics service will run on http://localhost:3005
`);

// Create index.js for server
if (!fs.existsSync(path.join(serverDir, 'src', 'index.js'))) {
  console.log('Creating server index.js...');
  fs.writeFileSync(path.join(serverDir, 'src', 'index.js'), `/**
 * Nexa Agents Backend Server
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Import routes (these will need to be created or migrated)
// const agentsRoutes = require('./api/routes/agents');
// const workflowsRoutes = require('./api/routes/workflows');

// Data directories
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

// Ensure data directories exist
[
  DATA_DIR,
  path.join(DATA_DIR, 'logs'),
  path.join(DATA_DIR, 'workflows')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(\`Created directory: \${dir}\`);
  }
});

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Environment variables
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Mount routes
// app.use('/api/agents', agentsRoutes);
// app.use('/api/workflows', workflowsRoutes);

// Temporary API endpoints until routes are properly set up
app.get('/api/metrics/system', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3005/api/metrics/system');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.get('/api/workflows', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Content Creation',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Data Analysis',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ]);
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Example event handling
  socket.on('message', (data) => {
    console.log('Message received:', data);
    io.emit('message', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(\`Backend API server running on http://localhost:\${PORT}\`);
  console.log(\`Socket.IO server running on ws://localhost:\${PORT}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
`);
}

console.log('\nMigration complete! 🎉');
console.log('\nNext steps:');
console.log('1. Open the workspace in VS Code:');
console.log('   code nexa-workspace.code-workspace');
console.log('2. Install dependencies:');
console.log('   cd client && npm install');
console.log('   cd ../server && npm install');
console.log('3. Start the development servers using the VS Code interface');

/**
 * Utility function to copy a directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${srcPath} to ${destPath}`);
    }
  }
}

/**
 * Function to fix server files (convert ESM to CommonJS if needed)
 */
function fixServerFile(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixServerFile(filePath);
    } else if (entry.name.endsWith('.js')) {
      // Read file content
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace ESM imports with CommonJS requires
      content = content.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2")');
      content = content.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, source) => {
        const importNames = imports.split(',').map(name => name.trim());
        return `const { ${importNames.join(', ')} } = require("${source}")`;
      });
      content = content.replace(/export\s+default\s+(\w+)/g, 'module.exports = $1');
      content = content.replace(/export\s+\{\s*([^}]+)\s*\}/g, 'module.exports = { $1 }');
      
      // Write updated content
      fs.writeFileSync(filePath, content);
      console.log(`Fixed imports in ${filePath}`);
    }
  }
}
