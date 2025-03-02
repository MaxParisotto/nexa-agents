// Log action types - Add these missing constants
export const LOG_INFO = 'LOG_INFO';
export const LOG_WARNING = 'LOG_WARNING';
export const LOG_ERROR = 'LOG_ERROR';
export const LOG_DEBUG = 'LOG_DEBUG';

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

// Log action types - Existing ones
export const ADD_LOG = 'ADD_LOG';
export const CLEAR_LOGS = 'CLEAR_LOGS';
export const FILTER_LOGS = 'FILTER_LOGS';
export const UPDATE_LOG_SETTINGS = 'UPDATE_LOG_SETTINGS';

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
  return {
    type: LOG_DEBUG, // Use the constant here
    payload: createLogEntry(LOG_LEVELS.DEBUG, category, message, data)
  };
};

/**
 * Add an info log entry
 */
export const logInfo = (category, message, data = null) => {
  return {
    type: LOG_INFO, // Use the constant here
    payload: createLogEntry(LOG_LEVELS.INFO, category, message, data)
  };
};

/**
 * Add a warning log entry
 */
export const logWarning = (category, message, data = null) => {
  return {
    type: LOG_WARNING, // Use the constant here
    payload: createLogEntry(LOG_LEVELS.WARN, category, message, data)
  };
};

/**
 * Add an error log entry
 */
export const logError = (category, message, data = null) => {
  return {
    type: LOG_ERROR, // Use the constant here
    payload: createLogEntry(LOG_LEVELS.ERROR, category, message, data)
  };
};

/**
 * Clear all logs
 */
export const clearLogs = () => {
  return (dispatch) => {
    dispatch({
      type: CLEAR_LOGS
    });
    
    // Add a single log entry to show logs were cleared
    dispatch(logInfo(LOG_CATEGORIES.SYSTEM, 'Logs cleared by user'));
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

/**
 * Update log settings
 * @param {Object} settings - Log settings configuration
 */
export const updateLogSettings = (settings) => {
  return (dispatch) => {
    // Save to localStorage for persistence
    try {
      localStorage.setItem('logSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving log settings:', error);
    }

    // Dispatch the action to update Redux state
    dispatch({
      type: UPDATE_LOG_SETTINGS,
      payload: settings
    });
    
    // Log the settings update
    dispatch(logInfo(LOG_CATEGORIES.SYSTEM, 'Log settings updated', {
      settings: {
        logLevel: settings.logLevel,
        maxLogEntries: settings.maxLogEntries,
        enableFileLogging: settings.enableFileLogging
      }
    }));
  };
};
