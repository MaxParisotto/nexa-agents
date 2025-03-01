import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { saveConfigToFile } from '../services/uplinkService.js';

let wss;

const startWebSocketServer = (port) => {
  if (wss) {
    wss.close();
  }

  wss = new WebSocket.Server({ port });
  const clients = new Map();

  console.log(`WebSocket Server running on ws://localhost:${port}`);

  wss.on('connection', (ws, req) => {
    console.log("New WebSocket connection");

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === "auth") {
          const decoded = jwt.verify(message.token, process.env.JWT_SECRET);
          ws.user = decoded.user;
          console.log(`Authenticated user: ${ws.user}`);
          ws.send(JSON.stringify({ type: "auth_success", message: "Welcome!" }));
        }
        else if (message.type === "message") {
          console.log(`[${message.topic}] ${message.sender}: ${message.content}`);
          broadcast(message);
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format or auth failed." }));
      }
    });

    ws.on('close', () => {
      console.log("Client disconnected");
    });
  });
};

const broadcast = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

export const saveConfig = async (req, res) => {
  try {
    const config = req.body;
    
    // Save configuration to file
    await saveConfigToFile(config);
    
    // Restart WebSocket server with new port
    startWebSocketServer(config.websocket.port);
    
    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ success: false, message: 'Failed to save configuration' });
  }
};

export const restartServer = async (req, res) => {
  try {
    if (!wss) {
      throw new Error('WebSocket server not initialized');
    }
    
    // Close existing connections
    wss.clients.forEach(client => client.close());
    
    res.json({ success: true, message: 'WebSocket server restarted' });
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({ success: false, message: 'Failed to restart server' });
  }
};

// Initialize WebSocket server with default port
startWebSocketServer(8081);
