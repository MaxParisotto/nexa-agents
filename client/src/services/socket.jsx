import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Socket.io URL from environment variables or default to current host with correct port
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Create a simple logger
const logger = {
  info: (...args) => console.log('[Socket]', ...args),
  warn: (...args) => console.warn('[Socket]', ...args),
  error: (...args) => console.error('[Socket]', ...args),
  debug: (...args) => console.debug('[Socket]', ...args)
};

/**
 * Socket context for managing WebSocket connections
 */
const SocketContext = createContext({
  socket: null,
  connected: false,
  events: [],
  sendProjectManagerMessage: () => {},
});

/**
 * Socket Provider component to wrap application and provide socket functionality
 */
export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);
  const cleanupRef = useRef(false);
  const unmountingRef = useRef(false);

  // Define sendProjectManagerMessage as a component function using useCallback
  const sendProjectManagerMessage = useCallback((message, messageId, source = 'chat-widget', channel = 'chat-widget') => {
    if (!socketRef.current?.connected) {
      logger.warn('Socket not connected, cannot send message');
      return;
    }
    
    logger.debug('Sending message to Project Manager:', message);
    socketRef.current.emit('project-manager-request', {
      message,
      timestamp: new Date().toISOString(),
      messageId: messageId || `pm-${Date.now()}`,
      source,
      channel
    });
  }, []);

  // Cleanup function defined outside useEffect to ensure consistency
  const cleanup = useCallback(() => {
    logger.debug('Starting cleanup process...');
    cleanupRef.current = true;

    if (socketRef.current) {
      const socket = socketRef.current;

      // Remove all listeners first to prevent any new events during cleanup
      try {
        logger.debug('Removing socket listeners...');
        socket.removeAllListeners();
        socket.offAny();
      } catch (error) {
        logger.error('Error removing listeners:', error);
      }

      // Disconnect the socket if it's still connected
      try {
        if (socket.connected) {
          logger.debug('Disconnecting socket...');
          socket.disconnect();
        }
      } catch (error) {
        logger.error('Error disconnecting socket:', error);
      }

      // Clear the socket reference
      socketRef.current = null;
      setConnected(false);
      logger.debug('Cleanup completed');
    }
  }, []);

  useEffect(() => {
    let connectionTimeout;
    cleanupRef.current = false;
    unmountingRef.current = false;

    const initSocket = () => {
      try {
        // Don't initialize if we're cleaning up or unmounting
        if (cleanupRef.current || unmountingRef.current) {
          logger.debug('Skipping socket initialization during cleanup/unmount');
          return;
        }

        // Clean up existing socket if any
        if (socketRef.current) {
          cleanup();
        }

        logger.debug('Initializing socket connection to:', SOCKET_URL);

        // Create new socket connection with retry logic
        const socketInstance = io(SOCKET_URL, {
          transports: ['polling', 'websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000
        });

        // Set up event listeners before connecting
        socketInstance.on('connect', () => {
          if (cleanupRef.current || unmountingRef.current) return;
          logger.debug('Socket connected successfully');
          setConnected(true);
          clearTimeout(connectionTimeout);
        });

        socketInstance.on('connect_error', (error) => {
          if (cleanupRef.current || unmountingRef.current) return;
          logger.warn('Socket connection error:', error.message);
          setConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          logger.error('Connection Error:', error);
        });

        socketInstance.on('connect_timeout', (timeout) => {
          logger.error('Connection Timeout:', timeout);
        });

        socketInstance.on('disconnect', (reason) => {
          if (cleanupRef.current || unmountingRef.current) return;
          logger.info('Socket disconnected:', reason);
          setConnected(false);
          
          if (reason === 'io server disconnect') {
            logger.info('Server disconnected socket, attempting to reconnect...');
            socketInstance.connect();
          }
        });

        socketInstance.on('error', (error) => {
          if (cleanupRef.current || unmountingRef.current) return;
          logger.error('Socket error:', error);
        });

        // Project Manager specific events
        socketInstance.on('project-manager-message', (data) => {
          if (cleanupRef.current || unmountingRef.current) return;
          logger.debug('Project Manager message received:', data);
          
          // Ensure we have a messageId and content
          const messageWithId = {
            ...data,
            messageId: data.messageId || `pm-response-${Date.now()}`,
            content: data.content || data.message // Handle both content and message fields
          };
          
          // Check if this is from the chat widget or Agora
          if (messageWithId.source === 'chat-widget') {
            // Dispatch event for the ChatWidget component
            const event = new CustomEvent('chat-widget-message', {
              detail: messageWithId
            });
            window.dispatchEvent(event);
          } else {
            // Dispatch event for the Agora component
            const event = new CustomEvent('project-manager-message', {
              detail: messageWithId
            });
            window.dispatchEvent(event);
          }
        });

        // Add agent_response event listener
        socketInstance.on('agent_response', (data) => {
          if (cleanupRef.current || unmountingRef.current) return;
          logger.debug('Agent response received:', data);
          
          // Dispatch event for the Agora component
          const event = new CustomEvent('agent_response', {
            detail: data
          });
          window.dispatchEvent(event);
        });

        // Event handlers for application events
        ['agent_status', 'task_update', 'workflow_update', 'metrics_update'].forEach(eventType => {
          socketInstance.on(eventType, (data) => {
            if (cleanupRef.current || unmountingRef.current) return;
            logger.debug(`Socket event received: ${eventType}`);
            setEvents(prev => [
              ...prev.slice(-99), 
              { type: eventType, data, timestamp: new Date() }
            ]);
          });
        });

        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          if (!socketInstance.connected && !cleanupRef.current && !unmountingRef.current) {
            logger.warn('Socket connection timeout');
            cleanup();
          }
        }, 20000);

        socketRef.current = socketInstance;

        // Now that all listeners are set up, attempt to connect
        socketInstance.connect();
      } catch (error) {
        logger.error('Error initializing socket:', error);
        cleanup();
      }
    };

    initSocket();

    // Cleanup function
    return () => {
      logger.debug('Component unmounting...');
      unmountingRef.current = true;
      clearTimeout(connectionTimeout);
      cleanup();
    };
  }, [cleanup]);

  return (
    <SocketContext.Provider value={{ 
      socket: socketRef.current,
      connected,
      events,
      sendProjectManagerMessage
    }}>
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
