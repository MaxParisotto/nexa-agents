const express = require("express");
const logger = require("../utils/logger.js");

const router = express.Router();

// Get settings
router.get('/', (req, res) => {
  logger.debug('Fetching settings');
  res.json({ settings: {} });
});

// Update settings
router.post('/', (req, res) => {
  const settings = req.body;
  logger.debug('Updating settings', { settings });
  res.json({ success: true });
});

module.exports = router;