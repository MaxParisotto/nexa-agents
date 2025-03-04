/**
 * Centralized logging utility
 * Logs to console and Redux store with consistent formatting
 */
class LogManager {
  static instance = null;
  static logs = [];
  static maxLogs = 1000;
  static listeners = [];

  /**
   * Get singleton instance
   * @returns {LogManager}
   */
  static getInstance() {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  /**
   * Add a log entry
   * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
   * @param {string} category - Log category
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   * @private
   */
  _addLog(level, category, message, data = null) {
    const logEntry = {
      level,
      category,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Add to internal logs array
    LogManager.logs.unshift(logEntry);
    
    // Trim logs if exceeding max size
    if (LogManager.logs.length > LogManager.maxLogs) {
      LogManager.logs = LogManager.logs.slice(0, LogManager.maxLogs);
    }

    // Notify listeners
    LogManager.listeners.forEach(listener => listener(logEntry));

    return logEntry;
  }

  /**
   * Log a debug message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  debug(category, message, data = null) {
    console.debug(`[${category}] ${message}`, data || '');
    return this._addLog('DEBUG', category, message, data);
  }
  
  /**
   * Log an info message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  info(category, message, data = null) {
    console.info(`[${category}] ${message}`, data || '');
    return this._addLog('INFO', category, message, data);
  }
  
  /**
   * Log a warning message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  warn(category, message, data = null) {
    console.warn(`[${category}] ${message}`, data || '');
    return this._addLog('WARN', category, message, data);
  }
  
  /**
   * Log an error message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  error(category, message, data = null) {
    console.error(`[${category}] ${message}`, data || '');
    return this._addLog('ERROR', category, message, data);
  }
  
  /**
   * Get all logs
   * @returns {Array} Array of log entries
   */
  getAllLogs() {
    return [...LogManager.logs];
  }
  
  /**
   * Clear all logs
   */
  clearLogs() {
    LogManager.logs = [];
    LogManager.listeners.forEach(listener => listener(null, 'clear'));
  }

  /**
   * Add a listener for log updates
   * @param {Function} listener - Callback function
   * @returns {Function} Function to remove the listener
   */
  addListener(listener) {
    LogManager.listeners.push(listener);
    return () => {
      LogManager.listeners = LogManager.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Filter logs by criteria
   * @param {Object} filters - Filter criteria
   * @param {Array} filters.levels - Array of log levels to include
   * @param {Array} filters.categories - Array of categories to include
   * @param {string} filters.search - Search text
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @returns {Array} Filtered logs
   */
  filterLogs(filters = {}) {
    return LogManager.logs.filter(log => {
      // Apply level filter
      if (filters.levels && filters.levels.length > 0 && !filters.levels.includes(log.level)) {
        return false;
      }
      
      // Apply category filter
      if (filters.categories && filters.categories.length > 0 && !filters.categories.includes(log.category)) {
        return false;
      }
      
      // Apply search filter
      if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Apply date filters
      if (filters.startDate) {
        const logDate = new Date(log.timestamp);
        if (logDate < filters.startDate) {
          return false;
        }
      }
      
      if (filters.endDate) {
        const logDate = new Date(log.timestamp);
        if (logDate > filters.endDate) {
          return false;
        }
      }
      
      return true;
    });
  }
}

// Log categories
export const LOG_CATEGORIES = {
  SYSTEM: 'SYSTEM',
  APPLICATION: 'APPLICATION',
  NETWORK: 'NETWORK',
  API: 'API',
  DATABASE: 'DATABASE',
  WORKFLOW: 'WORKFLOW',
  AGENT: 'AGENT',
  LLM: 'LLM',
  SECURITY: 'SECURITY',
  USER: 'USER'
};

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Export singleton instance
export default LogManager.getInstance();
