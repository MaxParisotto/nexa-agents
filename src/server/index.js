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
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import OpenAIUplinkServer from './uplink/openaiUplink.js';
import MetricsService from './services/metricsService.js';
import { ensureJsonResponses } from './middlewares/apiMiddleware.js';
import { configureRoutes } from './routes/index.js';
import { globalMetricsService } from './services/index.js';
import { debugApiRequests } from './middlewares/debugMiddleware.js';

// Load environment variables
dotenv.config();

// Utility to get __dirname equivalent in ES modules
const getDirname = (url) => {
  const __filename = new URL('', url).pathname;
  return path.dirname(__filename);
};

// Create __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '../config/config.json');
let config = {}; // Initialize config object with defaults

try {
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
    logger.info('Using port from configuration file', config);
  }
} catch (error) {
  logger.error('Error loading config file:', error);
}

// Import routes
import settingsRoutes from './routes/settings.js';
import modelsRoutes from './routes/models.js';
import testRoutes from './routes/test.js';
import { createUplinkRouter } from './routes/uplink.js';
import statusRoutes from './routes/status.js';
import metricsRoutes from './routes/metrics.js';
import workflowsRoutes from './routes/workflows.js';

// Initialize process error handlers right away to catch any startup errors
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  // Log to file if logger is available
  if (typeof logger !== 'undefined' && logger.error) {
    logger.error('Uncaught exception:', error);
  }
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  // Log to file if logger is available
  if (typeof logger !== 'undefined' && logger.error) {
    logger.error('Unhandled rejection:', reason);
  }
});

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

// Add the debug middleware
app.use(debugApiRequests);

// Add the middleware to ensure proper JSON responses
app.use(ensureJsonResponses);

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

// Create data directory for workflows
// Ensure data directory exists for workflows
const DATA_DIR = path.join(getDirname(import.meta.url), '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  loggerWinston.info('Created data directory', { path: DATA_DIR });
}

const WORKFLOWS_DIR = path.join(DATA_DIR, 'workflows');
if (!fs.existsSync(WORKFLOWS_DIR)) {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  loggerWinston.info('Created workflows directory', { path: WORKFLOWS_DIR });
}

// Create HTTP server
const server = http.createServer(app);
const io = new socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize metrics service with socket.io instance
const metricsService = new MetricsService(io);
metricsService.start();

// Initialize uplink router AFTER io has been created
const uplinkRouter = createUplinkRouter(io);

// API Routes - IMPORTANT: Define API routes BEFORE the catch-all route
app.use('/api/metrics', metricsRoutes); // Put metrics first since we're having issues with it
app.use('/api/settings', settingsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/uplink', uplinkRouter); // Now using the properly initialized uplinkRouter
app.use('/api/workflows', workflowsRoutes); // Add workflows routes

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

// JSON error handling middleware
app.use((err, req, res, next) => {
  if (err) {
    console.error('Express error:', err);
    
    // Always return JSON for API routes rather than HTML error pages
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
      });
    }
  }
  next(err);
});

// Configure other API routes
configureRoutes(app, io);

// Socket.io connection handling
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

// Create OpenAI Uplink server with proper error handling
let openaiUplink = null;
try {
  const openaiUplinkPort = config.openaiUplinkPort || process.env.OPENAI_UPLINK_PORT || 3002;
  openaiUplink = new OpenAIUplinkServer({
    port: openaiUplinkPort,
    requireApiKey: config.requireUplinkApiKey !== false,
    apiKey: config.openaiUplinkApiKey || process.env.OPENAI_UPLINK_API_KEY
  });

  // Register custom actions for the uplink
  openaiUplink.registerAction('queryAgent', async (params) => {
    const { query, agentId } = params;
    logger.info(`Received agent query: ${query} for agent ${agentId || 'default'}`);
    
    // Here you would typically forward this to your agent system
    // For now, we'll just return a mock response
    return {
      response: `Processed query: ${query}`,
      timestamp: new Date().toISOString(),
      agentId: agentId || 'default'
    };
  });
} catch (error) {
  console.error('Failed to create OpenAI Uplink server:', error);
  logger.error('Failed to create OpenAI Uplink server', error);
}

// Start OpenAI Uplink server safely
if (openaiUplink) {
  try {
    openaiUplink.start();
    logger.info(`OpenAI Uplink server started on port ${openaiUplink.port}`);
  } catch (err) {
    console.error('Failed to start OpenAI Uplink server:', err);
    logger.error('Failed to start OpenAI Uplink server', err);
    // Don't crash the whole server if uplink fails
  }
}

// Create WebSocket server
const wssPort = config.wssPort || process.env.WSS_PORT || 8081;
const wss = new WebSocketServer({ port: wssPort });
logger.info(`WebSocket Server running on port ${wssPort}`);
console.log(`WebSocket Server running on port ${wssPort}`);

// WebSocket connection handling
wss.on('connection', (ws) => {
  // ... existing WebSocket server code ...
});

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

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  
  // Stop metrics service
  globalMetricsService.stop();
  
  // Safely stop OpenAI uplink if it exists
  if (openaiUplink) {
    try {
      openaiUplink.stop();
    } catch (err) {
      console.error('Error stopping OpenAI Uplink server:', err);
    }
  }
  
  // Stop WebSocket server
  if (wss) {
    try {
      wss.close();
    } catch (err) {
      console.error('Error closing WebSocket server:', err);
    }
  }
  
  // Close main server
  server.close(() => {
    logger.info('Server shutdown complete');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if clean shutdown fails
  setTimeout(() => {
    console.error('Forcing server shutdown after timeout');
    process.exit(1);
  }, 5000);
});

// This ensures API routes that don't exist return JSON errors instead of HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `API endpoint not found: ${req.originalUrl}`
  });
});

// Serve React app for any other routes (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(getDirname(import.meta.url), '../../build', 'index.html'));
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    loggerWinston.info(`Server running on port ${PORT}`);
    loggerWinston.info(`API available at http://localhost:${PORT}/api`);
    globalMetricsService.start();
  });
}

export { io }; // Export socket.io instance
export default app; // Export for testing
