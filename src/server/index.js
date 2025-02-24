const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 5000;

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  socket.on('register_agent', (agentData) => {
    console.log('Agent registered:', agentData);
    io.emit('agent_registered', agentData);
  });

  socket.on('assign_task', (taskData) => {
    console.log('Task assigned:', taskData);
    io.emit('task_assigned', taskData);
  });

  socket.on('update_task', (taskUpdate) => {
    console.log('Task updated:', taskUpdate);
    io.emit('task_updated', taskUpdate);
  });

  socket.on('system_metrics', (metrics) => {
    console.log('System metrics:', metrics);
    io.emit('metrics_updated', metrics);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
