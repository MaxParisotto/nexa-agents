/**
 * Models API routes
 * Handles listing, testing and validating language models
 */

const express = require('express');
const router = express.Router();
const modelsController = require('../controllers/modelsController');

// Get models for a specific provider
router.get('/:provider', modelsController.getModels);

// Test connection to a provider
router.post('/test-connection', modelsController.testConnection);

// Validate model for a provider
router.post('/validate', modelsController.validateModel);

module.exports = router; 