const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const logger = require('./utils/logger').createLogger('main');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mount API routes
const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error'
  });
});

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);
  socket.on('disconnect', () => logger.info('Client disconnected:', socket.id));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('WebSocket server enabled');
});

// Keep process alive
const keepAlive = setInterval(() => {
  logger.debug('Heartbeat');
}, 30000);

// Single error handler for uncaught errors
const handleUncaughtError = (error) => {
  logger.error('Uncaught error:', error);
  gracefulShutdown();
};

// Single shutdown handler
const gracefulShutdown = () => {
  clearInterval(keepAlive);
  server.close(() => {
    logger.info('Server shutdown complete');
    process.exit(0);
  });
  
  // Force shutdown after 5s
  setTimeout(() => {
    logger.error('Force shutdown');
    process.exit(1);
  }, 5000);
};

// Process handlers - single instance each
process.once('SIGTERM', gracefulShutdown);
process.once('SIGINT', gracefulShutdown);
process.once('uncaughtException', handleUncaughtError);
process.once('unhandledRejection', handleUncaughtError);

// Prevent immediate exit
process.stdin.resume();

module.exports = { server, app, io };