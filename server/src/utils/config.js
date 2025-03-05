/**
 * Central configuration manager
 * Uses settings service as the primary source of configuration
 */
const logger = require('./logger').createLogger('config');

const getConfig = () => {
  const config = {
    PORT: 3001,
    HOST: '0.0.0.0',
    WEBSOCKET: {
      PING_TIMEOUT: 60000,
      PING_INTERVAL: 25000,
      TRANSPORTS: ['websocket', 'polling']
    },
    // Allow all origins in production
    ALLOWED_HOSTS: ['*']
  };

  logger.info('Configuration loaded:', config);
  return config;
};

module.exports = { getConfig };