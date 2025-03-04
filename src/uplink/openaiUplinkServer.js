const { WebSocketServer } = require("ws");
const http = require("http");
const { v4 as uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");
const { dirname } = require("path");

// Get the directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * OpenAI Uplink Server
 * Handles WebSocket connections for OpenAI Custom GPT integration
 */
export class OpenAIUplinkServer {
  constructor(options = {}) {
    this.port = options.port || 3002;
    this.clients = new Map();
    this.customGptConnections = new Map();
    this.apiKeys = new Map();
    this.server = null;
    this.wsServer = null;
    this.logger = options.logger || console;
    this.isRunning = false;
    this.lastActivity = Date.now();
    this.pendingRequests = new Map();
  }

  /**
   * Start the WebSocket server
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('OpenAI Uplink Server is already running');
      return;
    }

    try {
      // Create HTTP server
      this.server = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: Date.now(),
            connections: this.clients.size,
            customGptConnections: this.customGptConnections.size,
            lastActivity: this.lastActivity,
          }));
        } else if (req.url === '/') {
          // Status page
          const statusPagePath = path.join(__dirname, 'public', 'status.html');
          try {
            const content = fs.readFileSync(statusPagePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          } catch (err) {
            res.writeHead(404);
            res.end('Not found');
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      // Create WebSocket server - Fix: Use WebSocketServer instead of WebSocket.Server
      this.wsServer = new WebSocketServer({ server: this.server });

      // Handle WebSocket connections
      this.wsServer.on('connection', (ws, req) => {
        const clientId = uuidv4();
        const connectionType = req.url.includes('/custom-gpt') ? 'custom-gpt' : 'client';
        
        this.logger.info(`New ${connectionType} connection established: ${clientId}`);
        this.lastActivity = Date.now();

        // Initialize client data
        const clientData = {
          id: clientId,
          type: connectionType,
          ws,
          connectedAt: new Date(),
          apiKey: null,
          lastActivity: Date.now()
        };

        if (connectionType === 'custom-gpt') {
          this.customGptConnections.set(clientId, clientData);
        } else {
          this.clients.set(clientId, clientData);
          
          // Send welcome message to clients
          this.sendToClient(clientId, {
            type: 'connection',
            status: 'connected',
            clientId,
            timestamp: Date.now()
          });
        }

        // Handle messages from clients
        ws.on('message', (data) => {
          try {
            this.lastActivity = Date.now();
            const message = JSON.parse(data);
            this.handleMessage(clientId, message, connectionType);
          } catch (error) {
            this.logger.error(`Error handling message from ${connectionType} ${clientId}:`, error);
            
            if (connectionType !== 'custom-gpt') {
              this.sendToClient(clientId, {
                type: 'error',
                error: 'Invalid message format. Expected JSON.',
                timestamp: Date.now()
              });
            }
          }
        });

        // Handle disconnection
        ws.on('close', () => {
          this.logger.info(`${connectionType} ${clientId} disconnected`);
          if (connectionType === 'custom-gpt') {
            this.customGptConnections.delete(clientId);
          } else {
            this.clients.delete(clientId);
          }
        });

        // Handle errors
        ws.on('error', (error) => {
          this.logger.error(`WebSocket error from ${connectionType} ${clientId}:`, error);
        });
      });

      // Start HTTP server
      this.server.listen(this.port, () => {
        this.isRunning = true;
        this.logger.info(`OpenAI Uplink Server started on port ${this.port}`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        this.logger.error('Server error:', error);
      });
    } catch (error) {
      this.logger.error('Failed to start OpenAI Uplink Server:', error);
    }
  }

  /**
   * Stop the WebSocket server
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('OpenAI Uplink Server is not running');
      return;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    
    // Close all custom GPT connections
    for (const connection of this.customGptConnections.values()) {
      connection.ws.close();
    }

    // Close the server
    this.wsServer.close();
    this.server.close();
    this.isRunning = false;
    this.logger.info('OpenAI Uplink Server stopped');
  }

  /**
   * Handle messages from clients
   */
  handleMessage(clientId, message, connectionType) {
    if (!message || !message.type) {
      this.logger.warn(`Invalid message received from ${connectionType} ${clientId}`);
      return;
    }

    this.logger.debug(`Received message from ${connectionType} ${clientId}:`, message.type);

    // Handle message based on its type and source
    if (connectionType === 'custom-gpt') {
      this.handleCustomGptMessage(clientId, message);
    } else {
      this.handleClientMessage(clientId, message);
    }
  }

  /**
   * Handle messages from Custom GPT (OpenAI)
   */
  handleCustomGptMessage(clientId, message) {
    // Messages coming from OpenAI Custom GPTs
    switch (message.type) {
      case 'response':
        // Forward response from Custom GPT to the appropriate client
        if (message.requestId && this.pendingRequests.has(message.requestId)) {
          const { clientId: requestingClientId } = this.pendingRequests.get(message.requestId);
          this.sendToClient(requestingClientId, {
            type: 'gpt_response',
            data: message.data,
            requestId: message.requestId,
            timestamp: Date.now()
          });
          this.pendingRequests.delete(message.requestId);
        }
        break;

      case 'event':
        // Handle events from Custom GPT
        this.broadcastToClients({
          type: 'gpt_event',
          event: message.event,
          data: message.data,
          timestamp: Date.now()
        });
        break;

      case 'register':
        // Register a Custom GPT with optional capabilities
        const customGptConnection = this.customGptConnections.get(clientId);
        if (customGptConnection) {
          customGptConnection.name = message.name;
          customGptConnection.capabilities = message.capabilities || [];
          customGptConnection.lastActivity = Date.now();
          
          // Notify all clients about the new Custom GPT
          this.broadcastToClients({
            type: 'gpt_registered',
            id: clientId,
            name: message.name,
            capabilities: message.capabilities,
            timestamp: Date.now()
          });
        }
        break;

      default:
        this.logger.warn(`Unknown message type from Custom GPT ${clientId}:`, message.type);
    }
  }

  /**
   * Handle messages from clients (web application)
   */
  handleClientMessage(clientId, message) {
    // Messages coming from web application clients
    switch (message.type) {
      case 'register_api_key':
        // Register an API key for a client
        if (message.apiKey) {
          const client = this.clients.get(clientId);
          if (client) {
            client.apiKey = message.apiKey;
            this.apiKeys.set(clientId, message.apiKey);
            this.sendToClient(clientId, {
              type: 'api_key_registered',
              status: 'success',
              timestamp: Date.now()
            });
          }
        }
        break;

      case 'request':
        // Forward request to a Custom GPT
        if (message.targetGptId && this.customGptConnections.has(message.targetGptId)) {
          const requestId = uuidv4();
          
          // Store the request for later response matching
          this.pendingRequests.set(requestId, {
            clientId,
            timestamp: Date.now()
          });
          
          // Forward the request to the Custom GPT
          const customGptConnection = this.customGptConnections.get(message.targetGptId);
          this.sendToWebSocket(customGptConnection.ws, {
            type: 'request',
            data: message.data,
            requestId,
            clientId,
            timestamp: Date.now()
          });
        } else {
          this.sendToClient(clientId, {
            type: 'error',
            error: 'Custom GPT not found or not connected',
            timestamp: Date.now()
          });
        }
        break;

      case 'get_available_gpts':
        // Send list of available Custom GPTs to the client
        const availableGpts = Array.from(this.customGptConnections.entries())
          .map(([id, connection]) => ({
            id,
            name: connection.name || 'Unnamed GPT',
            capabilities: connection.capabilities || []
          }));
        
        this.sendToClient(clientId, {
          type: 'available_gpts',
          gpts: availableGpts,
          timestamp: Date.now()
        });
        break;

      case 'ping':
        // Response to client ping
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: Date.now()
        });
        break;

      default:
        this.logger.warn(`Unknown message type from client ${clientId}:`, message.type);
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      this.sendToWebSocket(client.ws, message);
    }
  }

  /**
   * Send message to a Custom GPT connection
   */
  sendToCustomGpt(gptId, message) {
    const connection = this.customGptConnections.get(gptId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      this.sendToWebSocket(connection.ws, message);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToClients(message) {
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendToWebSocket(client.ws, message);
      }
    }
  }

  /**
   * Send message to a WebSocket with error handling
   */
  sendToWebSocket(ws, message) {
    try {
      const messageStr = JSON.stringify(message);
      ws.send(messageStr);
      this.lastActivity = Date.now();
    } catch (error) {
      this.logger.error('Error sending message to WebSocket:', error);
    }
  }

  /**
   * Get status of the server
   */
  getStatus() {
    return {
      running: this.isRunning,
      port: this.port,
      clientCount: this.clients.size,
      customGptCount: this.customGptConnections.size,
      pendingRequestCount: this.pendingRequests.size,
      uptime: process.uptime(),
      lastActivity: this.lastActivity
    };
  }
}

// Create a singleton instance for direct import
export const openaiUplinkServer = new OpenAIUplinkServer();

module.exports = openaiUplinkServer;
