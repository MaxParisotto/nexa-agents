/**
 * Client-side utility functions
 */

/**
 * Format a date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  return new Date(date).toLocaleDateString(undefined, mergedOptions);
}

/**
 * Format a date to include time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date with time
 */
export function formatDateTime(date) {
  if (!date) return 'N/A';
  
  return formatDate(date, {
    hour: '2-digit', 
    minute: '2-digit'
  });
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parse API error response
 * @param {Error|Response|Object|string} error - Error to parse
 * @returns {string} Error message
 */
export function parseApiError(error) {
  if (!error) return 'Unknown error occurred';
  
  // Handle string errors
  if (typeof error === 'string') return error;
  
  // Handle Error objects
  if (error instanceof Error) return error.message;
  
  // Handle API response errors
  if (error.response) {
    // Axios error format
    const { response } = error;
    
    // Try to get error message from response data
    if (response.data && response.data.message) {
      return response.data.message;
    }
    
    if (response.data && response.data.error) {
      return response.data.error;
    }
    
    // Fallback to status text
    return `Error ${response.status}: ${response.statusText || 'Unknown error'}`;
  }
  
  // Handle fetch API Response objects
  if (error.status && typeof error.json === 'function') {
    return `Error ${error.status}: ${error.statusText || 'Unknown error'}`;
  }
  
  // Handle object with message
  if (error.message) return error.message;
  
  // Fallback
  try {
    return JSON.stringify(error);
  } catch (e) {
    return 'Unknown error occurred';
  }
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Safely parse JSON
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
}

/**
 * Delay execution for a specified time
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
