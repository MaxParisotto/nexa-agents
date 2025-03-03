import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../shared/constants';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const SocketContext = createContext({
  socket: null,
  connected: false,
  events: [],
});

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // Socket event handlers
    socketInstance.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketInstance.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketInstance.on(SOCKET_EVENTS.AGENT_STATUS, (data) => {
      setEvents((prev) => [...prev.slice(-99), { type: 'agent_status', data, timestamp: new Date() }]);
    });

    socketInstance.on(SOCKET_EVENTS.TASK_UPDATE, (data) => {
      setEvents((prev) => [...prev.slice(-99), { type: 'task_update', data, timestamp: new Date() }]);
    });

    socketInstance.on(SOCKET_EVENTS.WORKFLOW_UPDATE, (data) => {
      setEvents((prev) => [...prev.slice(-99), { type: 'workflow_update', data, timestamp: new Date() }]);
    });

    socketInstance.on(SOCKET_EVENTS.METRICS_UPDATE, (data) => {
      setEvents((prev) => [...prev.slice(-99), { type: 'metrics_update', data, timestamp: new Date() }]);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, events }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
