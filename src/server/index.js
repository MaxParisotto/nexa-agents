const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const winston = require('winston');

const app = express();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

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

const PORT = 3001;

io.on('connection', (socket) => {
  logger.info('New client connected');

  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });

  socket.on('register_agent', (agentData) => {
    logger.debug('Agent registered:', agentData);
    io.emit('agent_registered', agentData);
  });

  socket.on('assign_task', (taskData) => {
    logger.info('Task assigned:', taskData);
    io.emit('task_assigned', taskData);
  });

  socket.on('update_task', (taskUpdate) => {
    logger.info('Task updated:', taskUpdate);
    io.emit('task_updated', taskUpdate);
  });

  socket.on('system_metrics', (metrics) => {
    logger.info('System metrics:', metrics);
    io.emit('metrics_updated', metrics);
  });
});

server.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
