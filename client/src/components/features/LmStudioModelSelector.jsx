import React, { useState, useEffect } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem,
  Button, CircularProgress, Typography, LinearProgress,
  Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { checkModelLoadingStatus, waitForModelLoading } from '../utils/ModelLoadingHelper';

/**
 * Advanced model selector for LM Studio with loading status
 */
const LmStudioModelSelector = ({ apiUrl, value, onChange, disabled = false }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingModel, setLoadingModel] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Load models list on mount and when apiUrl changes
  useEffect(() => {
    if (!apiUrl) return;
    
    fetchModels();
  }, [apiUrl]);
  
  // Check loading status when selected model changes
  useEffect(() => {
    if (value) {
      checkSelectedModelStatus(value);
    }
  }, [value]);
  
  const fetchModels = async () => {
    if (!apiUrl) {
      setError('No API URL provided');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
      const cleanUrl = baseUrl.replace(/\/+$/, '');
      
      const response = await axios.get(`${cleanUrl}/v1/models`, { timeout: 5000 });
      
      if (response.status === 200) {
        const modelsList = response.data?.data?.map(m => m.id) || [];
        setModels(modelsList);
        
        if (modelsList.length === 0) {
          setError('No models found');
        }
      } else {
        setError(`Failed to fetch models: ${response.status}`);
      }
    } catch (error) {
      setError(`Error fetching models: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const checkSelectedModelStatus = async (modelId) => {
    if (!apiUrl || !modelId) return;
    
    try {
      const status = await checkModelLoadingStatus(apiUrl, modelId);
      
      if (!status.loaded && status.available) {
        setLoadingModel(modelId);
        // It's loading, show progress
        waitForModelLoading(apiUrl, modelId, {
          onProgress: (progress) => {
            if (progress.loaded) {
              setLoadingModel(null);
              setLoadProgress(1);
            } else if (progress.error) {
              setLoadingModel(null);
              setError(`Model loading failed: ${progress.error}`);
            } else {
              setLoadProgress(progress.progress);
            }
          }
        });
      } else {
        setLoadingModel(null);
      }
    } catch (error) {
      console.error('Error checking model status:', error);
      setLoadingModel(null);
    }
  };
  
  const handleModelChange = (event) => {
    const modelId = event.target.value;
    if (onChange) {
      onChange(modelId);
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Model</InputLabel>
          <Select
            value={value || ''}
            onChange={handleModelChange}
            label="Model"
            disabled={disabled || loading || loadingModel !== null}
          >
            {models.map(model => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
            
            {models.length === 0 && !loading && (
              <MenuItem disabled value="">
                No models available
              </MenuItem>
            )}
          </Select>
        </FormControl>
        
        <Button
          onClick={fetchModels}
          disabled={loading || !apiUrl}
          sx={{ ml: 1 }}
          size="small"
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <RefreshIcon fontSize="small" />
          )}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
          {error}
        </Alert>
      )}
      
      {loadingModel && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption">
            Loading model: {loadingModel}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={loadProgress * 100}
            sx={{ mt: 0.5 }}
          />
        </Box>
      )}
      
      {models.length > 0 && (
        <Typography variant="caption" color="textSecondary">
          {models.length} models available
        </Typography>
      )}
    </Box>
  );
};

export default LmStudioModelSelector;
