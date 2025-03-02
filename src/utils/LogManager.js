import store from '../store';
import { logDebug, logInfo, logWarning, logError, LOG_CATEGORIES } from '../store/actions/logActions';

/**
 * Centralized logging utility
 * Logs to console and Redux store with consistent formatting
 */
class LogManager {
  /**
   * Log a debug message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  static debug(category, message, data = null) {
    console.debug(`[${category}] ${message}`, data || '');
    store.dispatch(logDebug(category, message, data));
  }
  
  /**
   * Log an info message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  static info(category, message, data = null) {
    console.info(`[${category}] ${message}`, data || '');
    store.dispatch(logInfo(category, message, data));
  }
  
  /**
   * Log a warning message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  static warn(category, message, data = null) {
    console.warn(`[${category}] ${message}`, data || '');
    store.dispatch(logWarning(category, message, data));
  }
  
  /**
   * Log an error message
   * @param {string} category - LOG_CATEGORIES enum value
   * @param {string} message - Log message
   * @param {any} data - Optional data to attach
   */
  static error(category, message, data = null) {
    console.error(`[${category}] ${message}`, data || '');
    store.dispatch(logError(category, message, data));
  }
  
  /**
   * Get all logs from the Redux store
   * Useful for exporting or displaying logs
   * @returns {Array} Array of log entries
   */
  static getAllLogs() {
    return store.getState().logs?.logs || [];
  }
  
  /**
   * Clear all logs
   */
  static clearLogs() {
    store.dispatch({ type: 'CLEAR_LOGS' });
  }
}

export default LogManager;
