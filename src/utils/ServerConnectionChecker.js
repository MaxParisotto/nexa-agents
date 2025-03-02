/**
 * Utility functions to check LLM server connections
 */
import axios from 'axios';

/**
 * Check if LM Studio server is responding
 * @param {string} apiUrl - LM Studio API URL
 * @returns {Promise<Object>} - Status object
 */
export const checkLmStudioConnection = async (apiUrl = 'http://localhost:1234') => {
  try {
    // Ensure URL starts with http
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    const cleanUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    
    // First check if server responds at all
    try {
      await axios.get(cleanUrl, { timeout: 2000 });
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
        return {
          status: 'unavailable',
          message: 'LM Studio server is not running or not accessible',
          helpText: [
            'Ensure LM Studio application is running',
            'Check that the API server is enabled in LM Studio settings',
            'Verify the API URL is correct in your settings'
          ],
          error: error.message
        };
      }
    }

    // Check models endpoint
    const modelsResponse = await axios.get(`${cleanUrl}/v1/models`, { 
      timeout: 3000,
      validateStatus: () => true // Accept any status
    });

    if (modelsResponse.status === 200) {
      const models = modelsResponse.data?.data?.map(model => model.id) || [];
      return {
        status: 'available',
        message: `LM Studio is running with ${models.length} models available`,
        models,
        apiUrl: cleanUrl
      };
    } else {
      // Server is running but endpoint not available
      return {
        status: 'endpoint_missing',
        message: 'LM Studio is running but API endpoints are not accessible',
        helpText: [
          'Ensure API server is enabled in LM Studio settings',
          'Check that the correct API URL is configured',
          'Restart LM Studio if the problem persists'
        ],
        statusCode: modelsResponse.status,
        apiUrl: cleanUrl
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Error connecting to LM Studio: ${error.message}`,
      error: error.message,
      apiUrl
    };
  }
};

/**
 * Check if Ollama server is responding
 * @param {string} apiUrl - Ollama API URL
 * @returns {Promise<Object>} - Status object
 */
export const checkOllamaConnection = async (apiUrl = 'http://localhost:11434') => {
  try {
    // Ensure URL starts with http
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    const cleanUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    
    // First check if server responds at all
    try {
      await axios.get(cleanUrl, { timeout: 2000 });
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
        return {
          status: 'unavailable',
          message: 'Ollama server is not running or not accessible',
          helpText: [
            'Ensure Ollama application is running',
            'Check that Ollama is properly installed',
            'Verify the API URL is correct in your settings'
          ],
          error: error.message
        };
      }
    }

    // Check models/tags endpoint
    const modelsResponse = await axios.get(`${cleanUrl}/api/tags`, { 
      timeout: 3000,
      validateStatus: () => true // Accept any status
    });

    if (modelsResponse.status === 200) {
      const models = modelsResponse.data?.models?.map(model => model.name) || [];
      return {
        status: 'available',
        message: `Ollama is running with ${models.length} models available`,
        models,
        apiUrl: cleanUrl
      };
    } else {
      // Server is running but endpoint not available
      return {
        status: 'endpoint_missing',
        message: 'Ollama is running but API endpoints are not accessible',
        helpText: [
          'Ensure Ollama has proper permissions',
          'Check that the correct API URL is configured',
          'Restart Ollama if the problem persists'
        ],
        statusCode: modelsResponse.status,
        apiUrl: cleanUrl
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Error connecting to Ollama: ${error.message}`,
      error: error.message,
      apiUrl
    };
  }
};

export default {
  checkLmStudioConnection,
  checkOllamaConnection
};
