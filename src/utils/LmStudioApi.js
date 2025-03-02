/**
 * LM Studio API client for OpenAI-compatible endpoints
 * Based on documentation from https://lmstudio.ai/docs/api/endpoints/openai
 */
import axios from 'axios';

class LmStudioApi {
  constructor(apiUrl = 'http://localhost:1234') {
    // Format the base URL
    this.baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    this.baseUrl = this.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    
    // Create axios instance with common settings
    this.axios = axios.create({
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
  }
  
  /**
   * Test connection to the LM Studio server
   * @returns {Promise<Object>} Status information
   */
  async testConnection() {
    try {
      // Use the models endpoint as a health check
      const response = await this.axios.get(`${this.baseUrl}/v1/models`);
      
      return {
        status: 'connected',
        message: 'Successfully connected to LM Studio API',
        models: response.data.data?.map(model => model.id) || []
      };
    } catch (error) {
      console.error('LM Studio connection test failed:', error);
      
      // Provide diagnostic information
      if (error.code === 'ECONNREFUSED') {
        return {
          status: 'disconnected',
          message: 'Connection refused. Make sure LM Studio is running and API server is enabled.',
          error: error.message
        };
      }
      
      if (error.response?.status === 404) {
        return {
          status: 'endpoint-not-found',
          message: 'API endpoint not found. Check LM Studio configuration.',
          error: error.message
        };
      }
      
      return {
        status: 'error',
        message: error.message || 'Unknown error connecting to LM Studio',
        error
      };
    }
  }
  
  /**
   * List available models
   * @returns {Promise<Array>} Array of model objects
   */
  async listModels() {
    try {
      const response = await this.axios.get(`${this.baseUrl}/v1/models`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      throw error;
    }
  }
  
  /**
   * Create a chat completion
   * @param {Object} options - Chat completion options
   * @returns {Promise<Object>} Chat completion response
   */
  async createChatCompletion({
    model,
    messages,
    temperature = 0.7,
    top_p = 0.9,
    max_tokens = 1024,
    stream = false,
    stop = null,
    presence_penalty = 0,
    frequency_penalty = 0
  }) {
    try {
      // Validate required parameters
      if (!model) throw new Error('Model parameter is required');
      if (!messages || !Array.isArray(messages)) throw new Error('Messages array is required');
      
      // Prepare request body according to OpenAI API format
      const requestBody = {
        model,
        messages,
        temperature,
        top_p,
        max_tokens,
        stream,
        stop,
        presence_penalty,
        frequency_penalty
      };
      
      // Log the request (for debugging)
      console.log(`LM Studio API Request to ${this.baseUrl}/v1/chat/completions:`, {
        model,
        messagesCount: messages.length,
        temperature,
        max_tokens
      });
      
      // First check if the server is available
      try {
        await this.axios.get(`${this.baseUrl}/v1/models`, { timeout: 2000 });
      } catch (error) {
        console.error('Failed to connect to LM Studio API server', error);
        throw new Error(`LM Studio API server is not accessible at ${this.baseUrl}`);
      }
      
      // Make the API call
      const response = await this.axios.post(
        `${this.baseUrl}/v1/chat/completions`, 
        requestBody
      );
      
      return response.data;
    } catch (error) {
      console.error('Chat completion error:', error);
      
      // Add specific error handling for common errors
      if (error.response?.status === 404) {
        console.error('API endpoint not found. Check LM Studio version and configuration');
        
        // Try alternative endpoint formats - some versions of LM Studio may use different paths
        try {
          console.log('Attempting with alternative endpoint format...');
          const response = await this.axios.post(
            `${this.baseUrl}/chat/completions`, 
            requestBody
          );
          return response.data;
        } catch (retryError) {
          console.error('Alternative endpoint also failed:', retryError);
        }
      }
      
      // Enhance error with helpful messages
      const enhancedError = new Error(
        error.response?.data?.error?.message || 
        error.message || 
        'Unknown error communicating with LM Studio'
      );
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  }
  
  /**
   * Create a completion (legacy/non-chat mode)
   * @param {Object} options - Completion options
   * @returns {Promise<Object>} Completion response
   */
  async createCompletion({
    model,
    prompt,
    temperature = 0.7,
    top_p = 0.9,
    max_tokens = 1024,
    stream = false,
    stop = null,
    presence_penalty = 0,
    frequency_penalty = 0
  }) {
    try {
      // Validate required parameters
      if (!model) throw new Error('Model parameter is required');
      if (!prompt) throw new Error('Prompt is required');
      
      // Prepare request body
      const requestBody = {
        model,
        prompt,
        temperature,
        top_p,
        max_tokens,
        stream,
        stop,
        presence_penalty,
        frequency_penalty
      };
      
      // Make the API call
      const response = await this.axios.post(
        `${this.baseUrl}/v1/completions`, 
        requestBody
      );
      
      return response.data;
    } catch (error) {
      console.error('Completion error:', error);
      
      // Enhance error with helpful messages
      const enhancedError = new Error(
        error.response?.data?.error?.message || error.message || 'Unknown error'
      );
      enhancedError.status = error.response?.status;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  }
  
  /**
   * Create an embedding
   * @param {Object} options - Embedding options
   * @returns {Promise<Object>} Embedding response
   */
  async createEmbedding({
    model,
    input
  }) {
    try {
      // Validate required parameters
      if (!model) throw new Error('Model parameter is required');
      if (!input) throw new Error('Input is required');
      
      // Prepare request body
      const requestBody = {
        model,
        input
      };
      
      // Make the API call
      const response = await this.axios.post(
        `${this.baseUrl}/v1/embeddings`, 
        requestBody
      );
      
      return response.data;
    } catch (error) {
      console.error('Embedding error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const lmStudioApi = new LmStudioApi();

export default lmStudioApi;
