// Action Types
export const ADD_LOG = 'ADD_LOG';
export const CLEAR_LOGS = 'CLEAR_LOGS';
export const SET_LOG_FILTER = 'SET_LOG_FILTER';

// Log Levels Constants
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// Log Categories
export const LOG_CATEGORIES = {
  SYSTEM: 'system',
  AGENT: 'agent',
  API: 'api',
  WORKFLOW: 'workflow',
  USER: 'user'
};

// Create a log entry with the given level
const createLog = (level, message, category = LOG_CATEGORIES.SYSTEM, meta = {}) => ({
  type: ADD_LOG,
  payload: {
    timestamp: new Date().toISOString(),
    level,
    message,
    category,
    meta
  }
});

// Log action creators
export const logDebug = (message, category, meta) => 
  createLog(LOG_LEVELS.DEBUG, message, category, meta);

export const logInfo = (message, category, meta) => 
  createLog(LOG_LEVELS.INFO, message, category, meta);

export const logWarning = (message, category, meta) => 
  createLog(LOG_LEVELS.WARN, message, category, meta);

export const logError = (message, category, meta) => 
  createLog(LOG_LEVELS.ERROR, message, category, meta);

// Clear all logs
export const clearLogs = () => ({
  type: CLEAR_LOGS
});

// Set log filter options
export const setLogFilter = (filter) => ({
  type: SET_LOG_FILTER,
  payload: filter
});
