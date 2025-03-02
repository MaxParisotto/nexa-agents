import axios from 'axios';

/**
 * Check if the backend server is running
 * @returns {Promise<boolean>} True if server is running, false otherwise
 */
export const isServerRunning = async () => {
  try {
    // Try a lightweight endpoint for minimal overhead
    const response = await axios.get('/api/test/ping', { 
      timeout: 3000,
      // Don't throw errors on bad status
      validateStatus: () => true
    });
    
    return response.status === 200;
  } catch (error) {
    console.log('Server connection check failed:', error.message);
    return false;
  }
};

/**
 * Enhanced server status check with detailed information
 * @returns {Promise<Object>} Status object with details about server state
 */
export const checkServerStatus = async () => {
  try {
    const response = await axios.get('/api/status', { 
      timeout: 3000,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      return {
        online: true,
        status: response.status,
        services: response.data?.services || {},
        uptime: response.data?.uptime,
        message: 'Server is online'
      };
    } else {
      return {
        online: false,
        status: response.status,
        message: `Server responded with status: ${response.status}`
      };
    }
  } catch (error) {
    return {
      online: false,
      status: null,
      error: error.message || 'Unknown error',
      message: 'Server is offline'
    };
  }
};

export default { isServerRunning, checkServerStatus };