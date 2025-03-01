/**
 * Main server file for Nexa Agents backend
 * Handles API routes, middleware, and server initialization
 */

import express from 'express';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import logger from './utils/logger.js';

// Utility to get __dirname equivalent in ES modules
const getDirname = (url) => {
  const __filename = new URL('', url).pathname;
  return path.dirname(__filename);
};

// Import routes
import settingsRoutes from './routes/settings.js';
import modelsRoutes from './routes/models.js';
import testRoutes from './routes/test.js';
import { createUplinkRouter } from './routes/uplink.js';

// Import the OpenAI Uplink Server
import { openaiUplinkServer } from './uplink/openaiUplinkServer.js';

const app = express();

// In-memory cache for rate limiting logs
const logCache = {
  messages: new Map(),
  resetTimers: new Map()
};

/**
 * Custom Winston format for rate limiting logs
 * Limits identical log messages to prevent spamming
 */
const rateLimitFormat = winston.format((info) => {
  // Create a cache key from level and message
  const cacheKey = `${info.level}:${info.message}`;
  
  // Check if this exact message was logged recently
  const lastLogged = logCache.messages.get(cacheKey);
  const now = Date.now();
  
  if (lastLogged) {
    const timeSinceLastLog = now - lastLogged.timestamp;
    // If this message was logged in the last 5 seconds
    if (timeSinceLastLog < 5000) {
      // Increment the counter
      lastLogged.count++;
      // Only log every 5th occurrence or if it's been at least 1 second
      if (lastLogged.count < 5 && timeSinceLastLog < 1000) {
        return false; // Skip this log
      }
      
      // Update the info message to include count if multiple occurrences
      if (lastLogged.count > 1) {
        info.message = `${info.message} (${lastLogged.count} similar messages)`;
      }
    }
    
    // Update the timestamp
    lastLogged.timestamp = now;
  } else {
    // First occurrence of this message
    logCache.messages.set(cacheKey, {
      timestamp: now,
      count: 1
    });
    
    // Set up an automatic cleanup for this message after 30 seconds
    if (!logCache.resetTimers.has(cacheKey)) {
      const timerId = setTimeout(() => {
        logCache.messages.delete(cacheKey);
        logCache.resetTimers.delete(cacheKey);
      }, 30000);
      logCache.resetTimers.set(cacheKey, timerId);
    }
  }
  
  return info;
});

// Configure Winston logger with rate limiting
const loggerWinston = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    rateLimitFormat(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(getDirname(import.meta.url), '../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(getDirname(import.meta.url), '../../logs/combined.log') 
    })
  ]
});

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(getDirname(import.meta.url), '../../logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  loggerWinston.info('Created logs directory', { path: LOGS_DIR });
}

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from React app
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(express.static(path.join(getDirname(import.meta.url), '../../build')));

// Request logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Request logging middleware with rate limiting for identical requests
const requestLogCache = new Map();
app.use((req, res, next) => {
  const requestKey = `${req.method}:${req.path}`;
  const now = Date.now();
  const lastLogged = requestLogCache.get(requestKey);
  
  // Only log requests if it's been at least 5 seconds since the last identical request
  if (!lastLogged || (now - lastLogged > 5000)) {
    loggerWinston.debug(`Received ${req.method} request`, { 
      path: req.path, 
      query: req.query,
      ip: req.ip
    });
    requestLogCache.set(requestKey, now);
  }
  
  next();
});

// Configuration file paths
const CONFIG_DIR = path.join(getDirname(import.meta.url), '../../config');
const JSON_CONFIG_PATH = path.join(CONFIG_DIR, 'nexa-config.json');
const YAML_CONFIG_PATH = path.join(CONFIG_DIR, 'nexa-config.yaml');

// Create config directory if it doesn't exist
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  loggerWinston.info('Created config directory', { path: CONFIG_DIR });
}

// API Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/test', testRoutes);

// API endpoint to save configuration
app.post('/api/config/save', (req, res) => {
  try {
    const { format, content } = req.body;
    
    if (!format || !content) {
      loggerWinston.warn('Missing required parameters for saving config', { format, hasContent: !!content });
      return res.status(400).json({ error: 'Format and content are required' });
    }
    
    const filePath = format === 'json' ? JSON_CONFIG_PATH : YAML_CONFIG_PATH;
    
    // Ensure the config directory exists (double-check)
    if (!fs.existsSync(CONFIG_DIR)) {
      loggerWinston.info('Recreating config directory', { path: CONFIG_DIR });
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    // Validate JSON content if it's JSON format
    if (format === 'json') {
      try {
        JSON.parse(content);
      } catch (e) {
        loggerWinston.error('Invalid JSON content', { error: e.message });
        return res.status(400).json({ error: 'Invalid JSON content' });
      }
    }
    
    loggerWinston.debug('Writing configuration file', { 
      format, 
      path: filePath,
      contentLength: content.length
    });
    
    // Write file using synchronous API with proper error handling
    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (writeError) {
      loggerWinston.error('Failed to write configuration file', { 
        error: writeError.message, 
        code: writeError.code,
        path: filePath
      });
      
      if (writeError.code === 'EACCES') {
        return res.status(403).json({ error: 'Permission denied when writing file' });
      } else {
        return res.status(500).json({ error: `Failed to write file: ${writeError.message}` });
      }
    }
    
    // Verify file was written successfully
    if (!fs.existsSync(filePath)) {
      loggerWinston.error('File not found after write operation', { path: filePath });
      return res.status(500).json({ error: 'File could not be verified after write' });
    }
    
    loggerWinston.info('Configuration saved successfully', { format, path: filePath });
    return res.status(200).json({ 
      success: true, 
      message: `Configuration saved as ${format.toUpperCase()}`,
      path: filePath 
    });
  } catch (error) {
    loggerWinston.error('Error saving configuration', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// API endpoint to load configuration
app.get('/api/config/load', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const filePath = format === 'json' ? JSON_CONFIG_PATH : YAML_CONFIG_PATH;
    
    loggerWinston.debug('Attempting to load configuration', { format, path: filePath });
    
    if (!fs.existsSync(filePath)) {
      loggerWinston.warn('Configuration file not found', { path: filePath });
      return res.status(404).json({ error: `Configuration file not found: ${filePath}` });
    }
    
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (readError) {
      loggerWinston.error('Failed to read configuration file', { 
        error: readError.message, 
        code: readError.code,
        path: filePath
      });
      
      if (readError.code === 'EACCES') {
        return res.status(403).json({ error: 'Permission denied when reading file' });
      } else {
        return res.status(500).json({ error: `Failed to read file: ${readError.message}` });
      }
    }
    
    // Validate JSON content if it's JSON format
    if (format === 'json') {
      try {
        JSON.parse(content);
      } catch (e) {
        loggerWinston.error('Invalid JSON content in config file', { error: e.message, path: filePath });
        return res.status(400).json({ error: 'File contains invalid JSON' });
      }
    }
    
    loggerWinston.info('Configuration loaded successfully', { 
      format, 
      path: filePath,
      contentLength: content.length
    });
    
    return res.status(200).json({ 
      success: true, 
      content,
      lastModified: fs.statSync(filePath).mtime
    });
  } catch (error) {
    loggerWinston.error('Error loading configuration', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Failed to load configuration' });
  }
});

const server = http.createServer(app);
const io = new socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize uplink router with io instance
const uplinkRouter = createUplinkRouter(io);
app.use('/api/uplink', uplinkRouter);

// Try to load port from config file
let PORT = process.env.PORT || 3001;
try {
  if (fs.existsSync(JSON_CONFIG_PATH)) {
    const configContent = fs.readFileSync(JSON_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);
    if (config.port) {
      PORT = parseInt(config.port, 10);
      loggerWinston.info('Using port from configuration file', { port: PORT });
    }
  }
} catch (error) {
  loggerWinston.warn('Error loading port from config file', { error: error.message });
  loggerWinston.info('Using default port', { port: PORT });
}

// Periodic cleanup of log cache
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  // Clean up expired log cache entries (older than 5 minutes)
  for (const [key, value] of logCache.messages.entries()) {
    if (now - value.timestamp > 300000) {
      logCache.messages.delete(key);
      
      // Clear any timers
      if (logCache.resetTimers.has(key)) {
        clearTimeout(logCache.resetTimers.get(key));
        logCache.resetTimers.delete(key);
      }
      
      expiredCount++;
    }
  }
  
  // Clean up request log cache entries (older than 10 minutes)
  for (const [key, timestamp] of requestLogCache.entries()) {
    if (now - timestamp > 600000) {
      requestLogCache.delete(key);
      expiredCount++;
    }
  }
  
  if (expiredCount > 0) {
    loggerWinston.debug(`Cleaned up ${expiredCount} expired log cache entries`);
  }
}, 60000); // Run every minute

io.on('connection', (socket) => {
  loggerWinston.info('New client connected', { id: socket.id });

  socket.on('disconnect', () => {
    loggerWinston.info('Client disconnected', { id: socket.id });
  });

  socket.on('register_agent', (agentData) => {
    loggerWinston.debug('Agent registered', { agent: agentData });
    io.emit('agent_registered', agentData);
  });

  socket.on('assign_task', (taskData) => {
    loggerWinston.info('Task assigned', { task: taskData });
    io.emit('task_assigned', taskData);
  });

  socket.on('update_task', (taskUpdate) => {
    loggerWinston.info('Task updated', { update: taskUpdate });
    io.emit('task_updated', taskUpdate);
  });

  socket.on('system_metrics', (metrics) => {
    // Rate limit metrics logging (these can be very frequent)
    const now = Date.now();
    const lastMetricsLog = requestLogCache.get('system_metrics');
    
    if (!lastMetricsLog || (now - lastMetricsLog > 10000)) { // Only log every 10 seconds
      loggerWinston.debug('System metrics received', { metrics });
      requestLogCache.set('system_metrics', now);
    }
    
    io.emit('metrics_updated', metrics);
  });
});

// After starting the WebSocket server, also start the OpenAI Uplink
try {
  openaiUplinkServer.start();
  logger.info(`OpenAI Uplink server started on port ${openaiUplinkServer.port}`);
} catch (err) {
  logger.error('Failed to start OpenAI Uplink server', err);
}

// Error handling middleware
app.use((err, req, res, next) => {
  loggerWinston.error('Server error:', err);
  res.status(500).json({
    error: {
      message: err.message || 'An unexpected error occurred',
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  });
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(getDirname(import.meta.url), '../../build', 'index.html'));
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    loggerWinston.info(`Server running on port ${PORT}`);
    loggerWinston.info(`API available at http://localhost:${PORT}/api`);
  });
}

export { io }; // Export socket.io instance
export default app; // Export for testing
