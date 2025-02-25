// Action Types
export const ADD_LOG = 'ADD_LOG';
export const CLEAR_LOGS = 'CLEAR_LOGS';
export const SET_LOG_FILTER = 'SET_LOG_FILTER';

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Log Categories
export const LOG_CATEGORIES = {
  SYSTEM: 'system',
  WEBSOCKET: 'websocket',
  API: 'api',
  AGENT: 'agent',
  TASK: 'task',
  SETTINGS: 'settings'
};

// Log rate limiting
// Stores the most recent log entries to prevent duplicates
const logRateLimiter = {
  // Recent logs map: key is message+category, value is {count, timestamp, id}
  recentLogs: new Map(),
  // How long to consider logs as "recent" (in ms)
  rateLimitWindow: 5000,
  // Maximum number of identical logs to allow in the window
  maxLogsPerWindow: {
    [LOG_LEVELS.ERROR]: 5,   // Allow more error logs
    [LOG_LEVELS.WARN]: 3,
    [LOG_LEVELS.INFO]: 2,
    [LOG_LEVELS.DEBUG]: 1
  },
  // Clean up recent logs periodically
  cleanupInterval: null
};

// Counter to ensure unique IDs even when created at the same millisecond
let logIdCounter = 0;

/**
 * Generate a unique ID for logs
 * @returns {string} A unique ID combining timestamp and counter
 */
const generateUniqueId = () => {
  const timestamp = Date.now();
  logIdCounter = (logIdCounter + 1) % 1000; // Reset counter after 999 to keep IDs short
  return `${timestamp}-${logIdCounter}`;
};

/**
 * Clean up old entries from the rate limiter
 */
const cleanupRateLimiter = () => {
  const now = Date.now();
  let removed = 0;
  
  for (const [key, entry] of logRateLimiter.recentLogs.entries()) {
    if (now - entry.timestamp > logRateLimiter.rateLimitWindow) {
      logRateLimiter.recentLogs.delete(key);
      removed++;
    }
  }
  
  // If debugging is on, log the cleanup
  if (removed > 0 && process.env.NODE_ENV !== 'production') {
    console.debug(`Cleaned up ${removed} old log rate limit entries`);
  }
};

// Start the cleanup interval when the module loads
if (!logRateLimiter.cleanupInterval) {
  logRateLimiter.cleanupInterval = setInterval(cleanupRateLimiter, 30000);
}

/**
 * Check if a log should be rate-limited
 * @param {string} level - Log level
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @returns {boolean} - Whether the log should be rate-limited
 */
const shouldRateLimitLog = (level, category, message) => {
  // Always log error level messages
  if (level === LOG_LEVELS.ERROR) {
    return false;
  }
  
  // Create a key for this log message
  const key = `${level}:${category}:${message}`;
  const now = Date.now();
  
  // Get or create the entry for this key
  const entry = logRateLimiter.recentLogs.get(key) || { count: 0, timestamp: now };
  
  // Check if this log should be rate limited
  if (entry.count >= logRateLimiter.maxLogsPerWindow[level]) {
    // Update the count but don't update the timestamp to maintain the window
    entry.count++;
    logRateLimiter.recentLogs.set(key, entry);
    return true;
  }
  
  // Not rate limited, update the entry
  entry.count++;
  entry.timestamp = now;
  logRateLimiter.recentLogs.set(key, entry);
  return false;
};

// Action Creators
export const addLog = (log) => ({
  type: ADD_LOG,
  payload: {
    ...log,
    timestamp: new Date().toISOString(),
    id: generateUniqueId()
  }
});

export const clearLogs = () => ({
  type: CLEAR_LOGS
});

export const setLogFilter = (filters) => ({
  type: SET_LOG_FILTER,
  payload: filters
});

// Utility function to create logs
export const createLog = (level, category, message, details = null) => ({
  level,
  category,
  message,
  details,
  timestamp: new Date().toISOString(),
  id: generateUniqueId()
});

// Thunk Actions
export const logError = (category, message, error = null) => (dispatch) => {
  // Errors are always logged, but we'll group similar errors
  const errorKey = `${LOG_LEVELS.ERROR}:${category}:${message}`;
  const entry = logRateLimiter.recentLogs.get(errorKey);
  
  if (entry && entry.count > 1) {
    // If we have multiple similar errors, add a count to the message
    const enhancedMessage = `${message} (${entry.count + 1} occurrences)`;
    entry.count++;
    logRateLimiter.recentLogs.set(errorKey, entry);
    
    dispatch(addLog({
      level: LOG_LEVELS.ERROR,
      category,
      message: enhancedMessage,
      details: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null
    }));
  } else {
    // First occurrence or below threshold
    logRateLimiter.recentLogs.set(errorKey, { count: 1, timestamp: Date.now() });
    
    dispatch(addLog({
      level: LOG_LEVELS.ERROR,
      category,
      message,
      details: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null
    }));
  }
};

export const logWarning = (category, message, details = null) => (dispatch) => {
  // Check if this warning should be rate limited
  if (shouldRateLimitLog(LOG_LEVELS.WARN, category, message)) {
    return;
  }
  
  dispatch(addLog({
    level: LOG_LEVELS.WARN,
    category,
    message,
    details
  }));
};

export const logInfo = (category, message, details = null) => (dispatch) => {
  // Check if this info should be rate limited
  if (shouldRateLimitLog(LOG_LEVELS.INFO, category, message)) {
    return;
  }
  
  dispatch(addLog({
    level: LOG_LEVELS.INFO,
    category,
    message,
    details
  }));
};

export const logDebug = (category, message, details = null) => (dispatch) => {
  // Check if this debug message should be rate limited
  if (shouldRateLimitLog(LOG_LEVELS.DEBUG, category, message)) {
    return;
  }
  
  dispatch(addLog({
    level: LOG_LEVELS.DEBUG,
    category,
    message,
    details
  }));
};
