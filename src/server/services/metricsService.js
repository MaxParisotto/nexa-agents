import os from 'os';
import fs from 'fs';
import path from 'path'; // Add missing path import

// Try to import systeminformation but have a fallback if it's not available
let si;
try {
  si = await import('systeminformation');
} catch (e) {
  console.warn('systeminformation package not available, using fallback metrics collection');
  si = {
    currentLoad: async () => ({ currentLoad: Math.random() * 30 + 10 }),
    fsSize: async () => ([{ size: 1000000000, used: 500000000 }]),
    networkStats: async () => ([]),
    networkInterfaces: async () => ([]),
    cpuTemperature: async () => ({ main: 50 }),
    cpuSpeed: async () => ({ avg: 3000 })
  };
}

/**
 * Service for gathering and caching system metrics
 */
class MetricsService {
  constructor(io = null) {
    this.io = io;
    this.interval = null;
    this.metrics = {
      cpu: {
        usage: 0,
        cores: os.cpus().length,
        model: os.cpus()[0].model
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      uptime: os.uptime(),
      serverUptime: process.uptime(),
      timestamp: Date.now(),
      platform: os.platform(),
      hostname: os.hostname(),
      load: os.loadavg()
    };
    
    this.tokenMetrics = {
      totalProcessed: 0,
      inputTokens: 0,
      outputTokens: 0,
      byModel: {},
      timestamp: Date.now()
    };
    
    this.updateCounter = 0;
    this.updateInterval = 3000; // 3 seconds
    this.lastCpuInfo = null;
    
    // Create a cache directory if it doesn't exist
    this.cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Try to load cached metrics for initial values
    this.loadCachedMetrics();
  }
  
  /**
   * Start collecting metrics at regular intervals
   */
  start() {
    if (this.interval) return;
    
    // Collect metrics immediately
    this.collectMetrics();
    
    // Then collect at regular intervals
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, this.updateInterval);
    
    console.log(`Metrics service started, updating every ${this.updateInterval / 1000}s`);
    return this;
  }
  
  /**
   * Stop the metrics collection
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Metrics service stopped');
    }
    return this;
  }
  
  /**
   * Load previously cached metrics if available
   */
  loadCachedMetrics() {
    try {
      const metricsPath = path.join(this.cacheDir, 'metrics.json');
      const tokenPath = path.join(this.cacheDir, 'token_metrics.json');
      
      if (fs.existsSync(metricsPath)) {
        const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        this.metrics = { ...this.metrics, ...data };
      }
      
      if (fs.existsSync(tokenPath)) {
        const data = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        this.tokenMetrics = { ...this.tokenMetrics, ...data };
      }
    } catch (e) {
      console.error('Error loading cached metrics:', e);
    }
  }
  
  /**
   * Save metrics to cache
   */
  saveMetricsToCache() {
    try {
      fs.writeFileSync(
        path.join(this.cacheDir, 'metrics.json'),
        JSON.stringify(this.metrics),
        'utf8'
      );
      
      fs.writeFileSync(
        path.join(this.cacheDir, 'token_metrics.json'),
        JSON.stringify(this.tokenMetrics),
        'utf8'
      );
    } catch (e) {
      console.error('Error saving metrics to cache:', e);
    }
  }
  
  /**
   * Collect all system metrics
   */
  async collectMetrics() {
    try {
      // Only do full update every 3rd time to reduce CPU usage
      // (some metrics are expensive to calculate)
      const isFullUpdate = this.updateCounter % 3 === 0;
      this.updateCounter++;
      
      // Get CPU usage using systeminformation
      const cpuData = await si.currentLoad();
      
      // Update metrics object with new values
      this.metrics.cpu.usage = parseFloat(cpuData.currentLoad.toFixed(1));
      this.metrics.memory.free = os.freemem();
      this.metrics.memory.total = os.totalmem();
      this.metrics.memory.used = os.totalmem() - os.freemem();
      this.metrics.memory.usagePercent = parseFloat(((this.metrics.memory.used / this.metrics.memory.total) * 100).toFixed(1));
      this.metrics.uptime = os.uptime();
      this.metrics.serverUptime = process.uptime();
      this.metrics.timestamp = Date.now();
      this.metrics.load = os.loadavg();
      
      // Do more expensive operations only on full updates
      if (isFullUpdate) {
        // Get disk information
        try {
          const diskData = await si.fsSize();
          let totalSize = 0;
          let totalUsed = 0;
          
          diskData.forEach(disk => {
            totalSize += disk.size;
            totalUsed += disk.used;
          });
          
          this.metrics.disk = {
            total: totalSize,
            used: totalUsed,
            free: totalSize - totalUsed,
            usagePercent: parseFloat(((totalUsed / totalSize) * 100).toFixed(1))
          };
        } catch (e) {
          console.error('Error getting disk info:', e);
        }
        
        // Get network interfaces and their stats
        try {
          const networkStats = await si.networkStats();
          const interfaces = await si.networkInterfaces();
          
          this.metrics.network = {
            interfaces: interfaces.map(i => ({ 
              name: i.iface, 
              ip: i.ip4 
            })),
            stats: networkStats.map(s => ({
              interface: s.iface,
              rx: s.rx_bytes,
              tx: s.tx_bytes,
              rxSec: s.rx_sec,
              txSec: s.tx_sec
            }))
          };
        } catch (e) {
          console.error('Error getting network info:', e);
        }
        
        // Save metrics to cache on full updates
        this.saveMetricsToCache();
      }
      
      // Emit updated metrics via Socket.IO if available
      if (this.io) {
        this.io.emit('metrics_update', this.metrics);
      }
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }
  
  /**
   * Get current metrics
   * @returns {Object} The current metrics
   */
  getMetrics() {
    return this.metrics;
  }
  
  /**
   * Get token metrics
   * @returns {Object} Current token metrics
   */
  getTokenMetrics() {
    return this.tokenMetrics;
  }
  
  /**
   * Update token metrics
   * @param {Object} data Token usage data to add
   */
  updateTokenMetrics(data) {
    // Increment counters
    this.tokenMetrics.totalProcessed += data.total || 0;
    this.tokenMetrics.inputTokens += data.input || 0;
    this.tokenMetrics.outputTokens += data.output || 0;
    this.tokenMetrics.timestamp = Date.now();
    
    // Update by model
    if (data.model) {
      if (!this.tokenMetrics.byModel[data.model]) {
        this.tokenMetrics.byModel[data.model] = 0;
      }
      this.tokenMetrics.byModel[data.model] += data.total || 0;
    }
    
    // Save updated token metrics
    this.saveMetricsToCache();
    
    // Emit via Socket.IO if available
    if (this.io) {
      this.io.emit('token_metrics_update', this.tokenMetrics);
    }
  }
}

export default MetricsService;
