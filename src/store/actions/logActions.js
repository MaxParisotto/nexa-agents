// Log categories
export const LOG_CATEGORIES = {
  SYSTEM: 'SYSTEM',
  UI: 'UI',
  NETWORK: 'NETWORK',
  WORKFLOW: 'WORKFLOW',
  CONFIG: 'CONFIG',
  LLM: 'LLM'
};

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Log action types
export const ADD_LOG = 'ADD_LOG';
export const CLEAR_LOGS = 'CLEAR_LOGS';
export const FILTER_LOGS = 'FILTER_LOGS';

/**
 * Create a log entry with current timestamp
 */
const createLogEntry = (level, category, message, data = null) => {
  return {
    timestamp: new Date().toISOString(), // Always use current time
    level,
    category,
    message,
    data
  };
};

/**
 * Add a log entry
 */
export const addLog = (level, category, message, data = null) => {
  return {
    type: ADD_LOG,
    payload: createLogEntry(level, category, message, data)
  };
};

/**
 * Add a debug log entry
 */
export const logDebug = (category, message, data = null) => {
  return addLog(LOG_LEVELS.DEBUG, category, message, data);
};

/**
 * Add an info log entry
 */
export const logInfo = (category, message, data = null) => {
  return addLog(LOG_LEVELS.INFO, category, message, data);
};

/**
 * Add a warning log entry
 */
export const logWarning = (category, message, data = null) => {
  return addLog(LOG_LEVELS.WARN, category, message, data);
};

/**
 * Add an error log entry
 */
export const logError = (category, message, data = null) => {
  return addLog(LOG_LEVELS.ERROR, category, message, data);
};

/**
 * Clear all logs
 */
export const clearLogs = () => {
  return {
    type: CLEAR_LOGS
  };
};

/**
 * Filter logs by level and/or category
 */
export const filterLogs = (levels = null, categories = null) => {
  return {
    type: FILTER_LOGS,
    payload: {
      levels,
      categories
    }
  };
};
