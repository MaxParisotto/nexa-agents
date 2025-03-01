/**
 * Utility for parsing and analyzing LLM models from different providers
 */

/**
 * Parse models from different providers and normalize their data
 * @param {Array} models - Raw models array from provider
 * @param {string} provider - Provider name ('ollama', 'lmStudio', etc.)
 * @returns {Array} - Normalized model info
 */
export const parseModels = (models, provider) => {
  if (!models || !Array.isArray(models)) {
    console.warn('Invalid models data received:', models);
    return [];
  }

  switch (provider.toLowerCase()) {
    case 'lmstudio':
      return parseLmStudioModels(models);
    case 'ollama':
      return parseOllamaModels(models);
    default:
      console.warn(`Unknown provider: ${provider}`);
      return models.map(model => ({ id: model.id || model.name, name: model.name || model.id, provider }));
  }
};

/**
 * Parse LM Studio models
 */
const parseLmStudioModels = (models) => {
  return models.map(model => ({
    id: model.id,
    name: formatModelName(model.id),
    rawName: model.id,
    provider: 'lmStudio',
    quantization: detectQuantization(model.id),
    architecture: detectArchitecture(model.id),
    size: detectModelSize(model.id),
    contextLength: model.context_length || detectContextLength(model.id),
    lastUsed: null,
  }));
};

/**
 * Parse Ollama models
 */
const parseOllamaModels = (models) => {
  return models.map(model => ({
    id: model.name,
    name: formatModelName(model.name),
    rawName: model.name,
    provider: 'ollama',
    quantization: detectQuantization(model.name),
    architecture: detectArchitecture(model.name),
    size: detectModelSize(model.name),
    contextLength: model.context_length || detectContextLength(model.name),
    modified: model.modified_at ? new Date(model.modified_at) : null,
    size: model.size ? formatBytes(model.size) : null
  }));
};

/**
 * Format bytes to human-readable form
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format model name to be more readable
 */
export const formatModelName = (modelName) => {
  if (!modelName) return 'Unknown Model';
  
  // Replace file extensions
  let name = modelName.replace(/\.(gguf|bin|ggml)$/i, '');
  
  // Replace hyphens and underscores with spaces
  name = name.replace(/[-_]/g, ' ');
  
  // Handle common architectures like mistral, llama, etc.
  const knownModels = {
    'llama2': 'LLaMA 2',
    'llama3': 'LLaMA 3',
    'mistral': 'Mistral',
    'mixtral': 'Mixtral',
    'gemma': 'Gemma',
    'gpt4all': 'GPT4All',
    'openchat': 'OpenChat',
    'stablelm': 'StableLM',
    'qwen': 'Qwen',
    'phi': 'Phi',
    'wizardlm': 'Wizard LM',
    'vicuna': 'Vicuna',
    'mpt': 'MPT',
    'falcon': 'Falcon',
    'codellama': 'Code LLaMA',
  };

  // Apply known model replacements
  for (const [pattern, replacement] of Object.entries(knownModels)) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'i');
    name = name.replace(regex, replacement);
  }
  
  // Clean up quantization markers
  name = name.replace(/\bq(\d+)_(\w+)\b/i, 'Q$1 $2');
  name = name.replace(/\bQ(\d+)_(\w+)\b/i, 'Q$1 $2');
  
  // Detect language models with sizes and clean up
  name = name.replace(/(\d+)b\b/i, '$1B');
  name = name.replace(/(\d+)m\b/i, '$1M');
  
  // Convert to title case (but preserve uppercase acronyms)
  name = name.replace(/\b([a-z])/g, char => char.toUpperCase());
  
  // Add space between numbers and letters if missing
  name = name.replace(/(\d)([A-Za-z])/g, '$1 $2');
  
  return name.trim();
};

/**
 * Detect quantization from model name
 */
export const detectQuantization = (modelName) => {
  if (!modelName) return 'Unknown';
  
  const quantMatch = modelName.match(/\b[qQ](\d+)_([KM]_[KM]?)\b/i) || 
                     modelName.match(/\b[qQ](\d+)[KM]\b/i);
  
  if (quantMatch) {
    return `Q${quantMatch[1]}${quantMatch[2] ? '_' + quantMatch[2] : ''}`;
  }
  
  return 'Unknown';
};

/**
 * Detect model architecture
 */
export const detectArchitecture = (modelName) => {
  if (!modelName) return 'Unknown';
  
  const architectures = [
    { pattern: /\bllama\s*2/i, name: 'LLaMA 2' },
    { pattern: /\bllama\s*3/i, name: 'LLaMA 3' },
    { pattern: /\bllama/i, name: 'LLaMA' },
    { pattern: /\bmistral/i, name: 'Mistral' },
    { pattern: /\bmixtral/i, name: 'Mixtral' },
    { pattern: /\bgpt/i, name: 'GPT' },
    { pattern: /\bfalcon/i, name: 'Falcon' },
    { pattern: /\bgemma/i, name: 'Gemma' },
    { pattern: /\bvicuna/i, name: 'Vicuna' },
    { pattern: /\bwizard/i, name: 'Wizard' },
    { pattern: /\bmpt/i, name: 'MPT' },
    { pattern: /\bphi/i, name: 'Phi' },
    { pattern: /\bqwen/i, name: 'Qwen' },
    { pattern: /\bstablelm/i, name: 'StableLM' },
    { pattern: /\bcodellama/i, name: 'CodeLLaMA' },
  ];
  
  for (const arch of architectures) {
    if (arch.pattern.test(modelName)) {
      return arch.name;
    }
  }
  
  return 'Unknown';
};

/**
 * Detect model size from model name
 */
export const detectModelSize = (modelName) => {
  if (!modelName) return 'Unknown';
  
  const sizeMatch = modelName.match(/\b(\d+)[bB]\b/);
  
  if (sizeMatch) {
    return `${sizeMatch[1]}B`;
  }
  
  return 'Unknown';
};

/**
 * Detect context length from model name
 */
export const detectContextLength = (modelName) => {
  if (!modelName) return 4096;
  
  // Look for patterns like 8k, 32k, etc.
  const contextMatch = modelName.match(/\b(\d+)[kK]\b/);
  
  if (contextMatch) {
    return parseInt(contextMatch[1]) * 1024;
  }
  
  // Default context lengths based on architecture
  if (/llama\s*3/i.test(modelName)) return 8192;
  if (/llama\s*2/i.test(modelName)) return 4096;
  if (/mistral/i.test(modelName)) return 8192;
  if (/mixtral/i.test(modelName)) return 32768;
  if (/gpt4/i.test(modelName)) return 8192;
  if (/gemma/i.test(modelName)) return 8192;
  
  return 4096; // Default context length
};

/**
 * Get a score for a model based on its properties
 * Higher scores indicate more capable models
 */
export const getModelScore = (model) => {
  let score = 0;
  
  // Score based on size
  const sizeMatch = model.size?.toString().match(/(\d+)[bB]/);
  if (sizeMatch) {
    const sizeNum = parseInt(sizeMatch[1]);
    score += sizeNum * 10; // More parameters = higher score
  }
  
  // Score based on architecture
  const architectureScores = {
    'LLaMA 3': 100,
    'Mixtral': 90,
    'LLaMA 2': 80,
    'Mistral': 75,
    'GPT': 70,
    'Qwen': 65,
    'Gemma': 60,
    'Vicuna': 55,
    'CodeLLaMA': 50,
    'Falcon': 45,
    'Phi': 40,
    'MPT': 35,
    'StableLM': 30
  };
  
  if (model.architecture && architectureScores[model.architecture]) {
    score += architectureScores[model.architecture];
  }
  
  // Score based on quantization - lower quantization is better
  const quantMatch = model.quantization?.match(/Q(\d+)/);
  if (quantMatch) {
    const quantNum = parseInt(quantMatch[1]);
    score += (16 - quantNum) * 5; // Q4 is better than Q8, etc.
  }
  
  // Score based on context length
  if (model.contextLength) {
    score += Math.log2(model.contextLength) * 5;
  }
  
  return Math.max(1, Math.round(score));
};

/**
 * Sort models by capability and relevance
 */
export const sortModelsByCapability = (models) => {
  return [...models].sort((a, b) => {
    // Add a score to each model
    const scoreA = getModelScore(a);
    const scoreB = getModelScore(b);
    
    // Sort by score (higher is better)
    return scoreB - scoreA;
  });
};

/**
 * Find the best model from a list based on capability score
 */
export const findBestModel = (models) => {
  if (!models || models.length === 0) return null;
  
  const sorted = sortModelsByCapability(models);
  return sorted[0];
};
