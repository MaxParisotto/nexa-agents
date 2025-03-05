const logger = require('../utils/logger').createLogger('projectManager');

class ProjectManagerService {
  constructor() {
    this.io = null;
    this.activeProjects = new Map();
  }

  initialize(io) {
    this.io = io;
    this.setupSocketHandlers();
    return Promise.resolve();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('project-manager-request', (data) => this.handleRequest(socket, data));
    });
  }

  handleRequest(socket, data) {
    // Move business logic from client to here
    const response = {
      messageId: data.messageId,
      content: this.processRequest(data.message),
      timestamp: new Date().toISOString(),
      source: 'project-manager'
    };

    socket.emit('project-manager-message', response);
  }

  processRequest(message) {
    // Business logic here instead of in the client
    return `Processed: ${message}`;
  }
}

module.exports = new ProjectManagerService();
