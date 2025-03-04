/**
 * Nexa Agents API Server - Clean separation of frontend and backend
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

// Import route modules
const agentsRoutes = require('./routes/agents');
const workflowsRoutes = require('./routes/workflows');
const metricsRoutes = require('./routes/metrics');
const settingsRoutes = require('./routes/settings');
const toolsRoutes = require('./routes/tools');

// Import logger
const logger = require('../utils/logger');
const socketLogger = logger.createLogger('socket.io');
const httpLogger = logger.createLogger('http');

// Environment variables
const PORT = process.env.API_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Data directories
const DATA_DIR = path.join(__dirname, '../../../data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

// Ensure data directories exist
[DATA_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? ['https://your-production-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('combined', { stream: httpLogger.stream }));

// API Routes prefix
const API_PREFIX = '/api';

// Mount API routes
app.use(`${API_PREFIX}/agents`, agentsRoutes);
app.use(`${API_PREFIX}/workflows`, workflowsRoutes);
app.use(`${API_PREFIX}/metrics`, metricsRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/tools`, toolsRoutes);

// Health check endpoint
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  httpLogger.error('API Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Initialize Socket.IO with CORS and other options
const io = new Server(server, {
  cors: corsOptions,
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  connectTimeout: 45000,
  path: '/socket.io',
  cookie: false
});

// Socket.IO error handling middleware
io.engine.on('connection_error', (err) => {
  socketLogger.error('Socket.IO connection error:', err);
});

// Socket.IO middleware for logging and connection handling
io.use((socket, next) => {
  socketLogger.info(`Socket connection attempt from ${socket.handshake.address}`);
  
  // Add custom properties to socket
  socket.customId = `${socket.id}-${Date.now()}`;
  socket.connectionTime = new Date();
  
  // Add disconnect listener early
  socket.on('disconnect', (reason) => {
    socketLogger.info(`Client disconnected [id=${socket.customId}]: ${reason}`);
    // Cleanup any resources if needed
  });
  
  next();
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  socketLogger.info(`Client connected [id=${socket.customId}] from ${socket.handshake.address}`);
  
  // Send initial connection status
  socket.emit('connection_status', { 
    status: 'connected',
    socketId: socket.customId,
    timestamp: new Date().toISOString(),
    serverTime: socket.connectionTime
  });
  
  socket.on('error', (error) => {
    socketLogger.error(`Socket error [id=${socket.customId}]:`, error);
  });
  
  // Agent status updates
  socket.on('agent_status', (data) => {
    socketLogger.info(`Agent status update [id=${socket.customId}]:`, data);
    
    try {
      const agentsService = require('../services/agentsService');
      const updatedAgent = agentsService.updateAgentStatus(data.id, data.status);
      
      // Broadcast to all clients
      io.emit('agent_status', updatedAgent);
    } catch (error) {
      socketLogger.error(`Error handling agent status update [id=${socket.customId}]:`, error);
      socket.emit('error', {
        message: 'Failed to update agent status',
        error: error.message
      });
    }
  });
  
  // Workflow updates
  socket.on('workflow_update', (data) => {
    socketLogger.info(`Workflow update [id=${socket.customId}]:`, data);
    io.emit('workflow_update', data);
  });
  
  // Chat message handler
  socket.on('send_message', async (data) => {
    socketLogger.info(`Chat message received [id=${socket.customId}]:`, data);
    
    try {
      const settingsService = require('../services/settingsService');
      const settings = settingsService.getSettings();
      
      if (!settings.features?.projectManagerAgent) {
        throw new Error('Project Manager feature is not enabled');
      }
      
      const projectManager = settings.projectManager;
      if (!projectManager) {
        throw new Error('Project Manager is not configured');
      }
      
      socket.emit('new_message', {
        author: 'Project Manager',
        content: '...',
        avatar: '/static/images/avatar/system.png',
        timestamp: new Date().toISOString(),
        isThinking: true
      });
      
      const response = await generateLlmResponse(projectManager, data.content);
      
      const responseMessage = {
        author: 'Project Manager',
        content: response,
        avatar: '/static/images/avatar/system.png',
        timestamp: new Date().toISOString()
      };
      
      socket.emit('new_message', responseMessage);
      socketLogger.info(`Response sent [id=${socket.customId}]:`, responseMessage);
    } catch (error) {
      socketLogger.error(`Error handling chat message [id=${socket.customId}]:`, error);
      
      socket.emit('new_message', {
        author: 'System',
        content: `Error: ${error.message}. Please check your Project Manager configuration in settings.`,
        avatar: '/static/images/avatar/system.png',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Error handling for the HTTP server
server.on('error', (error) => {
  logger.error('HTTP server error:', error);
});

// Start server with error handling
const startServer = async () => {
  try {
    await new Promise((resolve, reject) => {
      server.listen(PORT, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    logger.info(`Backend API server running on http://localhost:${PORT}`);
    logger.info(`Socket.IO server running on ws://localhost:${PORT}`);
    logger.info('Server configuration:', {
      environment: NODE_ENV,
      cors: corsOptions,
      socketIO: {
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };
