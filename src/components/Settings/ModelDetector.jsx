import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, FormControl, InputLabel, Select, 
  MenuItem, CircularProgress, Typography, Alert, Chip
} from '@mui/material';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { fetchModels, testConnection } from '../../store/actions/settingsActions';

/**
 * Model Detector Component
 * Automatically detects and fetches models from a server
 */
const ModelDetector = ({ 
  serverType, // e.g., 'lmStudio', 'ollama'
  apiUrl,
  defaultModel,
  onModelsLoaded,
  onModelSelected
}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(defaultModel || '');
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'unknown',
    lastChecked: null
  });

  // Fetch models when the component mounts or apiUrl/serverType changes
  useEffect(() => {
    if (apiUrl) {
      detectModels();
    }
  }, [apiUrl, serverType]);

  // Also update selectedModel when defaultModel prop changes
  useEffect(() => {
    if (defaultModel && defaultModel !== selectedModel) {
      setSelectedModel(defaultModel);
    }
  }, [defaultModel]);

  // Detect available models
  const detectModels = async () => {
    setLoading(true);
    setError(null);
    
    // If no API URL, set default models based on server type
    if (!apiUrl) {
      const fallbackModels = getFallbackModels(serverType);
      setModels(fallbackModels);
      setLoading(false);
      setError("No API URL provided. Using default model list.");
      return;
    }
    
    console.log(`[ModelDetector] Detecting models for ${serverType} at ${apiUrl}`);
    
    try {
      // Format API URL correctly
      let formattedUrl = apiUrl;
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `http://${formattedUrl}`;
      }
      formattedUrl = formattedUrl.replace(/\/$/, ''); // Remove trailing slash if present
      
      let fetchedModels = [];
      
      if (serverType === 'lmStudio') {
        try {
          const response = await axios.get(`${formattedUrl}/v1/models`, { timeout: 3000 });
          if (response.data && response.data.data && Array.isArray(response.data.data)) {
            fetchedModels = response.data.data.map(model => model.id);
            console.log(`[ModelDetector] Found ${fetchedModels.length} models from LM Studio`);
          }
        } catch (err) {
          console.error(`[ModelDetector] Failed to fetch LM Studio models:`, err);
          setError(`Failed to fetch LM Studio models: ${err.message}`);
          fetchedModels = getFallbackModels('lmStudio');
        }
      } else if (serverType === 'ollama') {
        try {
          const response = await axios.get(`${formattedUrl}/api/tags`, { timeout: 3000 });
          if (response.data && response.data.models && Array.isArray(response.data.models)) {
            fetchedModels = response.data.models.map(model => model.name);
            console.log(`[ModelDetector] Found ${fetchedModels.length} models from Ollama`);
          }
        } catch (err) {
          console.error(`[ModelDetector] Failed to fetch Ollama models:`, err);
          setError(`Failed to fetch Ollama models: ${err.message}`);
          fetchedModels = getFallbackModels('ollama');
        }
      }
      
      // If we got models successfully
      if (fetchedModels.length > 0) {
        setModels(fetchedModels);
        setConnectionStatus({
          status: 'connected',
          lastChecked: new Date().toLocaleTimeString()
        });
        
        // Notify parent component
        if (onModelsLoaded) {
          onModelsLoaded(fetchedModels);
        }
        
        // If we don't have a selected model yet but have models available, select the best one
        if (!selectedModel && fetchedModels.length > 0) {
          const bestModel = findBestDefaultModel(fetchedModels, serverType);
          setSelectedModel(bestModel);
          if (onModelSelected) onModelSelected(bestModel);
        }
      } else {
        // If we didn't get any models, use fallbacks
        const fallbackModels = getFallbackModels(serverType);
        setModels(fallbackModels);
        setError(`No models found for ${serverType}. Using default models.`);
        setConnectionStatus({
          status: 'no_models',
          lastChecked: new Date().toLocaleTimeString()
        });
        
        // Only notify about fallback models if we have them
        if (fallbackModels.length > 0) {
          if (onModelsLoaded) {
            onModelsLoaded(fallbackModels);
          }
          
          // If we don't have a selected model, select the first fallback
          if (!selectedModel) {
            setSelectedModel(fallbackModels[0]);
            if (onModelSelected) onModelSelected(fallbackModels[0]);
          }
        }
      }
    } catch (err) {
      console.error(`[ModelDetector] Error detecting models for ${serverType}:`, err);
      
      // Use fallback models
      const fallbackModels = getFallbackModels(serverType);
      setModels(fallbackModels);
      setError(`Failed to detect models: ${err.message || 'Unknown error'}`);
      setConnectionStatus({
        status: 'error',
        lastChecked: new Date().toLocaleTimeString()
      });
      
      // Only notify about fallback models if we have them
      if (fallbackModels.length > 0) {
        if (onModelsLoaded) {
          onModelsLoaded(fallbackModels);
        }
        
        // If we don't have a selected model, select the first fallback
        if (!selectedModel) {
          setSelectedModel(fallbackModels[0]);
          if (onModelSelected) onModelSelected(fallbackModels[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Get fallback models for different server types
  const getFallbackModels = (serverType) => {
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
  
  // Find the best model to use as default
  const findBestDefaultModel = (models, serverType) => {
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
    
    console.log(`[ModelDetector] Finding best model from ${models.length} available models`);
    
    // Try to match models against the priority list
    for (const pattern of priorityList) {
      const match = models.find(model => {
        const modelId = typeof model === 'string' ? model : (model.id || model.name || '');
        return pattern.test(modelId);
      });
      
      if (match) {
        const modelId = typeof match === 'string' ? match : (match.id || match.name);
        console.log(`[ModelDetector] Selected best model: ${modelId}`);
        return modelId;
      }
    }
    
    // If no match found, return the first model
    const firstModel = models[0];
    const modelId = typeof firstModel === 'string' ? firstModel : (firstModel?.id || firstModel?.name);
    console.log(`[ModelDetector] No preferred model found, using first model: ${modelId}`);
    return modelId;
  };
  
  // Handle model selection change
  const handleModelChange = (e) => {
    const newModel = e.target.value;
    console.log(`[ModelDetector] Model selected: ${newModel}`);
    setSelectedModel(newModel);
    if (onModelSelected) onModelSelected(newModel);
  };
  
  return (
    <Box sx={{ mb: 2 }}>
      {/* Model Selection */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <FormControl fullWidth>
          <InputLabel id={`${serverType}-model-label`}>Default Model</InputLabel>
          <Select
            labelId={`${serverType}-model-label`}
            value={selectedModel}
            onChange={handleModelChange}
            label="Default Model"
            disabled={loading}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300
                }
              }
            }}
          >
            {models.map((model) => {
              const modelId = typeof model === 'string' ? model : (model.id || model.name);
              const modelName = typeof model === 'string' ? model : 
                (model.name || model.id || modelId);
              
              return (
                <MenuItem key={modelId} value={modelId}>
                  {modelName}
                </MenuItem>
              );
            })}
            {models.length === 0 && (
              <MenuItem disabled>No models available</MenuItem>
            )}
          </Select>
        </FormControl>
        
        <Button 
          variant="outlined" 
          onClick={detectModels} 
          disabled={loading || !apiUrl}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {loading ? <CircularProgress size={24} /> : 'Detect Models'}
        </Button>
      </Box>
      
      {/* Status indicators */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Chip 
          size="small"
          label={connectionStatus.status === 'connected' ? 'Connected' : 
                connectionStatus.status === 'error' ? 'Connection Error' : 
                connectionStatus.status === 'no_models' ? 'No Models Found' : 'Not Connected'}
          color={connectionStatus.status === 'connected' ? 'success' : 
                connectionStatus.status === 'error' ? 'error' : 'default'}
          variant="outlined"
        />
        
        {connectionStatus.lastChecked && (
          <Typography variant="caption" color="textSecondary">
            Last checked: {connectionStatus.lastChecked}
          </Typography>
        )}
        
        {models.length > 0 && (
          <Chip 
            size="small"
            label={`${models.length} models available`}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
      
      {/* Error Display */}
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ModelDetector;
