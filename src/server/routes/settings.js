/**
 * Settings API routes
 * Handles saving, loading, and validating settings
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Get current settings
router.get('/', settingsController.getSettings);

// Save new settings
router.post('/', settingsController.saveSettings);

// Validate settings
router.post('/validate', settingsController.validateSettings);

// Clear settings
router.delete('/', settingsController.clearSettings);

module.exports = router; 