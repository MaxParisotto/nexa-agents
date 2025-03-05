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

logger.info('Initializing API server...');

// Create Express app and server
const app = express();
const server = http.createServer(app);

// Basic health check - add this before any middleware
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: true, message: 'Internal server error' });
});

// CORS setup
app.use(cors());
app.use(bodyParser.json());

// Socket.IO setup with basic config
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// API routes
app.use('/api', require('./routes'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

logger.info('API server initialized');

module.exports = { app, server, io };
