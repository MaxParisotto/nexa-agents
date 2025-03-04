const express = require("express");
const logger = require("../utils/logger.js");

const router = express.Router();

// Test endpoint
router.get('/', (req, res) => {
  logger.debug('Test endpoint hit');
  res.json({ message: 'Test endpoint working' });
});

module.exports = router;