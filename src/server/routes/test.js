import express from 'express';
import logger from '../utils/logger.js';

const router = express.Router();

// Test endpoint
router.get('/', (req, res) => {
  logger.debug('Test endpoint hit');
  res.json({ message: 'Test endpoint working' });
});

export default router;