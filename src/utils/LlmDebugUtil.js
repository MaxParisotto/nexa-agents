import axios from 'axios';

/**
 * Utility library for diagnosing and debugging LLM configuration issues
 */
const LlmDebugUtil = {
  /**
   * Check if LLM settings are valid
   * @param {Object} settings - The settings object
   * @returns {Object} - Validation result
   */
  validateSettings: (settings) => {
    const result = {
      valid: false,
      errors: [],
      details: {}
    };

    // First check the provided settings object
    if (!settings) {
      // Try to get settings from sessionStorage as fallback
      try {
        const provider = sessionStorage.getItem('lastConfiguredProvider');
        const apiUrl = sessionStorage.getItem(`${provider}Url`);
        const modelName = sessionStorage.getItem(`${provider}Model`);
        
        if (provider && apiUrl && modelName) {
          // Create a temporary settings object
          settings = {
            [provider]: {
              apiUrl,
              defaultModel: modelName
            }
          };
          console.log('Using sessionStorage for LLM settings validation');
        } else {
          result.errors.push('Settings object is undefined or null and no sessionStorage fallback available');
          return result;
        }
      } catch (error) {
        result.errors.push('Settings object is undefined or null and sessionStorage check failed');
        return result;
      }
    }

    // Check LM Studio settings
    const lmStudio = settings.lmStudio || {};
    result.details.lmStudio = {
      apiUrl: lmStudio.apiUrl || 'Not set',
      defaultModel: lmStudio.defaultModel || 'Not set',
      valid: Boolean(lmStudio.apiUrl && lmStudio.defaultModel)
    };

    // Check Ollama settings
    const ollama = settings.ollama || {};
    result.details.ollama = {
      apiUrl: ollama.apiUrl || 'Not set',
      defaultModel: ollama.defaultModel || 'Not set',
      valid: Boolean(ollama.apiUrl && ollama.defaultModel)
    };

    // At least one provider must be configured
    if (!result.details.lmStudio.valid && !result.details.ollama.valid) {
      result.errors.push('No LLM provider is fully configured');
    } else {
      result.valid = true;
    }

    return result;
  },

  /**
   * Test connection to LM Studio
   * @param {string} apiUrl - LM Studio API URL
   * @returns {Promise<Object>} - Test results
   */
  testLmStudioConnection: async (apiUrl) => {
    try {
      console.log(`Testing connection to LM Studio at ${apiUrl}...`);
      
      // Check if the URL is correct format
      if (!apiUrl.startsWith('http')) {
        return {
          success: false,
          error: 'Invalid URL format, must start with http:// or https://'
        };
      }

      // Try to connect to the models endpoint
      const response = await axios.get(
        `${apiUrl}/v1/models`,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.status === 200) {
        // Get list of available models
        const models = response.data?.data || [];
        
        return {
          success: true,
          models: models.map(model => model.id || model.name),
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `Unexpected status code: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  },

  /**
   * Test connection to Ollama
   * @param {string} apiUrl - Ollama API URL
   * @returns {Promise<Object>} - Test results
   */
  testOllamaConnection: async (apiUrl) => {
    try {
      console.log(`Testing connection to Ollama at ${apiUrl}...`);
      
      // Check if the URL is correct format
      if (!apiUrl.startsWith('http')) {
        return {
          success: false,
          error: 'Invalid URL format, must start with http:// or https://'
        };
      }

      // Try to connect to the tags endpoint
      const response = await axios.get(
        `${apiUrl}/api/tags`,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.status === 200) {
        // Get list of available models
        const models = response.data?.models || [];
        
        return {
          success: true,
          models: models.map(model => model.name),
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `Unexpected status code: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  },

  /**
   * Test a simple chat completion with LM Studio
   * @param {string} apiUrl - LM Studio API URL
   * @param {string} model - Model to use
   * @returns {Promise<Object>} - Test results
   */
  testLmStudioChat: async (apiUrl, model) => {
    try {
      console.log(`Testing chat with LM Studio model ${model} at ${apiUrl}...`);
      
      const response = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant."
            },
            {
              role: "user",
              content: "Say hello and identify yourself."
            }
          ],
          temperature: 0.7,
          max_tokens: 100
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.status === 200) {
        const message = response.data?.choices?.[0]?.message?.content || 'No response content';
        
        return {
          success: true,
          message,
          timings: {
            total: response.data?.usage?.total_tokens
          }
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `Unexpected status code: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  },

  /**
   * Test a simple chat completion with Ollama
   * @param {string} apiUrl - Ollama API URL
   * @param {string} model - Model to use
   * @returns {Promise<Object>} - Test results
   */
  testOllamaChat: async (apiUrl, model) => {
    try {
      console.log(`Testing chat with Ollama model ${model} at ${apiUrl}...`);
      
      const response = await axios.post(
        `${apiUrl}/api/generate`,
        {
          model: model,
          prompt: "You are a helpful assistant. Say hello and identify yourself.",
          temperature: 0.7,
          max_tokens: 100
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.status === 200) {
        const message = response.data?.response || 'No response content';
        
        return {
          success: true,
          message,
          timings: {
            eval_count: response.data?.eval_count,
            eval_duration: response.data?.eval_duration
          }
        };
      } else {
        return {
          success: false,
          status: response.status,
          error: `Unexpected status code: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  },

  /**
   * Run all diagnostic tests
   * @param {Object} settings - The settings object
   * @returns {Promise<Object>} - Diagnostic results
   */
  runDiagnostics: async (settings) => {
    console.log('Running LLM diagnostics...');
    
    const results = {
      validation: LlmDebugUtil.validateSettings(settings),
      lmStudio: {
        connection: null,
        chat: null
      },
      ollama: {
        connection: null,
        chat: null
      },
      timestamp: new Date().toISOString()
    };
    
    // Test LM Studio if configured
    if (settings?.lmStudio?.apiUrl) {
      results.lmStudio.connection = await LlmDebugUtil.testLmStudioConnection(settings.lmStudio.apiUrl);
      
      if (results.lmStudio.connection.success && settings.lmStudio.defaultModel) {
        results.lmStudio.chat = await LlmDebugUtil.testLmStudioChat(
          settings.lmStudio.apiUrl, 
          settings.lmStudio.defaultModel
        );
      }
    }
    
    // Test Ollama if configured
    if (settings?.ollama?.apiUrl) {
      results.ollama.connection = await LlmDebugUtil.testOllamaConnection(settings.ollama.apiUrl);
      
      if (results.ollama.connection.success && settings.ollama.defaultModel) {
        results.ollama.chat = await LlmDebugUtil.testOllamaChat(
          settings.ollama.apiUrl, 
          settings.ollama.defaultModel
        );
      }
    }
    
    // Overall success determination
    results.success = (
      (results.lmStudio.chat?.success || results.ollama.chat?.success) &&
      (results.validation.valid)
    );
    
    console.log('Diagnostic results:', results);
    return results;
  }
};

export default LlmDebugUtil; 