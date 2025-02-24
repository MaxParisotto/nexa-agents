const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle agent registration
  socket.on('register_agent', (agentData) => {
    console.log('Agent registered:', agentData);
    io.emit('agent_registered', agentData);
  });

  // Handle task assignments
  socket.on('assign_task', (taskData) => {
    console.log('Task assigned:', taskData);
    io.emit('task_assigned', taskData);
  });

  // Handle task updates
  socket.on('update_task', (taskUpdate) => {
    console.log('Task updated:', taskUpdate);
    io.emit('task_updated', taskUpdate);
  });

  // Handle system metrics
  socket.on('system_metrics', (metrics) => {
    io.emit('metrics_updated', metrics);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
