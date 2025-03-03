/**
 * Nexa Agents API Server - Clean separation of frontend and backend
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Import route modules
const agentsRoutes = require('./routes/agents');
const workflowsRoutes = require('./routes/workflows');
const metricsRoutes = require('./routes/metrics');
const settingsRoutes = require('./routes/settings');

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
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Environment variables
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount route modules
app.use('/api/agents', agentsRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Agent status updates
  socket.on('agent_status', (data) => {
    console.log('Agent status update:', data);
    
    try {
      const agentsService = require('../services/agentsService');
      const updatedAgent = agentsService.updateAgentStatus(data.id, data.status);
      
      // Broadcast to all clients
      io.emit('agent_status', updatedAgent);
    } catch (error) {
      console.error('Error handling agent status update:', error);
      socket.emit('error', {
        message: 'Failed to update agent status',
        error: error.message
      });
    }
  });
  
  // Workflow updates
  socket.on('workflow_update', (data) => {
    console.log('Workflow update:', data);
    io.emit('workflow_update', data);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server running on ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
