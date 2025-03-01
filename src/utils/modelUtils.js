/**
 * Utility functions for working with LLM models
 */

// Get fallback models for different server types
export const getFallbackModels = (serverType) => {
  if (serverType === 'lmStudio') {
    return [
      'qwen2.5-7b-instruct',
      'llama3-8b-instruct',
      'mistral-7b-instruct-v0.2',
      'mistral-7b-instruct',
      'gemma-7b-instruct',
      'llama2-7b-chat'
    ];
  } else if (serverType === 'ollama') {
    return [
      'qwen2.5:7b-instruct',
      'llama3:8b-instruct',
      'mistral:7b-instruct',
      'mixtral:8x7b-instruct',
      'gemma:7b-instruct',
      'llama2:7b-chat'
    ];
  }
  return [];
};

// Find the best model to use as default from available models
export const findBestDefaultModel = (models, serverType) => {
  // Models to prioritize in order of preference
  const modelPriority = {
    lmStudio: [
      /qwen.*?instruct/i,   // Qwen instruct models
      /llama.*?3/i,         // LLaMA 3 models
      /mistral.*?instruct/i, // Mistral instruct models
      /mixtral/i,           // Mixtral models
      /gemma/i,             // Gemma models
      /llama.*?2/i,         // LLaMA 2 models
      /vicuna/i,            // Vicuna models
      /.*?instruct/i,       // Any instruct model
    ],
    ollama: [
      /qwen/i,
      /llama3/i,
      /mistral/i,
      /mixtral/i,
      /gemma/i,
      /llama2/i,
      /neural.*?chat/i,
      /stable.*?lm/i,
      /vicuna/i,
    ]
  };
  
  // Get the priority list for the current server type
  const priorityList = modelPriority[serverType] || [];
  
  // Try to match models against the priority list
  for (const pattern of priorityList) {
    const match = models.find(model => {
      const modelId = typeof model === 'string' ? model : (model.id || model.name || '');
      return pattern.test(modelId);
    });
    
    if (match) {
      return typeof match === 'string' ? match : (match.id || match.name);
    }
  }
  
  // If no match found, return the first model
  const firstModel = models[0];
  return typeof firstModel === 'string' ? firstModel : (firstModel?.id || firstModel?.name);
};

// Parse models from API response based on server type
export const parseModelsFromResponse = (data, serverType) => {
  if (!data) return [];
  
  try {
    if (serverType === 'lmStudio') {
      // LM Studio API format
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(model => model.id);
      }
    } else if (serverType === 'ollama') {
      // Ollama API format
      if (data.models && Array.isArray(data.models)) {
        return data.models.map(model => model.name);
      }
    }
  } catch (error) {
    console.error('Error parsing models from response:', error);
  }
  
  // If we get here, something went wrong
  return [];
};

export default {
  getFallbackModels,
  findBestDefaultModel,
  parseModelsFromResponse
};
