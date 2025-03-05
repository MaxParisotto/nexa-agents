const metricsService = require("./metricsService.js");
const modelsService = require("./modelsService.js");
const settingsService = require("./settingsService.js");
const uplinkService = require("./uplinkService.js");
const logger = require('../utils/logger').createLogger('services');

// Service registry
const services = {
  projectManager: require('./projectManager'),
  agents: require('./agents'),
  workflows: require('./workflows'),
  metrics: require('./metrics'),
  settings: require('./settings'),
  chat: require('./chat')
};

// Initialize all services
const initializeServices = async (io) => {
  logger.info('Initializing services...');
  
  for (const [name, service] of Object.entries(services)) {
    if (typeof service.initialize === 'function') {
      try {
        await service.initialize(io);
        logger.info(`Service ${name} initialized`);
      } catch (error) {
        logger.error(`Failed to initialize service ${name}:`, error);
      }
    }
  }
};

module.exports = {
  services,
  initializeServices,
  metricsService,
  modelsService,
  settingsService,
  uplinkService
};