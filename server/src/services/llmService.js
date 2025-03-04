const axios = require('axios');
const logger = require('../utils/logger');
const settingsService = require('./settingsService');

class LlmService {
  constructor() {
    this.logger = logger.createLogger('llm');
  }

  /**
   * Get the configured LLM provider settings
   */
  getLlmConfig() {
    const settings = settingsService.getSettings();
    
    // Check for configured providers
    if (!settings.llmProviders?.length) {
      throw new Error('No LLM providers configured. Please configure a provider in settings.');
    }

    // Get the first enabled provider
    const provider = settings.llmProviders.find(p => p.enabled);
    if (!provider) {
      throw new Error('No enabled LLM providers found. Please enable a provider in settings.');
    }

    // Get the agent-specific model if it exists
    const projectManagerAgent = settings.agents?.items?.find(a => a.isProjectManager);
    const agentModel = projectManagerAgent?.model;

    // Return provider configuration
    if (provider.type === 'lmstudio') {
      const model = agentModel || provider.defaultModel || provider.models[0];
      if (!provider.models.includes(model)) {
        throw new Error(`Model ${model} is not available in LM Studio. Please select a valid model from: ${provider.models.join(', ')}`);
      }
      return {
        type: 'lmStudio',
        apiUrl: provider.baseUrl,
        model: model
      };
    } else if (provider.type === 'ollama') {
      return {
        type: 'ollama',
        apiUrl: provider.baseUrl,
        model: agentModel || provider.defaultModel || 'mistral:latest'
      };
    }

    throw new Error(`Unsupported provider type: ${provider.type}`);
  }

  /**
   * Process a message using the configured LLM
   */
  async processMessage(message, systemPrompt = '') {
    try {
      const config = this.getLlmConfig();
      this.logger.info(`Processing message with ${config.type}:`, {
        message,
        model: config.model,
        provider: config.type
      });

      let response;
      if (config.type === 'lmStudio') {
        response = await this.callLmStudio(message, systemPrompt, config);
      } else if (config.type === 'ollama') {
        response = await this.callOllama(message, systemPrompt, config);
      } else {
        throw new Error(`Unsupported LLM provider type: ${config.type}`);
      }

      return response;
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 404) {
        if (error.response?.data?.error?.message?.includes('No models loaded')) {
          throw new Error('No language models are currently loaded in LM Studio. Please load a model first or switch to Ollama in settings.');
        }
        if (error.response?.data?.error?.type === 'model_not_found') {
          throw new Error(`Model not found. Please check your model configuration or load a different model.`);
        }
      }
      
      const errorDetails = {
        message: error.message,
        code: error.code,
        type: error.type,
        provider: error.config?.url ? new URL(error.config.url).hostname : 'unknown'
      };
      
      this.logger.error('Error processing message with LLM:', errorDetails);
      throw error;
    }
  }

  /**
   * Call LM Studio API
   */
  async callLmStudio(message, systemPrompt, config) {
    try {
      // First check if any models are loaded
      const modelsResponse = await axios.get(`${config.apiUrl}/models`);
      
      if (!modelsResponse.data?.data?.length) {
        throw new Error('No models are loaded in LM Studio. Please load a model first or switch to Ollama in settings.');
      }

      const response = await axios.post(`${config.apiUrl}/chat/completions`, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        model: config.model,
        temperature: 0.7,
        max_tokens: 2048
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      };
      
      this.logger.error('Error calling LM Studio:', errorDetails);
      
      // Check if it's a model loading issue
      if (error.response?.status === 404 && error.response?.data?.error?.message?.includes('No models loaded')) {
        throw new Error('No language models are currently loaded in LM Studio. Please load a model first or switch to Ollama in settings.');
      }
      
      throw error;
    }
  }

  /**
   * Call Ollama API
   */
  async callOllama(message, systemPrompt, config) {
    try {
      // First check if the model exists
      const modelResponse = await axios.get(`${config.apiUrl}/api/tags`);
      
      if (!modelResponse.data?.models?.includes(config.model)) {
        throw new Error(`Model ${config.model} is not available in Ollama. Please pull the model first using 'ollama pull ${config.model}'`);
      }

      const response = await axios.post(`${config.apiUrl}/api/generate`, {
        model: config.model,
        prompt: `${systemPrompt}\n\nUser: ${message}\nAssistant:`,
        temperature: 0.7,
        max_tokens: 2048
      });

      return response.data.response;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      };
      
      this.logger.error('Error calling Ollama:', errorDetails);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new LlmService(); 