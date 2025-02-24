const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://192.168.1.150:3000',
    'https://b33x50n3-3000.uks1.devtunnels.ms'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://192.168.1.150:3000',
      'https://b33x50n3-3000.uks1.devtunnels.ms'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true
});

// Express middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
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
