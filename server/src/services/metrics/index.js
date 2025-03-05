const logger = require('../../utils/logger').createLogger('metrics');
const NetworkMetrics = require('./networkMetrics');
const LLMMetrics = require('./llmMetrics');
const SystemMetrics = require('./systemMetrics');

class MetricsService {
  constructor() {
    this.networkMetrics = new NetworkMetrics();
    this.llmMetrics = new LLMMetrics();
    this.systemMetrics = new SystemMetrics();
    this.metricsInterval = null;
    this.collectionFrequency = 5000; // 5 seconds
  }

  initialize(io) {
    this.io = io;
    this.startMetricsCollection();
    this.setupSocketHandlers();
    return Promise.resolve();
  }

  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.collectionFrequency);
  }

  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        network: await this.networkMetrics.collect(),
        llm: await this.llmMetrics.collect(),
        system: await this.systemMetrics.collect()
      };

      logger.debug('Metrics collected:', metrics);
      this.io?.emit('metrics_update', metrics);
      
      // Store metrics for historical analysis
      await this.storeMetrics(metrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  setupSocketHandlers() {
    this.io?.on('connection', (socket) => {
      socket.on('get_metrics', async (type) => {
        try {
          let metrics;
          switch (type) {
            case 'network':
              metrics = await this.networkMetrics.collect();
              break;
            case 'llm':
              metrics = await this.llmMetrics.collect();
              break;
            case 'system':
              metrics = await this.systemMetrics.collect();
              break;
            default:
              metrics = await this.collectMetrics();
          }
          socket.emit('metrics_response', metrics);
        } catch (error) {
          logger.error('Error fetching metrics:', error);
          socket.emit('metrics_error', { error: error.message });
        }
      });
    });
  }

  async storeMetrics(metrics) {
    // TODO: Implement metrics storage (database/file system)
  }

  stop() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

module.exports = new MetricsService();
