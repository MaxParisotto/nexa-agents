const express = require('express');
const router = express.Router();
const path = require('path');
const metricsService = require('../../services/metrics');

// Serve metrics dashboard
router.get('/metrics', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard/metrics.html'));
});

// Get current metrics
router.get('/metrics/data', async (req, res) => {
  try {
    const metrics = await metricsService.collectMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
