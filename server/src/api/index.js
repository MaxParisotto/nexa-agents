/**
 * Nexa Agents API Server - Clean separation of frontend and backend
 */
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const morgan = require('morgan');
const fetch = require('node-fetch');

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

// Constants for storage
const STORAGE_PATH = path.join(__dirname, '../../data');
const MESSAGE_FILE = path.join(STORAGE_PATH, 'messages.json');
const CHANNEL_FILE = path.join(STORAGE_PATH, 'channels.json');

// Ensure data directories exist
[DATA_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.access(dir)) {
    fs.mkdir(dir, { recursive: true });
  }
});

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? ['https://your-production-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
app.use(`${API_PREFIX}/users`, require('./routes/users'));
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

// Initialize storage
async function initializeStorage() {
  try {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
    
    // Initialize messages file if it doesn't exist
    try {
      await fs.access(MESSAGE_FILE);
    } catch {
      await fs.writeFile(MESSAGE_FILE, JSON.stringify([]));
    }
    
    // Initialize channels file if it doesn't exist
    try {
      await fs.access(CHANNEL_FILE);
    } catch {
      await fs.writeFile(CHANNEL_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Message storage functions
async function loadMessages() {
  try {
    const data = await fs.readFile(MESSAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

async function saveMessage(message) {
  try {
    const messages = await loadMessages();
    messages.push(message);
    await fs.writeFile(MESSAGE_FILE, JSON.stringify(messages));
    return true;
  } catch (error) {
    console.error('Error saving message:', error);
    return false;
  }
}

// Initialize Socket.IO with CORS and other options
const io = new Server(server, {
  cors: {
    origin: corsOptions.origin,
    methods: corsOptions.methods,
    credentials: true
  },
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

// Store connected users
const connectedUsers = new Map();

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

    // Add tool management command handling
    const toolCommandPatterns = {
      create: /(create|make|add)\s+a?\s*tool/i,
      delete: /(delete|remove)\s+a?\s*tool/i,
      update: /(update|modify|change)\s+a?\s*tool/i,
      list: /(list|show|what)\s+tools/i
    };

    // Check for tool management commands
    const lowerMessage = message.toLowerCase();
    let toolCommand = null;

    // Detect command type
    for (const [cmd, pattern] of Object.entries(toolCommandPatterns)) {
      if (pattern.test(lowerMessage)) {
        toolCommand = cmd;
        break;
      }
    }

    // Handle tool management commands
    if (toolCommand) {
      // Extract tool name with more flexible patterns
      const toolName = message.match(/(?:named|called)\s+"([^"]+)"/i)?.[1] || 
                      message.match(/(?:named|called)\s+'([^']+)'/i)?.[1] ||
                      message.match(/(?:named|called)\s+(\w[\w\s]+)/i)?.[1] ||
                      message.match(/delete\s+(?:the\s+)?tool\s+"([^"]+)"/i)?.[1] ||
                      message.match(/delete\s+(?:the\s+)?tool\s+'([^']+)'/i)?.[1] ||
                      message.match(/delete\s+(?:the\s+)?tool\s+(\w[\w\s]+)(?:\s|$)/i)?.[1];

      const toolId = toolName ? `tool-${toolName.toLowerCase().replace(/\s+/g, '-')}` : null;

      switch (toolCommand) {
        case 'create':
          try {
            // Extract tool configuration from message
            const toolConfig = {
              name: message.match(/Name:\s*([^\n]+)/)?.[1] || 
                    message.match(/call\s+it\s+([^,]+)/i)?.[1] ||
                    message.match(/create\s+(?:a\s+)?tool\s+(?:called|named)\s+["']?([^"',]+)/i)?.[1],
              description: message.match(/Description:\s*([^\n]+)/)?.[1] || 
                         "Counts words and characters in a given text.",
              category: message.match(/category\s*[:"]\s*["']?([^"'\n]+)["']?/i)?.[1] || 
                       message.match(/Category:\s*([^\n]+)/)?.[1] || 
                       "Utility",
              enabled: true,
              parameters: []
            };

            // Set default parameters if none specified
            if (!message.includes('Parameters:')) {
              toolConfig.parameters = [{
                name: "text",
                type: "string",
                required: true,
                description: "The text to analyze."
              }];
            } else {
              // Extract parameters as before
              const paramSection = message.match(/Parameters:([\s\S]*?)(?=\n\s*\n|$)/)?.[1] || '';
              const paramLines = paramSection.split('\n').filter(line => line.trim().startsWith('-'));
              
              paramLines.forEach(line => {
                const paramName = line.match(/[-\s]*(\w+):/)?.[1];
                const paramDesc = line.match(/:\s*([^.]+)/)?.[1];
                if (paramName && paramDesc) {
                  const param = {
                    name: paramName,
                    type: paramName.includes('count_') ? 'boolean' : 'string',
                    required: line.toLowerCase().includes('required'),
                    description: paramDesc.trim(),
                    default: paramName.includes('count_') ? false : undefined
                  };
                  toolConfig.parameters.push(param);
                }
              });
            }

            // Validate required fields
            if (!toolConfig.name || !toolConfig.description || !toolConfig.category) {
              return "Please provide all required tool information: Name, Description, and Category";
            }

            // Create the tool using run_terminal_cmd format
            const jsonConfig = JSON.stringify(toolConfig).replace(/"/g, '\\"');
            const command = `curl -X POST http://localhost:3001/api/tools -H "Content-Type: application/json" -d "${jsonConfig}"`;
            
            const response = await fetch('http://localhost:3001/api/tools', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(toolConfig)
            });

            if (response.ok) {
              return `Successfully created tool "${toolConfig.name}" with the following configuration:\n${JSON.stringify(toolConfig, null, 2)}`;
            } else {
              const error = await response.text();
              return `Failed to create tool: ${error}`;
            }
          } catch (error) {
            return `Error creating tool: ${error.message}`;
          }

        case 'delete':
          if (!toolId) {
            return "Please specify the tool name to delete. For example: 'delete tool named \"Tool Name\"' or 'delete tool Tool Name'";
          }
          try {
            // First verify the tool exists
            const listResponse = await fetch('http://localhost:3001/api/tools');
            const tools = await listResponse.json();
            const toolExists = tools.some(t => t.id === toolId || t.name.toLowerCase() === toolName.toLowerCase());
            
            if (!toolExists) {
              return `Tool "${toolName}" not found. Available tools:\n${tools.map(t => `- ${t.name}`).join('\n')}`;
            }

            // Proceed with deletion
            const response = await fetch(`http://localhost:3001/api/tools/${toolId}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              return `Successfully deleted tool "${toolName}"`;
            } else {
              const error = await response.text();
              return `Failed to delete tool "${toolName}": ${error}`;
            }
          } catch (error) {
            return `Error deleting tool: ${error.message}`;
          }

        case 'list':
          try {
            const response = await fetch('http://localhost:3001/api/tools');
            const tools = await response.json();
            return `Current tools:\n${tools.map(t => `- ${t.name} (${t.category}): ${t.description}`).join('\n')}`;
          } catch (error) {
            return `Error listing tools: ${error.message}`;
          }

        // Add other command handlers here...
      }
    }

    // Get the system prompt with tools information
    const systemPrompt = `You are a Project Manager AI assistant with comprehensive capabilities in the Nexa Agents environment.

IMPORTANT: When handling tool management requests, you should:
1. IMMEDIATELY execute the appropriate command using run_terminal_cmd
2. DO NOT explain what you're going to do first
3. DO NOT ask for confirmation unless the request is ambiguous
4. After executing the command, briefly explain what was done
5. If there's an error, explain what went wrong and how to fix it

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

TOOL MANAGEMENT COMMANDS:
1. Create Tool:
   run_terminal_cmd('curl -X POST http://localhost:3001/api/tools -H "Content-Type: application/json" -d \'{tool_config}\'')

2. Delete Tool:
   run_terminal_cmd('curl -X DELETE http://localhost:3001/api/tools/{tool_id}')

3. Update Tool:
   run_terminal_cmd('curl -X PUT http://localhost:3001/api/tools/{tool_id} -H "Content-Type: application/json" -d \'{updated_config}\'')

4. List Tools:
   run_terminal_cmd('curl http://localhost:3001/api/tools')

COMMAND PATTERNS TO RECOGNIZE:
- Create: "create a tool", "make a new tool", "add a tool"
- Delete: "delete tool", "remove tool", "delete the tool"
- Update: "update tool", "modify tool", "change tool"
- List: "list tools", "show tools", "what tools"

RESPONSE GUIDELINES:
1. For tool creation:
   - Extract name, description, category, parameters from request
   - Execute create command
   - Confirm creation with "Created tool {name}"

2. For tool deletion:
   - Extract tool ID from request
   - Execute delete command
   - Confirm deletion with "Deleted tool {id}"

3. For tool updates:
   - Extract tool ID and changes from request
   - Execute update command
   - Confirm update with "Updated tool {id}"

4. For tool listing:
   - Execute list command
   - Format response as a clean list of tools

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
io.on('connection', async (socket) => {
  const socketId = socket.id;
  socketLogger.info(`Client connected [id=${socketId}] from ${socket.handshake.address}`);

  // Store user information
  let userInfo = null;

  // Handle user identification
  socket.on('identify', (data) => {
    userInfo = {
      id: data.userId,
      name: data.userName,
      type: data.userType,
      socketId
    };
    // Add user to connected users map
    connectedUsers.set(socketId, userInfo);
    socketLogger.info(`User identified [id=${socketId}]:`, userInfo);
  });

  // Handle message synchronization
  socket.on('sync_messages', async ({ lastMessageId }) => {
    try {
      const messages = await loadMessages();
      let newMessages = messages;
      
      if (lastMessageId) {
        const lastIndex = messages.findIndex(msg => msg.id === lastMessageId);
        if (lastIndex !== -1) {
          newMessages = messages.slice(lastIndex + 1);
        }
      }
      
      socket.emit('sync_messages', { messages: newMessages });
    } catch (error) {
      socketLogger.error('Error syncing messages:', error);
    }
  });

  // Handle new messages with persistence
  socket.on('new_message', async (data) => {
    console.log('New message received:', data);
    
    const message = {
      ...data,
      id: data.messageId || `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Save message to storage
    const saved = await saveMessage(message);
    if (saved) {
      // Broadcast to all clients except sender
      socket.broadcast.emit('new_message', message);
    }

    // Process mentions
    if (data.mentions && data.mentions.length > 0) {
      data.mentions.forEach(mention => {
        // ... existing mention handling ...
      });
    }
  });
  
  // Handle Project Manager requests with persistence
  socket.on('project-manager-request', async (data) => {
    try {
      console.log('Project Manager request received:', data);
      
      const message = {
        ...data,
        id: data.messageId || `pm-${Date.now()}`,
        timestamp: new Date().toISOString(),
        channel: data.channel || 'chat-widget'
      };

      // Save the user's message
      await saveMessage(message);

      // Process the request with Project Manager
      const pmResponse = await processProjectManagerMessage(data.message);

      // Create response message object
      const response = {
        messageId: `pm-response-${Date.now()}`,
        author: 'Project Manager',
        content: pmResponse || '',
        message: pmResponse || '', // Include both content and message for compatibility
        timestamp: new Date().toISOString(),
        avatar: '/static/images/avatar/agent.png',
        channel: data.channel || 'chat-widget',
        isAgentResponse: true,
        source: data.source || 'chat-widget'
      };

      // Save response to storage
      await saveMessage(response);

      // Remove typing indicator first
      io.emit('remove_typing_indicator', {
        id: `typing-project-manager-${data.messageId}`,
        channel: data.channel || 'chat-widget'
      });

      // Broadcast response to all clients
      io.emit('project-manager-message', response);
    } catch (error) {
      console.error('Error handling Project Manager request:', error);
      
      // Send error response
      const errorResponse = {
        messageId: `pm-error-${Date.now()}`,
        author: 'Project Manager',
        content: `I apologize, but I encountered an error: ${error.message}`,
        message: `I apologize, but I encountered an error: ${error.message}`, // Include both content and message
        timestamp: new Date().toISOString(),
        avatar: '/static/images/avatar/agent.png',
        channel: data.channel || 'chat-widget',
        isAgentResponse: true,
        isError: true,
        source: data.source || 'chat-widget'
      };

      // Remove typing indicator
      io.emit('remove_typing_indicator', {
        id: `typing-project-manager-${data.messageId}`,
        channel: data.channel || 'chat-widget'
      });

      // Send error response
      io.emit('project-manager-message', errorResponse);
    }
  });

  // Handle agent mentions directly
  socket.on('agent_mention', async (data) => {
    try {
      const { agentId, message, channel, messageId } = data;
      socketLogger.debug(`Received agent mention:`, { agentId, message, channel, messageId });
      
      // Process the message with the Project Manager
      if (agentId === 'agent-project-manager') {
        socketLogger.debug('Processing Project Manager message');
        const response = await processProjectManagerMessage(message);
        
        // Send the response back with messageId
        socketLogger.debug('Sending Project Manager response:', { response, messageId });
        io.emit('project-manager-message', {
          message: response,
          timestamp: new Date().toISOString(),
          channel,
          messageId
        });
      } else {
        // Handle other agent mentions through the regular process
        socketLogger.debug(`Processing regular agent mention for ${agentId}`);
        const response = await processAgentMention(agentId, {
          content: message,
          channel,
          from: userInfo,
          messageId
        });
        
        if (response) {
          socketLogger.debug('Sending agent response:', { response, messageId });
          io.emit('agent_response', {
            agentName: agentId === 'agent-project-manager' ? 'Project Manager' : 'Agent',
            message: response,
            channel,
            timestamp: new Date().toISOString(),
            messageId
          });
        }
      }
    } catch (error) {
      socketLogger.error(`Error handling agent mention [id=${socketId}]:`, error);
      socket.emit('error', { message: 'Failed to process agent mention' });
    }
  });

  // Handle mention notifications
  socket.on('mention_notification', async (data) => {
    try {
      const { mentionedId, mentionedType, message, channel } = data;
      socketLogger.debug(`Processing mention notification:`, { mentionedId, mentionedType, channel });
      
      // Find mentioned user's socket
      const mentionedSocket = Array.from(connectedUsers.values())
        .find(u => u.id === mentionedId && u.type === mentionedType)?.socketId;
      
      if (mentionedSocket) {
        socketLogger.debug(`Sending notification to ${mentionedSocket}`);
        io.to(mentionedSocket).emit('mention_notification', {
          message,
          channel,
          from: userInfo,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      socketLogger.error(`Error handling mention notification [id=${socketId}]:`, error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    socketLogger.info(`Client disconnected [id=${socketId}] reason: ${reason}`);
    // Remove user from connected users map
    connectedUsers.delete(socketId);
  });

  // Handle errors
  socket.on('error', (error) => {
    socketLogger.error(`Socket error [id=${socketId}]:`, error);
  });
});

/**
 * Process a mention of an agent
 * @param {string} agentId - The ID of the mentioned agent
 * @param {Object} data - Message data
 * @returns {Promise<string>} - Agent's response
 */
async function processAgentMention(agentId, data) {
  try {
    // Get agent configuration
    const settings = settingsService.getSettings();
    const agent = settings.agents.items.find(a => a.id === agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Process message with agent's LLM
    const response = await llmService.processMessage(
      data.content,
      agent.systemPrompt,
      {
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 4096,
        model: agent.model,
        providerId: agent.providerId
      }
    );
    
    return response;
    
  } catch (error) {
    socketLogger.error(`Error processing agent mention:`, error);
    return `Sorry, I encountered an error: ${error.message}`;
  }
}

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
