import os from 'os';
import fs from 'fs';

/**
 * Service for collecting and providing system metrics
 */
class MetricsService {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.interval = null;
    this.startTime = Date.now();
    this.metrics = {
      cpu: { usage: 0, cores: os.cpus().length, model: os.cpus()[0]?.model || 'Unknown' },
      memory: { total: 0, free: 0, used: 0, usagePercent: 0 },
      uptime: 0,
      serverUptime: 0,
      timestamp: Date.now()
    };
    this.tokenMetrics = {
      totalProcessed: 0,
      inputTokens: 0,
      outputTokens: 0,
      byModel: {},
      timestamp: Date.now()
    };
    console.log('📊 MetricsService initialized');
  }

  /**
   * Start collecting metrics at regular intervals
   */
  start() {
    if (this.isRunning) {
      console.log('📊 MetricsService is already running');
      return;
    }
    
    this.isRunning = true;
    console.log('📊 MetricsService started');
    
    // Collect metrics immediately
    this.collectMetrics();
    
    // Then collect them periodically
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop collecting metrics
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('📊 MetricsService stopped');
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    try {
      // CPU usage is tricky to calculate accurately in Node.js without external libraries
      // This is a simple approximation
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }
      
      // Calculate CPU usage as a percentage (1 - idle/total)
      const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);
      
      // Memory metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePercent = Math.round((usedMem / totalMem) * 100);
      
      // Update metrics
      this.metrics = {
        cpu: { 
          usage: isNaN(cpuUsage) ? 0 : cpuUsage,
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown'
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: usedMem,
          usagePercent: memUsagePercent
        },
        uptime: Math.floor(os.uptime()),
        serverUptime: Math.floor((Date.now() - this.startTime) / 1000),
        timestamp: Date.now()
      };
      
      // Emit metrics via socket.io if available
      if (this.io) {
        this.io.emit('metrics', this.metrics);
      }
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  /**
   * Get current metrics
   * @returns {Object} Current system metrics
   */
  getMetrics() {
    console.log('📊 Returning current metrics');
    return this.metrics;
  }

  /**
   * Update token metrics
   * @param {Object} data - Token usage data
   */
  updateTokenMetrics(data) {
    try {
      const { model, total, input, output } = data;
      
      // Update total token counts
      this.tokenMetrics.totalProcessed += total;
      this.tokenMetrics.inputTokens += input;
      this.tokenMetrics.outputTokens += output;
      
      // Update per-model statistics
      if (model) {
        if (!this.tokenMetrics.byModel[model]) {
          this.tokenMetrics.byModel[model] = 0;
        }
        this.tokenMetrics.byModel[model] += total;
      }
      
      this.tokenMetrics.timestamp = Date.now();
      
      // Emit token metrics via socket.io if available
      if (this.io) {
        this.io.emit('token_metrics', this.tokenMetrics);
      }
    } catch (error) {
      console.error('Error updating token metrics:', error);
    }
  }

  /**
   * Get current token metrics
   * @returns {Object} Current token metrics
   */
  getTokenMetrics() {
    console.log('📊 Returning token metrics');
    return this.tokenMetrics;
  }
}

// Create a global instance
const globalMetricsService = new MetricsService();

export { MetricsService, globalMetricsService };
export default MetricsService;
