/**
 * Metrics API routes
 */
const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger').createLogger('metrics');
const metricsService = require('../../services/metricsService');
const { getSystemMetrics, getTokenMetrics, getAgentMetrics } = require('../../services/metricsService');

// Get system metrics
router.get('/system', async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// Get token usage metrics
router.get('/tokens', async (req, res) => {
  try {
    const tokenMetrics = getTokenMetrics();
    res.json(tokenMetrics);
  } catch (error) {
    logger.error('Error fetching token metrics:', error);
    res.status(500).json({ error: 'Failed to fetch token metrics' });
  }
});

// Get agent performance metrics
router.get('/agents/:id', async (req, res) => {
  try {
    const agentMetrics = await getAgentMetrics(req.params.id);
    res.json(agentMetrics);
  } catch (error) {
    logger.error(`Error fetching metrics for agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch agent metrics' });
  }
});

router.get('/', (req, res) => {
  try {
    // Return placeholder metrics data
    res.json({
      metrics: {
        requests: 0,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ error: true, message: 'Error retrieving metrics' });
  }
});

module.exports = router;
