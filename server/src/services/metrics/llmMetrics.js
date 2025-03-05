const logger = require('../../utils/logger').createLogger('llm-metrics');
const config = require('../config');

class LLMMetrics {
  constructor() {
    this.metrics = {
      totalTokens: 0,
      requestCount: 0,
      totalLatency: 0,
      tokensPerSecond: 0,
      costPerRequest: 0,
      totalCost: 0,
      modelUsage: new Map(),
      errors: 0
    };
    
    this.currentWindow = {
      startTime: Date.now(),
      tokens: 0
    };

    this.modelPricing = new Map();
    this.initializeModelPricing();
  }

  async initializeModelPricing() {
    // Get initial pricing from config service
    const pricing = await config.getConfig('llm-pricing') || {};
    this.updateModelPricing(pricing);

    // Watch for pricing updates
    config.watch('llm-pricing', (newPricing) => {
      this.updateModelPricing(newPricing);
      logger.info('LLM pricing updated:', newPricing);
    });
  }

  updateModelPricing(pricing) {
    this.modelPricing.clear();
    Object.entries(pricing).forEach(([model, rates]) => {
      this.modelPricing.set(model, rates);
    });
  }

  trackRequest(model, { inputTokens, outputTokens, startTime, endTime, error = null }) {
    const latency = endTime - startTime;
    const totalTokens = inputTokens + outputTokens;
    
    // Calculate exact cost based on token types
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    
    // Calculate tokens per second for this request
    const tokensPerSecond = latency > 0 ? totalTokens / (latency / 1000) : 0;

    // Update metrics
    this.metrics.totalTokens += totalTokens;
    this.metrics.requestCount++;
    this.metrics.totalLatency += latency;
    this.metrics.totalCost += cost;

    // Update model-specific metrics
    const modelStats = this.metrics.modelUsage.get(model) || {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalLatency: 0,
      totalCost: 0,
      averageLatency: 0,
      tokensPerSecond: 0,
      errors: 0
    };

    modelStats.requests++;
    modelStats.inputTokens += inputTokens;
    modelStats.outputTokens += outputTokens;
    modelStats.totalTokens += totalTokens;
    modelStats.totalLatency += latency;
    modelStats.totalCost += cost;
    modelStats.averageLatency = modelStats.totalLatency / modelStats.requests;
    modelStats.tokensPerSecond = (modelStats.totalTokens / modelStats.totalLatency) * 1000;
    
    if (error) {
      modelStats.errors++;
      this.trackError(model, error);
    }

    this.metrics.modelUsage.set(model, modelStats);

    // Update current window metrics for overall tokens/second calculation
    const now = Date.now();
    if (now - this.currentWindow.startTime >= 1000) {
      this.metrics.tokensPerSecond = this.currentWindow.tokens;
      this.currentWindow = {
        startTime: now,
        tokens: totalTokens
      };
    } else {
      this.currentWindow.tokens += totalTokens;
    }

    logger.debug('LLM request tracked:', {
      model,
      inputTokens,
      outputTokens,
      latency,
      cost,
      tokensPerSecond
    });

    return {
      cost,
      latency,
      tokensPerSecond
    };
  }

  calculateCost(model, inputTokens, outputTokens) {
    const pricing = this.modelPricing.get(model);
    if (!pricing) {
      logger.warn(`No pricing information for model ${model}, using default rates`);
      return this.calculateCost('gpt-3.5-turbo', inputTokens, outputTokens);
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return inputCost + outputCost;
  }

  getModelStats(model) {
    return this.metrics.modelUsage.get(model) || null;
  }

  trackError(model, error) {
    this.metrics.errors++;
    logger.error('LLM error:', { model, error });
  }

  async collect() {
    const averageLatency = this.metrics.requestCount > 0 
      ? this.metrics.totalLatency / this.metrics.requestCount 
      : 0;

    const averageCost = this.metrics.requestCount > 0
      ? this.metrics.totalCost / this.metrics.requestCount
      : 0;

    const metrics = {
      timestamp: new Date().toISOString(),
      totalTokens: this.metrics.totalTokens,
      requestCount: this.metrics.requestCount,
      averageLatency,
      tokensPerSecond: this.metrics.tokensPerSecond,
      averageCost,
      totalCost: this.metrics.totalCost,
      modelUsage: Object.fromEntries(this.metrics.modelUsage),
      errors: this.metrics.errors
    };

    // Add detailed model statistics
    metrics.models = {};
    for (const [model, stats] of this.metrics.modelUsage.entries()) {
      metrics.models[model] = {
        ...stats,
        contextWindow: this.modelPricing.get(model)?.contextWindow || 'unknown',
        pricing: this.modelPricing.get(model) || 'unknown'
      };
    }

    return metrics;
  }

  reset() {
    this.metrics = {
      totalTokens: 0,
      requestCount: 0,
      totalLatency: 0,
      tokensPerSecond: 0,
      costPerRequest: 0,
      totalCost: 0,
      modelUsage: new Map(),
      errors: 0
    };
  }
}

module.exports = LLMMetrics;
