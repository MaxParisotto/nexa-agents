/**
 * Settings API routes
 */
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger').createLogger('settings');

// Try to import settings service
let settingsService;
try {
  settingsService = require('../../services/settingsService');
} catch (e) {
  logger.error('Failed to load settings service:', e);
}

router.get('/', (req, res) => {
  try {
    if (settingsService) {
      const settings = settingsService.getSettings();
      res.json(settings);
    } else {
      // Fallback response if service is unavailable
      res.json({
        message: 'Settings service unavailable',
        error: true
      });
    }
  } catch (error) {
    logger.error('Error getting settings:', error);
    res.status(500).json({ error: true, message: 'Error retrieving settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const updatedSettings = settingsService.updateSettings(req.body);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset settings to default
router.post('/reset', async (req, res) => {
  try {
    const defaultSettings = settingsService.resetSettings();
    res.json(defaultSettings);
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

module.exports = router;
