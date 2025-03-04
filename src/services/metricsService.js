const { EventEmitter } = require("events");
const { createLogger } = require("../utils/logger.js");
const fetch = require('node-fetch');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Default metrics gateway URL
const METRICS_GATEWAY_URL = process.env.METRICS_GATEWAY_URL || 'http://localhost:3005';

// Data directory for metrics history
const DATA_DIR = path.join(__dirname, '../../../data');
const METRICS_DIR = path.join(DATA_DIR, 'metrics');

// Ensure directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

class MetricsService extends EventEmitter {
  constructor() {
    super();
    this.logger = createLogger('MetricsService');
    this.metrics = new Map();
  }

  trackMetric(name, value) {
    this.metrics.set(name, value);
    this.emit('metricUpdated', { name, value });
    this.logger.debug(`Tracked metric: ${name} = ${value}`);
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  clearMetrics() {
    this.metrics.clear();
    this.emit('metricsCleared');
    this.logger.debug('Cleared all metrics');
  }
}

// Get system metrics
async function getSystemMetrics() {
  try {
    // Try to get metrics from the Rust metrics service
    const response = await fetch(`${METRICS_GATEWAY_URL}/api/metrics/system`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
    }
    
    const metrics = await response.json();
    
    // Store metrics history
    saveMetricsSnapshot(metrics);
    
    return metrics;
  } catch (error) {
    console.error('Error fetching metrics from gateway, falling back to Node.js metrics:', error);
    
    // Fallback to Node.js metrics
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;
    
    const metrics = {
      cpu_usage: cpuUsage,
      memory_used: os.totalmem() - os.freemem(),
      memory_total: os.totalmem(),
      uptime: os.uptime(),
      processes: process.pid
    };
    
    // Store metrics history
    saveMetricsSnapshot(metrics);
    
    return metrics;
  }
}

// Get agent performance metrics
async function getAgentMetrics(agentId) {
  // For now, return mock data. In a real implementation,
  // this would query agent-specific metrics from a database or monitoring system
  return {
    cpu_usage: Math.random() * 30,
    memory_used: Math.random() * 500 * 1024 * 1024,
    tasks_completed: Math.floor(Math.random() * 100),
    uptime: Math.floor(Math.random() * 24 * 60 * 60)
  };
}

// Get token usage metrics
function getTokenMetrics() {
  // Try to load from persistent storage
  try {
    const filePath = path.join(METRICS_DIR, 'token-metrics.json');
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Update the data with some randomness
      data.used = Math.min(data.available, data.used + Math.floor(Math.random() * 1000));
      data.updated = new Date().toISOString();
      
      // Save back to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      return data;
    }
  } catch (error) {
    console.error('Error reading token metrics file:', error);
  }
  
  // Generate default data
  const data = {
    used: Math.floor(Math.random() * 100000),
    available: 1000000,
    updated: new Date().toISOString()
  };
  
  // Save to file
  try {
    fs.writeFileSync(
      path.join(METRICS_DIR, 'token-metrics.json'), 
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error('Error writing token metrics file:', error);
  }
  
  return data;
}

// Save metrics snapshot for historical data
function saveMetricsSnapshot(metrics) {
  const timestamp = new Date();
  const hourlyFile = path.join(
    METRICS_DIR, 
    `metrics-${timestamp.toISOString().split('T')[0]}.json`
  );
  
  try {
    // Load or initialize hourly metrics
    let hourlyMetrics = [];
    if (fs.existsSync(hourlyFile)) {
      hourlyMetrics = JSON.parse(fs.readFileSync(hourlyFile, 'utf8'));
    }
    
    // Add new data point with timestamp
    hourlyMetrics.push({
      timestamp: timestamp.toISOString(),
      ...metrics
    });
    
    // Limit to 1440 data points (24 hours with 1-minute intervals)
    if (hourlyMetrics.length > 1440) {
      hourlyMetrics = hourlyMetrics.slice(hourlyMetrics.length - 1440);
    }
    
    // Save back to file
    fs.writeFileSync(hourlyFile, JSON.stringify(hourlyMetrics, null, 2));
  } catch (error) {
    console.error('Error saving metrics snapshot:', error);
  }
}

// Get historical metrics
function getHistoricalMetrics(days = 1) {
  const metrics = [];
  const today = new Date();
  
  // Collect data for the requested number of days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    const fileName = `metrics-${date.toISOString().split('T')[0]}.json`;
    const filePath = path.join(METRICS_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        metrics.push(...data);
      } catch (error) {
        console.error(`Error reading metrics file ${fileName}:`, error);
      }
    }
  }
  
  return metrics;
}

// Create a singleton instance
const metricsService = new MetricsService();

// Export both the singleton instance and a named export
module.exports = metricsService;
module.exports.globalMetricsService = metricsService;
