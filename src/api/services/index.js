import MetricsService from './metricsService.js';
import path from 'path';

// Create a global instance of the metrics service
const globalMetricsService = new MetricsService();

// Export services
export {
  globalMetricsService,
  MetricsService
};
