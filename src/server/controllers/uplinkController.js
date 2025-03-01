import jwt from 'jsonwebtoken';
import { saveConfigToFile } from '../services/uplinkService.js';

const startWebSocketServer = (io, port) => {
  console.log(`WebSocket Server running on port ${port}`);
  
  io.on('connection', (socket) => {
    console.log("New WebSocket connection");

    socket.on('auth', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded.user;
        console.log(`Authenticated user: ${socket.user}`);
        socket.emit('auth_success', { message: "Welcome!" });
      } catch (error) {
        socket.emit('error', { message: "Authentication failed" });
      }
    });

    socket.on('message', (message) => {
      try {
        console.log(`[${message.topic}] ${message.sender}: ${message.content}`);
        io.emit('message', message);
      } catch (error) {
        socket.emit('error', { message: "Invalid message format" });
      }
    });

    socket.on('disconnect', () => {
      console.log("Client disconnected");
    });
  });
};

const broadcast = (message) => {
  io.emit('message', message);
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
    if (!io) {
      throw new Error('WebSocket server not initialized');
    }
    
    // Disconnect all clients
    io.disconnectSockets(true);
    
    res.json({ success: true, message: 'WebSocket server restarted' });
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({ success: false, message: 'Failed to restart server' });
  }
};

export const initializeUplinkController = (io) => {
  // Initialize WebSocket server with default port
  startWebSocketServer(io, 8081);
};
