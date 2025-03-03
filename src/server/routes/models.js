import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all models
router.get('/', (req, res) => {
  logger.debug('Fetching models');
  res.json({ models: [] });
});

// Get model by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  logger.debug(`Fetching model with ID: ${id}`);
  res.json({ model: { id } });
});

export default router;