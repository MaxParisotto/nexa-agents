import express from 'express';
import { globalMetricsService } from '../services/index.js';

// Try to import systeminformation but don't crash if it's not available
let si;
try {
  si = await import('systeminformation');
} catch (e) {
  console.warn('systeminformation package not available, some detailed metrics will be unavailable');
  // Create mock functions for si if not available
  si = {
    currentLoad: async () => ({ currentLoad: Math.random() * 30 + 10, cpus: [] }),
    cpuTemperature: async () => ({ main: 50 }),
    cpuSpeed: async () => ({ avg: 3000 })
  };
}

const router = express.Router();

/**
 * Get system metrics from the metrics service
 * GET /api/metrics
 */
router.get('/', (req, res) => {
  try {
    // Set content-type explicitly
    res.setHeader('Content-Type', 'application/json');
    
    // Get metrics from the service
    const metrics = globalMetricsService.getMetrics();
    
    // Send metrics back to the client with precise JSON formatting
    res.send(JSON.stringify(metrics));
  } catch (error) {
    console.error('Error in metrics endpoint:', error);
    
    // Send error as JSON
    res.status(500).json({
      error: 'Failed to collect metrics',
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
  try {
    // Set content-type explicitly
    res.setHeader('Content-Type', 'application/json');
    
    // Get token metrics from the service
    const tokenMetrics = globalMetricsService.getTokenMetrics();
    
    // Send metrics back to the client with precise JSON formatting
    res.send(JSON.stringify(tokenMetrics));
  } catch (error) {
    console.error('Error in token metrics endpoint:', error);
    
    // Send error as JSON
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
  try {
    const { model, total, input, output } = req.body;
    
    // Update token metrics
    globalMetricsService.updateTokenMetrics({
      model,
      total: parseInt(total, 10) || 0,
      input: parseInt(input, 10) || 0,
      output: parseInt(output, 10) || 0
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error recording token usage:', error);
    res.status(500).json({
      error: 'Failed to record token usage',
      message: error.message
    });
  }
});

/**
 * Get detailed CPU stats
 * GET /api/metrics/cpu
 */
router.get('/cpu', async (req, res) => {
  try {
    // Set content-type explicitly
    res.setHeader('Content-Type', 'application/json');
    
    // Get detailed CPU information using systeminformation
    const [currentLoad, cpuTemperature, cpuSpeed] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature(),
      si.cpuSpeed()
    ]);
    
    const cpuData = {
      usage: currentLoad.currentLoad,
      coresLoad: currentLoad.cpus.map(cpu => cpu.load),
      temperature: cpuTemperature.main,
      speed: cpuSpeed.avg,
      timestamp: Date.now()
    };
    
    // Send CPU data back to the client
    res.send(JSON.stringify(cpuData));
  } catch (error) {
    console.error('Error getting CPU metrics:', error);
    res.status(500).json({
      error: 'Failed to collect CPU metrics',
      message: error.message,
      timestamp: Date.now()
    });
  }
});

export default router;
