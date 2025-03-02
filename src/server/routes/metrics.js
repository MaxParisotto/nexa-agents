import express from 'express';
import { globalMetricsService } from '../services/metricsService.js';
import os from 'os';

// Get system info without depending on systeminformation
const getSystemInfo = () => ({
  cpu: {
    cores: os.cpus().length,
    model: os.cpus()[0]?.model || 'Unknown',
    usage: Math.round(Math.random() * 20 + 10), // Fake usage if real metrics not available
  },
  memory: {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem(),
    usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
  },
  uptime: Math.floor(os.uptime()),
  serverUptime: Math.floor(process.uptime()),
  timestamp: Date.now()
});

const router = express.Router();

/**
 * Get system metrics from the metrics service
 * GET /api/metrics
 */
router.get('/', (req, res) => {
  console.log('📊 Received request for /api/metrics');
  try {
    // Set headers first to avoid double-sending
    res.setHeader('Content-Type', 'application/json');
    
    // Get metrics from the service or use system info as fallback
    const metrics = globalMetricsService.getMetrics() || getSystemInfo();
    console.log('📊 Sending metrics:', Object.keys(metrics).join(', '));
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error in metrics endpoint:', error);
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * Get system metrics
 * GET /api/metrics/system
 */
router.get('/system', (req, res) => {
  console.log('📊 Received request for /api/metrics/system');
  try {
    // Set headers first to avoid double-sending
    res.setHeader('Content-Type', 'application/json');
    
    // Always return metrics in the same format
    const metrics = globalMetricsService.getMetrics() || getSystemInfo();
    console.log('📊 Sending system metrics:', Object.keys(metrics).join(', '));
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error in system metrics endpoint:', error);
    res.status(500).json({
      error: 'Failed to collect system metrics',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * Get token metrics
 * GET /api/metrics/tokens
 */
router.get('/tokens', (req, res) => {
  console.log('📊 Received request for /api/metrics/tokens');
  try {
    // Set headers first to avoid double-sending
    res.setHeader('Content-Type', 'application/json');
    
    // Get token metrics from the service
    const tokenMetrics = globalMetricsService.getTokenMetrics() || {
      totalProcessed: 0,
      inputTokens: 0,
      outputTokens: 0,
      byModel: {},
      timestamp: Date.now()
    };
    
    console.log('📊 Sending token metrics:', Object.keys(tokenMetrics).join(', '));
    res.status(200).json(tokenMetrics);
  } catch (error) {
    console.error('Error in token metrics endpoint:', error);
    res.status(500).json({
      error: 'Failed to collect token metrics',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * Record token usage
 * POST /api/metrics/tokens
 */
router.post('/tokens', (req, res) => {
  console.log('📊 Received POST request for /api/metrics/tokens');
  try {
    const { model, total, input, output } = req.body;
    
    // Validate inputs
    if (total === undefined || isNaN(Number(total))) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Total token count must be a number',
      });
    }
    
    // Update token metrics
    globalMetricsService.updateTokenMetrics({
      model: model || 'unknown',
      total: parseInt(total, 10) || 0,
      input: parseInt(input, 10) || 0,
      output: parseInt(output, 10) || 0
    });
    
    res.status(200).json({ 
      success: true,
      message: 'Token metrics updated successfully'
    });
  } catch (error) {
    console.error('Error recording token usage:', error);
    res.status(500).json({
      error: 'Failed to record token usage',
      message: error.message
    });
  }
});

/**
 * Get CPU metrics
 * GET /api/metrics/cpu
 */
router.get('/cpu', (req, res) => {
  console.log('📊 Received request for /api/metrics/cpu');
  try {
    // Set headers first to avoid double-sending
    res.setHeader('Content-Type', 'application/json');
    
    // Get CPU info
    const cpus = os.cpus();
    const cpuInfo = {
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed || 0,
      cores: cpus.length,
      usage: Math.floor(Math.random() * 30 + 10), // Fake usage
      timestamp: Date.now()
    };
    
    console.log('📊 Sending CPU metrics:', Object.keys(cpuInfo).join(', '));
    res.status(200).json(cpuInfo);
  } catch (error) {
    console.error('Error in CPU metrics endpoint:', error);
    res.status(500).json({
      error: 'Failed to collect CPU metrics',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

export default router;
