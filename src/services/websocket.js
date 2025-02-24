import { io } from 'socket.io-client';
import store from '../store';
import {
  updateWebsocketStatus,
  addNotification,
  updateMetrics,
  addError
} from '../store/actions/systemActions';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    // Get settings from store
    const settings = store.getState().settings;
    const port = settings.port;
    let serverUrl;

    // In production, use the current window location
    serverUrl = `${window.location.protocol}//${window.location.host}`;

    console.log('Connecting to WebSocket server at:', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      store.dispatch(updateWebsocketStatus('connected'));
      store.dispatch(addNotification({
        type: 'success',
        message: 'Connected to server'
      }));
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      store.dispatch(updateWebsocketStatus('disconnected'));
      store.dispatch(addNotification({
        type: 'warning',
        message: 'Disconnected from server'
      }));
    });

    this.socket.on('connect_error', (error) => {
      store.dispatch(updateWebsocketStatus('error'));
      store.dispatch(addError({
        type: 'connection',
        message: 'Failed to connect to server',
        error: error.message
      }));
    });

    // Handle incoming events
    this.socket.on('agent_registered', (agentData) => {
      store.dispatch(addNotification({
        type: 'info',
        message: `New agent registered: ${agentData.name}`
      }));
    });

    this.socket.on('task_assigned', (taskData) => {
      store.dispatch(addNotification({
        type: 'info',
        message: `Task assigned: ${taskData.title}`
      }));
    });

    this.socket.on('task_updated', (taskUpdate) => {
      store.dispatch(addNotification({
        type: 'info',
        message: `Task updated: ${taskUpdate.title}`
      }));
    });

    this.socket.on('metrics_updated', (metrics) => {
      store.dispatch(updateMetrics(metrics));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Emit events
  registerAgent(agentData) {
    if (this.isConnected) {
      this.socket.emit('register_agent', agentData);
    }
  }

  assignTask(taskData) {
    if (this.isConnected) {
      this.socket.emit('assign_task', taskData);
    }
  }

  updateTask(taskUpdate) {
    if (this.isConnected) {
      this.socket.emit('update_task', taskUpdate);
    }
  }

  sendMetrics(metrics) {
    if (this.isConnected) {
      this.socket.emit('system_metrics', metrics);
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();
export default websocketService;
