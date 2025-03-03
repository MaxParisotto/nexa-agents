/**
 * Models API routes
 * Handles listing, testing and validating language models
 */

import express from 'express';
const router = express.Router();
import { getModels, testProviderConnection, validateProviderModel } from '../controllers/modelsController.js';

// Get models for a specific provider
router.get('/:provider', getModels);

// Test connection to a provider
router.post('/test-connection', testProviderConnection);

// Validate model for a provider
router.post('/validate', validateProviderModel);

export default router;
