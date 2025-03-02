/**
 * Utility for helping manage model loading states in LM Studio
 */
import axios from 'axios';

/**
 * Check if a model is currently loaded in LM Studio
 * @param {string} apiUrl - The LM Studio API URL
 * @param {string} modelId - The model ID to check
 * @returns {Promise<Object>} - Object with loading status
 */
export const checkModelLoadingStatus = async (apiUrl, modelId) => {
  try {
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    
    // First get the model list
    const modelsResponse = await axios.get(`${cleanUrl}/v1/models`, { timeout: 3000 });
    
    if (modelsResponse.status !== 200) {
      return { 
        success: false, 
        loaded: false,
        error: `Models endpoint returned status ${modelsResponse.status}`,
        message: 'Could not retrieve models list'
      };
    }
    
    const availableModels = modelsResponse.data?.data?.map(m => m.id) || [];
    
    if (!availableModels.includes(modelId)) {
      return {
        success: true,
        loaded: false,
        available: false,
        availableModels,
        message: `Model "${modelId}" not found in available models`
      };
    }
    
    // Check if the model is ready by making a minimal request
    try {
      const testResponse = await axios.post(
        `${cleanUrl}/v1/chat/completions`,
        {
          model: modelId,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          temperature: 0.1
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 3000 // Short timeout for quick check
        }
      );
      
      if (testResponse.status === 200 && testResponse.data?.choices) {
        return {
          success: true,
          loaded: true,
          available: true,
          message: 'Model is loaded and ready'
        };
      } else {
        return {
          success: false,
          loaded: false,
          available: true,
          error: 'Invalid response from API',
          message: 'Model is available but not ready'
        };
      }
    } catch (error) {
      // If we get a timeout or 503, the model is probably loading
      const isLoading = error.code === 'ECONNABORTED' || 
                      error.response?.status === 503 ||
                      (error.response?.data?.error && 
                       error.response.data.error.toString().includes('loading'));
      
      if (isLoading) {
        return {
          success: true,
          loaded: false,
          loading: true,
          available: true,
          message: 'Model is loading'
        };
      }
      
      return {
        success: false,
        loaded: false,
        available: true,
        error: error.message,
        message: 'Error checking model loading status'
      };
    }
  } catch (error) {
    return {
      success: false,
      loaded: false,
      error: error.message,
      message: 'Failed to check model loading status'
    };
  }
};

/**
 * Wait for a model to finish loading
 * @param {string} apiUrl - The LM Studio API URL
 * @param {string} modelId - The model ID to wait for
 * @param {Object} options - Options for waiting
 * @returns {Promise<boolean>} - True if model loaded successfully
 */
export const waitForModelLoading = async (apiUrl, modelId, options = {}) => {
  const { 
    maxAttempts = 20,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    onProgress = null
  } = options;
  
  let attempt = 0;
  let delay = initialDelayMs;
  
  while (attempt < maxAttempts) {
    attempt++;
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress({
        attempt,
        maxAttempts,
        progress: attempt / maxAttempts,
        waiting: true
      });
    }
    
    // Wait for the current delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Check model status
    const status = await checkModelLoadingStatus(apiUrl, modelId);
    
    if (status.loaded) {
      // Model is loaded and ready
      if (onProgress) {
        onProgress({
          attempt,
          maxAttempts,
          progress: 1,
          waiting: false,
          loaded: true
        });
      }
      return true;
    }
    
    if (!status.available && !status.loading) {
      // Model isn't available and not loading
      if (onProgress) {
        onProgress({
          attempt,
          maxAttempts,
          progress: 0,
          waiting: false,
          loaded: false,
          error: 'Model not available'
        });
      }
      return false;
    }
    
    // Increase delay for next attempt (exponential backoff with max)
    delay = Math.min(delay * 1.5, maxDelayMs);
  }
  
  // Max attempts reached
  if (onProgress) {
    onProgress({
      attempt,
      maxAttempts,
      progress: attempt / maxAttempts,
      waiting: false,
      loaded: false,
      error: 'Timeout waiting for model to load'
    });
  }
  
  return false;
};

export default {
  checkModelLoadingStatus,
  waitForModelLoading
};
