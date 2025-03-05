/**
 * Configuration management API routes
 */
const express = require('express');
const router = express.Router();
const settingsService = require('../../services/settingsService');
const config = require('../../utils/config');
const logger = require('../../utils/logger').createLogger('config');

/**
 * @api {get} /config Get all configuration
 * @apiDescription Get the full system configuration
 * @apiName GetConfig
 * @apiGroup Config
 */
router.get('/', (req, res, next) => {
  try {
    // Combine settings from settings service with system config
    const settings = settingsService.getSettings();
    
    // Merge with environment config
    const systemConfig = {
      PORT: config.PORT,
      HOST: config.HOST,
      NODE_ENV: config.NODE_ENV,
      API_TIMEOUT: config.API_TIMEOUT,
      ENABLE_CLUSTERING: config.ENABLE_CLUSTERING,
      WORKER_COUNT: config.WORKER_COUNT,
      ENABLE_FILE_UPLOADS: config.ENABLE_FILE_UPLOADS,
      ENABLE_VOICE_INPUT: config.ENABLE_VOICE_INPUT,
      DEBUG_MODE: config.DEBUG_MODE
    };
    
    // Return combined configuration
    res.json({
      ...settings,
      ...systemConfig
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @api {post} /config Update configuration
 * @apiDescription Update system configuration
 * @apiName UpdateConfig
 * @apiGroup Config
 */
router.post('/', (req, res, next) => {
  try {
    const newConfig = req.body;
    
    // Extract system config values that should be stored in .env or memory
    const systemConfig = {};
    const settingsConfig = {...newConfig};
    
    // Remove system config properties from settings config
    ['PORT', 'HOST', 'NODE_ENV', 'API_TIMEOUT', 'ENABLE_CLUSTERING', 'WORKER_COUNT', 
     'DEBUG_MODE', 'ENABLE_FILE_UPLOADS', 'ENABLE_VOICE_INPUT'].forEach(key => {
      if (newConfig[key] !== undefined) {
        systemConfig[key] = newConfig[key];
        delete settingsConfig[key];
      }
    });
    
    // Update settings config
    const updatedSettings = settingsService.updateSettings(settingsConfig);
    
    // Update process.env with system config values
    Object.entries(systemConfig).forEach(([key, value]) => {
      process.env[key] = typeof value === 'boolean' ? String(value) : value;
    });
    
    // Log changes
    logger.info('Configuration updated', { systemChanges: Object.keys(systemConfig) });
    
    // Return the combined configuration
    res.json({
      message: 'Configuration updated successfully',
      config: {
        ...updatedSettings,
        ...systemConfig
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @api {post} /config/defaults Restore default configuration
 * @apiDescription Reset configuration to default values
 * @apiName RestoreDefaultConfig
 * @apiGroup Config
 */
router.post('/defaults', (req, res, next) => {
  try {
    // Create a new settings instance with defaults
    const fs = require('fs');
    const path = require('path');
    const SETTINGS_FILE = path.join(__dirname, '../../../../data/settings.json');
    
    // Delete the settings file to force recreating with defaults
    if (fs.existsSync(SETTINGS_FILE)) {
      // Create backup before deleting
      settingsService.backupSettings();
      
      // Delete and reinitialize
      fs.unlinkSync(SETTINGS_FILE);
      settingsService.initializeSettings();
    }
    
    const settings = settingsService.getSettings();
    
    // Reset environment variables to defaults
    process.env.PORT = '3000';
    process.env.HOST = '0.0.0.0';
    process.env.NODE_ENV = 'development';
    process.env.API_TIMEOUT = '30000';
    process.env.ENABLE_CLUSTERING = 'false';
    process.env.WORKER_COUNT = '0';
    process.env.DEBUG_MODE = 'false';
    process.env.ENABLE_FILE_UPLOADS = 'false';
    process.env.ENABLE_VOICE_INPUT = 'false';
    
    const systemConfig = {
      PORT: 3000,
      HOST: '0.0.0.0',
      NODE_ENV: 'development',
      API_TIMEOUT: 30000,
      ENABLE_CLUSTERING: false,
      WORKER_COUNT: 0,
      DEBUG_MODE: false,
      ENABLE_FILE_UPLOADS: false,
      ENABLE_VOICE_INPUT: false
    };
    
    res.json({
      message: 'Default configuration restored successfully',
      config: {
        ...settings,
        ...systemConfig
      }
    });
  } catch (error) {
    next(error);
  }
});

// Basic configuration endpoint
router.get('/basic', (req, res) => {
  try {
    // Return basic configuration
    res.json({
      server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || '0.0.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      features: {
        logging: true,
        metrics: true,
        clustering: false
      }
    });
  } catch (error) {
    logger.error('Error fetching configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

module.exports = router;
