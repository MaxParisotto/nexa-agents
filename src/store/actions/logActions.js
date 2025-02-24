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

// Action Creators
export const addLog = (log) => ({
  type: ADD_LOG,
  payload: {
    ...log,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
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
  id: Date.now().toString()
});

// Thunk Actions
export const logError = (category, message, error = null) => (dispatch) => {
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
};

export const logWarning = (category, message, details = null) => (dispatch) => {
  dispatch(addLog({
    level: LOG_LEVELS.WARN,
    category,
    message,
    details
  }));
};

export const logInfo = (category, message, details = null) => (dispatch) => {
  dispatch(addLog({
    level: LOG_LEVELS.INFO,
    category,
    message,
    details
  }));
};

export const logDebug = (category, message, details = null) => (dispatch) => {
  dispatch(addLog({
    level: LOG_LEVELS.DEBUG,
    category,
    message,
    details
  }));
};
