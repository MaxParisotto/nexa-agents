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
const toolsRoutes = require('./routes/tools');

// Data directories
const DATA_DIR = path.join(__dirname, '../../data');
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
app.use('/api/agents', agentsRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tools', toolsRoutes);

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
  
  // Chat message handler
  socket.on('send_message', async (data) => {
    console.log('Chat message received:', data);
    
    try {
      // Get settings to find the Project Manager configuration
      const settingsService = require('../services/settingsService');
      const settings = settingsService.getSettings();
      
      // Check if Project Manager is enabled in features
      if (!settings.features?.projectManagerAgent) {
        throw new Error('Project Manager feature is not enabled');
      }
      
      // Get Project Manager configuration
      const projectManager = settings.projectManager;
      
      if (!projectManager) {
        throw new Error('Project Manager is not configured');
      }
      
      // Send a "thinking" message to the client
      socket.emit('new_message', {
        author: 'Project Manager',
        content: '...',
        avatar: '/static/images/avatar/system.png',
        timestamp: new Date().toISOString(),
        isThinking: true
      });
      
      // Generate a response using the configured LLM
      const response = await generateLlmResponse(projectManager, data.content);
      
      // Create a response message with the LLM-generated content
      const responseMessage = {
        author: 'Project Manager',
        content: response,
        avatar: '/static/images/avatar/system.png',
        timestamp: new Date().toISOString()
      };
      
      // Emit the response back to the client
      socket.emit('new_message', responseMessage);
      
      console.log('Response sent:', responseMessage);
    } catch (error) {
      console.error('Error handling chat message:', error);
      
      // Send error message back to the client
      socket.emit('new_message', {
        author: 'System',
        content: `Error: ${error.message}. Please check your Project Manager configuration in settings.`,
        avatar: '/static/images/avatar/system.png',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  /**
   * Generate a response using the configured LLM
   * @param {Object} projectManager - Project Manager configuration
   * @param {string} userMessage - User message
   * @returns {Promise<string>} - Generated response
   */
  async function generateLlmResponse(projectManager, userMessage) {
    const axios = require('axios');
    
    try {
      // Get LLM configuration from Project Manager settings
      const { apiUrl, model, serverType, parameters } = projectManager;
      
      if (serverType === 'lmStudio') {
        // LM Studio uses the OpenAI-compatible API
        const endpoint = `${apiUrl}/v1/chat/completions`;
        
        // Create a system prompt for the Project Manager
        const systemPrompt = `You are the Project Manager, an advanced AI agent that helps users create and manage other agents, configure tools, and optimize their environment. You have deep knowledge of the system architecture and can respond to natural language requests for system management.
        
Your personality is professional, efficient, and proactive. You should be helpful and provide clear, concise responses.

Current date: ${new Date().toISOString().split('T')[0]}
Current time: ${new Date().toLocaleTimeString()}`;
        
        // Create the request body
        const requestBody = {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: parameters?.temperature ?? 0.7,
          top_p: parameters?.topP ?? 0.9,
          max_tokens: parameters?.maxTokens ?? 1024
        };
        
        console.log('Sending request to LM Studio:', endpoint);
        
        // Send the request to the LLM API
        const response = await axios.post(endpoint, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });
        
        // Extract the response content
        if (response.data.choices && response.data.choices.length > 0) {
          return response.data.choices[0].message.content;
        }
        
        throw new Error('No completion in response');
      } else if (serverType === 'ollama') {
        // Ollama API
        const endpoint = `${apiUrl}/api/generate`;
        
        // Create a system prompt for the Project Manager
        const systemPrompt = `You are the Project Manager, an advanced AI agent that helps users create and manage other agents, configure tools, and optimize their environment. You have deep knowledge of the system architecture and can respond to natural language requests for system management.
        
Your personality is professional, efficient, and proactive. You should be helpful and provide clear, concise responses.

Current date: ${new Date().toISOString().split('T')[0]}
Current time: ${new Date().toLocaleTimeString()}

User message: ${userMessage}

Your response:`;
        
        // Create the request body
        const requestBody = {
          model: model,
          prompt: systemPrompt,
          temperature: parameters?.temperature ?? 0.7,
          top_p: parameters?.topP ?? 0.9,
          num_predict: parameters?.maxTokens ?? 1024
        };
        
        console.log('Sending request to Ollama:', endpoint);
        
        // Send the request to the LLM API
        const response = await axios.post(endpoint, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        });
        
        return response.data.response;
      }
      
      throw new Error(`Unsupported LLM server type: ${serverType}`);
    } catch (error) {
      console.error('Error generating LLM response:', error);
      return `I'm sorry, I encountered an error while processing your request: ${error.message}. Please try again later.`;
    }
  }
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
