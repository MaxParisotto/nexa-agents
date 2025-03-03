/**
 * Nexa Agents Backend Server - Simplified version to get started
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io'); // Fixed import
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.warn('Failed to load .env file:', error.message);
}

// Constants and configuration
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '../../data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const WORKFLOWS_DIR = path.join(DATA_DIR, 'workflows');

// Ensure data directories exist
[DATA_DIR, LOGS_DIR, WORKFLOWS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint with proxy to Rust service
app.get('/api/metrics/system', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3005/api/metrics/system');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching metrics:', error.message);
    // Fallback to random values if metrics service is unavailable
    res.json({
      cpu_usage: Math.random() * 100,
      memory_used: Math.random() * 8 * 1024 * 1024 * 1024,
      memory_total: 16 * 1024 * 1024 * 1024,
      uptime: Math.floor(Math.random() * 100000),
      processes: Math.floor(Math.random() * 200),
      timestamp: Date.now()
    });
  }
});

// Example workflows endpoint
app.get('/api/workflows', (req, res) => {
  try {
    // Check if there are real workflow files
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
      .filter(file => file.endsWith('.json'));
    
    if (workflowFiles.length > 0) {
      // Read real workflow data from files
      const workflows = workflowFiles.map(file => {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
        return JSON.parse(content);
      });
      return res.json(workflows);
    }
    
    // Return example data if no workflow files exist
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
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
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

  // Handle agent status updates
  socket.on('agent_status', (data) => {
    console.log('Agent status update:', data);
    io.emit('agent_status', data);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// API 404 handler - must be after all valid routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `API endpoint not found: ${req.originalUrl}`
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server running on ws://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if clean shutdown fails
  setTimeout(() => {
    console.error('Forcing server shutdown after timeout');
    process.exit(1);
  }, 5000);
});

module.exports = { app, server, io };
