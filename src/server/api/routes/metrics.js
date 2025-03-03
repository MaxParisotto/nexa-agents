const express = require('express');
const router = express.Router();
const metricsService = require('../../services/metricsService');

// Get system metrics
router.get('/system', async (req, res) => {
  try {
    const metrics = await metricsService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// Get token usage metrics
router.get('/tokens', async (req, res) => {
  try {
    const tokenMetrics = metricsService.getTokenMetrics();
    res.json(tokenMetrics);
  } catch (error) {
    console.error('Error fetching token metrics:', error);
    res.status(500).json({ error: 'Failed to fetch token metrics' });
  }
});

// Get agent performance metrics
router.get('/agents/:id', async (req, res) => {
  try {
    const agentMetrics = await metricsService.getAgentMetrics(req.params.id);
    res.json(agentMetrics);
  } catch (error) {
    console.error(`Error fetching metrics for agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch agent metrics' });
  }
});

module.exports = router;
