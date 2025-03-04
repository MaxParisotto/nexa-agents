import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Socket.io URL from environment variables
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

/**
 * Socket context for managing WebSocket connections
 */
const SocketContext = createContext({
  socket: null,
  connected: false,
  events: [],
});

/**
 * Socket Provider component to wrap application and provide socket functionality
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // Socket event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Event handlers for application events
    ['agent_status', 'task_update', 'workflow_update', 'metrics_update'].forEach(eventType => {
      socketInstance.on(eventType, (data) => {
        console.log(`Socket event received: ${eventType}`, data);
        setEvents(prev => [
          ...prev.slice(-99), 
          { type: eventType, data, timestamp: new Date() }
        ]);
      });
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, events }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook for using the socket throughout the application
 */
export function useSocket() {
  return useContext(SocketContext);
}
