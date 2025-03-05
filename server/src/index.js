const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const logger = require('./utils/logger').createLogger('main');

// Initialize express app and server
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.IO with permissive CORS
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['polling', 'websocket']
});

// Socket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`HTTP server running on http://${HOST}:${PORT}`);
  logger.info('WebSocket server enabled');
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };