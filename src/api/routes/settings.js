const express = require('express');
const router = express.Router();
const settingsService = require('../../services/settingsService');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = settingsService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error retrieving settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// Update settings
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
