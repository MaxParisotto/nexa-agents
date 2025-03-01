/**
 * Settings API routes
 * Handles saving, loading, and validating settings
 */

import express from 'express';
const router = express.Router();
import {
  getSettings,
  saveSettings,
  validateSettings,
  clearSettings
} from '../controllers/settingsController.js';

// Get current settings
router.get('/', getSettings);

// Save new settings
router.post('/', saveSettings);

// Validate settings
router.post('/validate', validateSettings);

// Clear settings
router.delete('/', clearSettings);

export default router;
