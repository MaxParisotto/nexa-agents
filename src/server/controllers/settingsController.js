/**
 * Settings Controller
 * Handles loading, saving, and validating application settings
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const settingsService = require('../services/settingsService');

// Config directory setup
const CONFIG_DIR = path.join(__dirname, '../../../config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  logger.info('Created config directory', { path: CONFIG_DIR });
}

/**
 * Get current settings
 */
const getSettings = async (req, res) => {
  try {
    logger.info('Loading settings');
    
    const settings = await settingsService.loadSettings();
    return res.status(200).json(settings);
  } catch (error) {
    logger.error('Failed to load settings', { error: error.message });
    return res.status(500).json({ 
      error: 'Failed to load settings',
      details: error.message
    });
  }
};

/**
 * Save settings
 */
const saveSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    if (!settings) {
      return res.status(400).json({ error: 'No settings provided' });
    }
    
    logger.info('Saving settings');
    
    // Validate settings before saving
    const validationResult = await settingsService.validateSettings(settings);
    
    if (!validationResult.isValid) {
      logger.warn('Invalid settings', { errors: validationResult.errors });
      return res.status(400).json({ 
        error: 'Invalid settings',
        validationErrors: validationResult.errors
      });
    }
    
    // Save validated settings
    await settingsService.saveSettings(settings);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Settings saved successfully'
    });
  } catch (error) {
    logger.error('Failed to save settings', { error: error.message });
    return res.status(500).json({ 
      error: 'Failed to save settings',
      details: error.message
    });
  }
};

/**
 * Validate settings without saving
 */
const validateSettings = async (req, res) => {
  try {
    const settings = req.body;
    
    if (!settings) {
      return res.status(400).json({ error: 'No settings provided' });
    }
    
    logger.info('Validating settings');
    
    const validationResult = await settingsService.validateSettings(settings);
    
    return res.status(200).json(validationResult);
  } catch (error) {
    logger.error('Failed to validate settings', { error: error.message });
    return res.status(500).json({ 
      error: 'Failed to validate settings',
      details: error.message
    });
  }
};

/**
 * Clear settings
 */
const clearSettings = async (req, res) => {
  try {
    logger.info('Clearing settings');
    
    await settingsService.clearSettings();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Settings cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear settings', { error: error.message });
    return res.status(500).json({ 
      error: 'Failed to clear settings',
      details: error.message
    });
  }
};

module.exports = {
  getSettings,
  saveSettings,
  validateSettings,
  clearSettings
}; 