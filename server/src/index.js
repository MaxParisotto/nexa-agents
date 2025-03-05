const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const logService = require('./services/logService');
const performanceMonitor = require('./api/middleware/performanceMonitor');

try {
  const app = express();
  const server = http.createServer(app);

  // Add performance monitoring
  app.use(performanceMonitor);

  // Basic middleware
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());

  // Static files first
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));

  // API routes
  app.use('/api', require('./api/routes'));

  // SPA routes
  app.get(['/', '/dashboard'], (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // Enhanced error handling
  app.use((err, req, res, next) => {
    logService.error('Express error', err, {
      path: req.path,
      method: req.method,
      body: req.body
    });
    res.status(500).json({ error: true, message: 'Internal server error' });
  });

  // Socket.IO setup
  const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['polling', 'websocket']
  });

  io.on('connection', socket => {
    logService.info('Socket connected', { 
      socketId: socket.id,
      address: socket.handshake.address
    });

    socket.on('disconnect', () => {
      logService.info('Socket disconnected', { socketId: socket.id });
    });

    socket.on('error', (error) => {
      logService.error('Socket error', error, { socketId: socket.id });
    });
  });

  // Start server
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || '0.0.0.0';

  // Log startup information
  server.listen(PORT, HOST, () => {
    logService.info('Server started', {
      port: PORT,
      host: HOST,
      env: process.env.NODE_ENV,
      nodeVersion: process.version
    });
  });

} catch (error) {
  logService.error('Fatal startup error', error);
  process.exit(1);
}