/**
 * API Server entry point
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('../utils/logger').createLogger('api');
const networkTracker = require('./middleware/networkTracker');

logger.info('Initializing API server...');

// Create Express app and server
const app = express();
const server = http.createServer(app);

// Order matters! Define routes in this specific order:

// 1. First middleware and CORS
app.use(cors({
  origin: "*", // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(networkTracker);

// 2. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 3. Static files - serve from public directory
app.use(express.static(path.join(__dirname, '../public')));

// 4. API routes
app.use('/api', require('./routes'));

// 5. Special handling for dashboard and root
app.get(['/dashboard', '/'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 6. Catch-all route should be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Basic error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: true, message: 'Internal server error' });
});

// Socket.IO setup with service support
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingInterval: 10000,
  pingTimeout: 5000
});

// Socket connection handling with preserved service handlers
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  // ProjectManager handlers
  socket.on('project-manager-request', (data) => {
    logger.info('Project manager request:', data);
    socket.emit('project-manager-message', {
      messageId: data.messageId,
      content: data.message,
      source: data.source || 'project-manager',
      timestamp: new Date().toISOString()
    });
  });

  // ChatWidget handlers
  socket.on('chat-message', (data) => {
    logger.info('Chat message:', data);
    socket.emit('chat-response', {
      messageId: data.messageId,
      content: data.message,
      source: 'chat-widget',
      timestamp: new Date().toISOString()
    });
  });

  // Agora handlers
  socket.on('agent_command', (data) => {
    logger.info('Agent command:', data);
    socket.emit('agent_response', {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });
  });

  // Handle service-specific events
  const serviceEvents = [
    'workflow_update',
    'metrics_update',
    'settings_change',
    'tool_execution',
    'uplink_status'
  ];

  serviceEvents.forEach(eventName => {
    socket.on(eventName, (data) => {
      logger.debug(`${eventName} received:`, data);
      // Broadcast to other clients
      socket.broadcast.emit(`${eventName}_response`, {
        id: data.id,
        timestamp: new Date().toISOString(),
        status: 'received',
        data
      });
    });
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

logger.info('API server initialized');

module.exports = { app, server, io };
