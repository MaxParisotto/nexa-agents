const { WebSocketServer } = require("ws");
const http = require("http");
const url = require("url");
const { v4 as uuidv4 } = require("uuid");
const logger = require("../utils/logger.js");

/**
 * OpenAI CustomGPT Action API Uplink Server
 * Provides a WebSocket server that OpenAI CustomGPTs can connect to for executing actions
 */
class OpenAIUplinkServer {
  constructor(options = {}) {
    this.port = options.port || 3002;
    this.server = null;
    this.wss = null;
    this.clients = new Map(); // Map<clientId, WebSocket>
    this.actionHandlers = new Map(); // Map<actionName, handler>
    this.isRunning = false;
    
    // Security options
    this.apiKey = options.apiKey || process.env.OPENAI_UPLINK_API_KEY || '';
    this.requireApiKey = options.requireApiKey !== false;
    
    // Set up default action handlers
    this.registerDefaultActions();
  }
  
  /**
   * Start the WebSocket server
   */
  start() {
    if (this.isRunning) {
      logger.warn('OpenAI Uplink Server already running');
      return;
    }
    
    try {
      // Create HTTP server
      this.server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        // Handle health check endpoint
        if (parsedUrl.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
          return;
        }
        
        // Handle API info endpoint
        if (parsedUrl.pathname === '/api/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            name: 'Nexa Agents OpenAI Uplink',
            version: '1.0.0',
            actions: Array.from(this.actionHandlers.keys()),
            clientsConnected: this.clients.size
          }));
          return;
        }
        
        // All other routes return 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });
      
      // Create WebSocket server attached to HTTP server
      // FIX: Use WebSocketServer directly instead of WebSocket.Server
      this.wss = new WebSocketServer({ server: this.server });
      
      // Handle WebSocket connections
      this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
      
      // Start listening
      this.server.listen(this.port, () => {
        this.isRunning = true;
        logger.info(`OpenAI Uplink Server started on port ${this.port}`);
        console.log(`OpenAI Uplink Server started on port ${this.port}`);
      });
    } catch (error) {
      logger.error('Failed to start OpenAI Uplink Server', error);
      console.error('Failed to start OpenAI Uplink Server:', error);
    }
  }
  
  /**
   * Stop the WebSocket server
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.server) {
      this.server.close();
    }
    
    this.isRunning = false;
    logger.info('OpenAI Uplink Server stopped');
  }
  
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    // Generate client ID
    const clientId = uuidv4();
    
    // Parse query parameters
    const parsedUrl = url.parse(req.url, true);
    const { apiKey } = parsedUrl.query;
    
    // Check API key if required
    if (this.requireApiKey && apiKey !== this.apiKey) {
      logger.warn(`Rejected connection from ${req.socket.remoteAddress}: Invalid API key`);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Authentication failed. Invalid API key.'
      }));
      ws.close();
      return;
    }
    
    // Store client
    this.clients.set(clientId, ws);
    logger.info(`New client connected: ${clientId} from ${req.socket.remoteAddress}`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      clientId,
      actions: Array.from(this.actionHandlers.keys())
    }));
    
    // Handle incoming messages
    ws.on('message', (message) => this.handleMessage(clientId, message));
    
    // Handle client disconnect
    ws.on('close', () => {
      logger.info(`Client disconnected: ${clientId}`);
      this.clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });
  }
  
  /**
   * Handle incoming WebSocket message
   */
  async handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    
    try {
      // Parse message
      const data = JSON.parse(message);
      logger.debug(`Received message from client ${clientId}:`, data);
      
      // Handle action execution
      if (data.type === 'action') {
        await this.executeAction(clientId, data);
      }
    } catch (error) {
      logger.error(`Failed to process message from client ${clientId}:`, error);
      client.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message: ' + error.message
      }));
    }
  }
  
  /**
   * Execute an action requested by a client
   */
  async executeAction(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    
    const { action, params, requestId } = data;
    
    // Check if action exists
    if (!this.actionHandlers.has(action)) {
      client.send(JSON.stringify({
        type: 'actionResponse',
        requestId,
        success: false,
        error: `Unknown action: ${action}`
      }));
      return;
    }
    
    try {
      // Execute action
      const handler = this.actionHandlers.get(action);
      const result = await handler(params, clientId);
      
      // Send response
      client.send(JSON.stringify({
        type: 'actionResponse',
        requestId,
        success: true,
        result
      }));
    } catch (error) {
      logger.error(`Failed to execute action ${action}:`, error);
      client.send(JSON.stringify({
        type: 'actionResponse',
        requestId,
        success: false,
        error: error.message
      }));
    }
  }
  
  /**
   * Register an action handler
   */
  registerAction(actionName, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Action handler must be a function');
    }
    
    this.actionHandlers.set(actionName, handler);
    logger.info(`Registered action: ${actionName}`);
    return this;
  }
  
  /**
   * Register default actions
   */
  registerDefaultActions() {
    // Echo action - sends back the parameters
    this.registerAction('echo', async (params) => {
      return { echo: params };
    });
    
    // System info action
    this.registerAction('systemInfo', async () => {
      return {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        clientsConnected: this.clients.size
      };
    });
  }
}

module.exports = OpenAIUplinkServer;
