const WebSocket = require('ws');
const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { EventEmitter } = require('events');

class UplinkServer extends EventEmitter {
  constructor() {
    super();
    this.app = express();
    this.settings = null;
    this.wss = null;
    this.clients = new Map();
    this.stats = {
      totalRequests: 0,
      connectedClients: 0
    };
  }

  // Initialize server with settings
  async initialize(settings) {
    this.settings = settings;
    
    // Setup HTTP server for health checks
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        stats: this.stats
      });
    });

    // Create WebSocket server
    this.wss = new WebSocket.Server({
      port: this.settings.port,
      host: this.settings.host
    });

    // Setup WebSocket handlers
    this.wss.on('connection', this.handleConnection.bind(this));
    
    this.log('info', `Server initialized on ${this.settings.host}:${this.settings.port}`);
  }

  // Handle new WebSocket connections
  handleConnection(ws, req) {
    const clientId = uuidv4();
    
    // Store client info
    this.clients.set(clientId, {
      ws,
      authenticated: false,
      info: null
    });
    
    this.stats.connectedClients++;
    this.log('info', `New client connected: ${clientId}`);

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await this.handleMessage(clientId, message);
      } catch (error) {
        this.log('error', `Failed to handle message: ${error.message}`);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.clients.delete(clientId);
      this.stats.connectedClients--;
      this.log('info', `Client disconnected: ${clientId}`);
    });

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      message: 'Connected to Nexa GPT Uplink'
    });
  }

  // Handle incoming messages
  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.stats.totalRequests++;

    switch (message.type) {
      case 'connect':
        await this.handleConnect(clientId, message);
        break;
      
      case 'command':
        await this.handleCommand(clientId, message);
        break;
      
      case 'confirm':
        await this.handleConfirm(clientId, message);
        break;
      
      default:
        this.sendError(client.ws, 'Unknown message type');
    }
  }

  // Handle connect messages
  async handleConnect(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Verify auth token if required
      if (this.settings.requireApiKey) {
        if (!message.auth_token || message.auth_token !== this.settings.apiKey) {
          throw new Error('Invalid authentication');
        }
      }

      // Store client info
      client.authenticated = true;
      client.info = message.info;

      this.log('info', `Client authenticated: ${clientId}`);
      
      // Send success response
      this.send(client.ws, {
        type: 'connected',
        message: 'Successfully authenticated',
        schema: this.getApiSchema()
      });

    } catch (error) {
      this.log('error', `Authentication failed: ${error.message}`);
      this.sendError(client.ws, 'Authentication failed');
      client.ws.close();
    }
  }

  // Handle command messages
  async handleCommand(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(client.ws, 'Not authenticated');
      return;
    }

    try {
      // Validate rate limit
      if (!this.checkRateLimit(clientId)) {
        throw new Error('Rate limit exceeded');
      }

      // Process command
      const result = await this.processCommand(message.command);
      
      this.send(client.ws, {
        type: 'action_executed',
        message: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.log('error', `Command failed: ${error.message}`);
      this.sendError(client.ws, error.message);
    }
  }

  // Handle confirm messages
  async handleConfirm(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(client.ws, 'Not authenticated');
      return;
    }

    try {
      // Process confirmation
      await this.processConfirmation(message.confirmation_id);
      
      this.send(client.ws, {
        type: 'action_executed',
        message: 'Action confirmed and executed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.log('error', `Confirmation failed: ${error.message}`);
      this.sendError(client.ws, error.message);
    }
  }

  // Get API schema based on settings
  getApiSchema() {
    return {
      name: this.settings.schema.name,
      version: this.settings.schema.version,
      description: this.settings.schema.description,
      providers: this.settings.availableProviders
        .filter(p => p.exposed)
        .map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          models: p.models,
          defaultModel: p.defaultModel
        }))
    };
  }

  // Check rate limit for client
  checkRateLimit(clientId) {
    // Implement rate limiting logic here
    return true;
  }

  // Process a command
  async processCommand(command) {
    // Implement command processing logic here
    return 'Command processed successfully';
  }

  // Process a confirmation
  async processConfirmation(confirmationId) {
    // Implement confirmation processing logic here
    return true;
  }

  // Send a message to a client
  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send an error message
  sendError(ws, message) {
    this.send(ws, {
      type: 'error',
      message
    });
  }

  // Log a message with level
  log(level, message) {
    if (this.settings.logLevel === 'error' && level !== 'error') return;
    if (this.settings.logLevel === 'warning' && !['error', 'warning'].includes(level)) return;
    
    const logMessage = {
      level,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.emit('log', logMessage);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  // Start the server
  async start() {
    if (!this.settings) {
      throw new Error('Server not initialized');
    }

    // Start HTTP server
    const httpPort = this.settings.port + 1;
    this.app.listen(httpPort, this.settings.host, () => {
      this.log('info', `HTTP server listening on port ${httpPort}`);
    });

    this.log('info', 'Server started successfully');
  }

  // Stop the server
  async stop() {
    if (this.wss) {
      // Close all client connections
      this.clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close();
        }
      });

      // Close the server
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      this.stats.connectedClients = 0;
    }

    this.log('info', 'Server stopped');
  }

  // Update server settings
  async updateSettings(settings) {
    const wasRunning = this.wss !== null;
    
    if (wasRunning) {
      await this.stop();
    }

    this.settings = settings;
    
    if (wasRunning) {
      await this.initialize(settings);
      await this.start();
    }

    this.log('info', 'Settings updated');
  }
}

// Create and export server instance
const uplinkServer = new UplinkServer();
module.exports = uplinkServer; 