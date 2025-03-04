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

// Import settings service
const settingsService = require('../services/settingsService');
const llmService = require('../services/llmService');

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

// Error handling middleware with safe error serialization
app.use((err, req, res, next) => {
  const errorDetails = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
    path: req.path,
    method: req.method
  };

  httpLogger.error('API Error:', JSON.stringify(errorDetails, getCircularReplacer()));
  
  res.status(errorDetails.status).json({
    error: errorDetails
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

/**
 * Process a message from the Project Manager chat
 * @param {string} message - The message to process
 * @returns {Promise<string>} - The response message
 */
async function processProjectManagerMessage(message) {
  try {
    socketLogger.info('Processing Project Manager message:', message);
    
    // Get current settings
    const settings = settingsService.getSettings();
    
    // Check if Project Manager is enabled
    if (!settings?.features?.projectManagerAgent) {
      throw new Error('Project Manager feature is not enabled. Please enable it in settings.');
    }

    // Get Project Manager configuration
    const projectManager = settings.agents.items.find(agent => agent.isProjectManager);
    if (!projectManager) {
      throw new Error('Project Manager is not configured. Please check your settings.');
    }

    // Get the system prompt with tools information
    const systemPrompt = `You are a Project Manager AI assistant with comprehensive capabilities in the Nexa Agents environment.

AVAILABLE AI ASSISTANT TOOLS:
1. codebase_search: Find relevant code snippets using semantic search
2. read_file: Read contents of files with line-specific precision
3. run_terminal_cmd: Execute terminal commands (requires user approval)
4. list_dir: List directory contents for workspace exploration
5. grep_search: Perform text-based regex searches in files
6. edit_file: Make changes to existing files
7. file_search: Fuzzy search for files by name
8. delete_file: Remove files from the workspace
9. reapply: Retry failed edits with a smarter model
10. web_search: Search the web for real-time information
11. diff_history: View recent file changes

NATIVE CAPABILITIES:
1. Tool Management:
   - Create and configure custom tools with:
     * Names and descriptions
     * Categories and parameters
     * Enable/disable states
     * Custom configurations
   - Manage tool categories and organization
   - Monitor tool usage and performance

2. Project Management:
   - Create and organize projects
   - Set up development environments
   - Manage project dependencies
   - Track project status and progress
   - Generate project documentation

3. Environment Management:
   - Configure LLM providers:
     * LM Studio integration
     * Ollama integration
     * Model selection and configuration
   - Manage API endpoints and connections
   - Handle system settings
   - Monitor system health and logs

4. Development Support:
   - Code organization and structure
   - Dependency management
   - Debugging assistance
   - Performance optimization
   - API integration
   - Security implementation

INTEGRATED FEATURES:
- Parallel editing and code optimization
- Strong logging and monitoring systems
- Multi-step task execution
- Error handling and recovery
- Real-time status updates
- Documentation generation
- Security best practices
- Testing and validation

INTERACTION GUIDELINES:
- Be professional but conversational
- Provide clear explanations for actions
- Ask clarifying questions when needed
- Suggest improvements proactively
- Reference specific files and code regions
- Use available tools effectively
- Guide users through complex setups
- Help troubleshoot issues
- Maintain clear documentation

Your goal is to help users manage their development environment effectively by:
1. Using AI assistant tools for direct code and system interaction
2. Leveraging native capabilities for tool and project management
3. Maintaining high code quality and best practices
4. Ensuring clear documentation and communication
5. Providing proactive support and improvements

Current tools available in the system:
${JSON.stringify(settings.tools?.items || [], null, 2)}`;

    // Process message with LLM
    const response = await llmService.processMessage(
      typeof message === 'string' ? message : JSON.stringify(message),
      systemPrompt,
      {
        temperature: projectManager.temperature || 0.7,
        maxTokens: projectManager.maxTokens || 4096,
        model: projectManager.model,
        providerId: projectManager.providerId
      }
    );

    return response;
  } catch (error) {
    socketLogger.error('Error processing Project Manager message:', error);
    throw error;
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  const socketId = socket.id;
  socketLogger.info(`Client connected [id=${socketId}] from ${socket.handshake.address}`);

  // Handle project manager requests
  socket.on('project-manager-request', async (data) => {
    try {
      // Parse the message from the data
      let message;
      if (typeof data === 'string') {
        message = data;
      } else if (typeof data === 'object') {
        // If data is an array-like object, join it
        if (Array.from(Object.keys(data)).every(key => !isNaN(parseInt(key)))) {
          message = Object.values(data).join('');
        } else {
          // If data is a regular object, extract message or stringify
          message = data.message || JSON.stringify(data);
        }
      } else {
        throw new Error('Invalid message format');
      }

      // Ensure message is a string
      if (typeof message !== 'string') {
        throw new Error('Message must be a string');
      }

      socketLogger.info(`Project manager request received [id=${socketId}]: ${message}`);

      // Process the message and send response
      const response = await processProjectManagerMessage(message);
      
      socket.emit('project-manager-message', {
        message: response,
        timestamp: new Date().toISOString()
      });
      
      socketLogger.info(`Response sent [id=${socketId}]`);
    } catch (error) {
      socketLogger.error(`Error handling project manager request [id=${socketId}]:`, 
        error.message || 'Unknown error'
      );
      
      socket.emit('project-manager-message', {
        message: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: true
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    socketLogger.info(`Client disconnected [id=${socketId}] reason: ${reason}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    socketLogger.error(`Socket error [id=${socketId}]:`, 
      error.message || 'Unknown error'
    );
  });
});

// Helper function to handle circular references in JSON.stringify
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

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
