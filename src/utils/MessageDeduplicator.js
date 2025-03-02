/**
 * MessageDeduplicator - Utility to prevent duplicate log messages
 * Tracks message signatures and suppresses repetitive logs
 */
class MessageDeduplicator {
  constructor() {
    this.recentMessages = new Map();
    this.configuredThresholds = {
      "default": 60000, // 1 minute default
      "model-available": 300000, // 5 minutes
      "connection-success": 300000, // 5 minutes
      "model-list": 300000, // 5 minutes
      "settings-check": 120000, // 2 minutes
      "llm-config-check": 180000, // 3 minutes
      "connection-test": 240000, // 4 minutes
      "cached-settings": 600000, // 10 minutes
    };
    
    // Categories to completely disable
    this.disabledCategories = new Set([
      // Uncomment these lines to completely disable these log categories
      // 'settings-check',
      // 'model-list',
    ]);
    
    // Set to track suppressed messages with counts
    this.suppressedMessages = new Map();
    
    // Clean up old messages every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }
  
  /**
   * Check if a message should be logged based on recency and type
   * @param {string} category - Message category
   * @param {string} message - The message content
   * @param {object} data - Associated data
   * @returns {boolean} - True if message should be logged, false if suppressed
   */
  shouldLog(category, message, data = null) {
    // First check if this category is disabled entirely
    if (this.disabledCategories.has(category)) {
      return false;
    }
    
    // Create a signature for this message
    const signature = this.createSignature(category, message, data);
    
    // Get the appropriate threshold based on category
    const threshold = this.configuredThresholds[category] || this.configuredThresholds.default;
    
    const now = Date.now();
    const lastSeen = this.recentMessages.get(signature);
    
    if (lastSeen && now - lastSeen < threshold) {
      // Update suppression count
      const count = this.suppressedMessages.get(signature) || 0;
      this.suppressedMessages.set(signature, count + 1);
      return false;
    }
    
    // Update the last seen time
    this.recentMessages.set(signature, now);
    
    // If we previously suppressed this message, log a summary
    if (this.suppressedMessages.has(signature)) {
      const count = this.suppressedMessages.get(signature);
      console.log(`[MessageDeduplicator] Suppressed ${count} similar "${category}" messages in the last ${threshold/1000} seconds`);
      this.suppressedMessages.delete(signature);
    }
    
    return true;
  }
  
  /**
   * Create a unique signature for a message
   * @private
   */
  createSignature(category, message, data) {
    // For certain categories, only consider the general pattern, not specific data values
    if (category === 'model-available') {
      // For model availability checks, ignore specific model names
      return `${category}:Model available in LM Studio`;
    }
    
    if (category === 'connection-success') {
      // For connection success, ignore specifics of response content
      return `${category}:LM Studio connection successful`;
    }
    
    if (category === 'model-list') {
      // Don't log the models themselves, just the count
      return `${category}:${message}`;
    }
    
    if (category === 'settings-check') {
      // For settings checks, ignore the specific settings object
      return `${category}:settings check`;
    }
    
    if (category === 'llm-config-check') {
      // For LLM configuration checks
      return `${category}:llm configuration check`;
    }
    
    if (category === 'connection-test') {
      // For connection testing, normalize by removing specifics
      return `${category}:connection test`;
    }
    
    if (category === 'cached-settings') {
      // For cached settings messages
      return `${category}:cached settings`;
    }
    
    // By default, use the category and message as the signature
    return `${category}:${message}`;
  }
  
  /**
   * Clean up old message records
   * @private
   */
  cleanup() {
    const now = Date.now();
    const oldestThreshold = Math.max(...Object.values(this.configuredThresholds));
    
    // Remove entries older than the maximum threshold
    for (const [signature, timestamp] of this.recentMessages.entries()) {
      if (now - timestamp > oldestThreshold) {
        this.recentMessages.delete(signature);
      }
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Export singleton instance
const messageDeduplicator = new MessageDeduplicator();
export default messageDeduplicator;
