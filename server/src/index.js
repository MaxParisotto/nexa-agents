const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger').createLogger('main');

try {
  const app = express();
  const server = http.createServer(app);

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

  // Socket.IO setup
  const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['polling', 'websocket']
  });

  io.on('connection', socket => {
    logger.info(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => logger.info(`Client disconnected: ${socket.id}`));
  });

  // Start server
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || '0.0.0.0';

  server.listen(PORT, HOST, () => {
    logger.info(`Server running at http://${HOST}:${PORT}`);
  });

} catch (error) {
  logger.error('Server initialization error:', error);
  process.exit(1);
}