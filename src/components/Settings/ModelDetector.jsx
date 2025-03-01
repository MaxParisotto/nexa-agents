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

  // Detect available models
  const detectModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the Redux thunk to fetch models
      const detectedModels = await dispatch(fetchModels(serverType, apiUrl, serverType));
      
      if (Array.isArray(detectedModels) && detectedModels.length > 0) {
        setModels(detectedModels);
        
        // If we have models but no selection, set the first one as selected
        if (!selectedModel && detectedModels.length > 0) {
          const bestModel = findBestDefaultModel(detectedModels);
          setSelectedModel(bestModel);
          if (onModelSelected) onModelSelected(bestModel);
        }
        
        // Notify parent component
        if (onModelsLoaded) onModelsLoaded(detectedModels);
        
        setConnectionStatus({
          status: 'connected',
          lastChecked: new Date().toLocaleTimeString()
        });
      } else {
        setError(`No models found for ${serverType}`);
        setConnectionStatus({
          status: 'no_models',
          lastChecked: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error(`Error detecting models for ${serverType}:`, err);
      setError(`Failed to detect models: ${err.message || 'Unknown error'}`);
      setConnectionStatus({
        status: 'error',
        lastChecked: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Find the best model to use as default
  const findBestDefaultModel = (models) => {
    // Priority models by type
    const modelPriority = {
      lmStudio: [
        // Ordered from most to least preferred
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
        // Ordered from most to least preferred
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
        // Check both id and name fields if available
        const modelId = typeof model === 'string' ? model : (model.id || model.name || '');
        return pattern.test(modelId);
      });
      
      if (match) {
        // Return the id of the matched model or the model itself if it's a string
        return typeof match === 'string' ? match : (match.id || match.name);
      }
    }
    
    // If no match found, return the first model
    return typeof models[0] === 'string' ? models[0] : (models[0]?.id || models[0]?.name);
  };
  
  // Test the connection to the LLM server
  const testLLMConnection = async () => {
    setLoading(true);
    
    try {
      const result = await dispatch(testConnection(serverType, apiUrl, selectedModel));
      
      setConnectionStatus({
        status: result.success ? 'connected' : 'error',
        message: result.message,
        lastChecked: new Date().toLocaleTimeString()
      });
      
      if (!result.success) {
        setError(result.message || `Could not connect to ${serverType}`);
      }
    } catch (err) {
      console.error('Connection test error:', err);
      setError(`Connection test failed: ${err.message}`);
      setConnectionStatus({
        status: 'error',
        message: err.message,
        lastChecked: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle model selection change
  const handleModelChange = (e) => {
    const newModel = e.target.value;
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
            disabled={loading || models.length === 0}
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
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ModelDetector;
