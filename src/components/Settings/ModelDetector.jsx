import React, { useState, useEffect } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem,
  Typography, CircularProgress, Alert
} from '@mui/material';
import modelManager from '../../utils/ModelManager';

/**
 * Component for detecting and selecting models from a server
 */
const ModelDetector = ({
  serverType = 'lmStudio',
  apiUrl = '',
  defaultModel = '',
  onModelsLoaded = () => {},
  onModelSelected = () => {}
}) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(defaultModel || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load models when API URL or server type changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!apiUrl) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const fetchedModels = await modelManager.getModels(serverType, apiUrl);
        setModels(fetchedModels);
        
        // Update the parent component
        onModelsLoaded(fetchedModels);
        
        // Set default model if available
        if (fetchedModels.length > 0) {
          if (defaultModel && fetchedModels.includes(defaultModel)) {
            setSelectedModel(defaultModel);
          } else if (!selectedModel || !fetchedModels.includes(selectedModel)) {
            setSelectedModel(fetchedModels[0]);
            onModelSelected(fetchedModels[0]);
          }
        }
      } catch (err) {
        setError(err.message);
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [apiUrl, serverType]);

  const handleModelChange = (event) => {
    const model = event.target.value;
    setSelectedModel(model);
    onModelSelected(model);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <FormControl fullWidth sx={{ mb: 1 }}>
        <InputLabel>Model</InputLabel>
        <Select
          value={selectedModel}
          label="Model"
          onChange={handleModelChange}
          disabled={loading || models.length === 0}
        >
          {models.map(model => (
            <MenuItem key={model} value={model}>
              {model}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={14} />
          <Typography variant="caption">
            Searching for models...
          </Typography>
        </Box>
      )}

      {error && !loading && (
        <Alert severity="warning" sx={{ mt: 1, py: 0, fontSize: '0.8rem' }}>
          {error}
        </Alert>
      )}
      
      {!loading && !error && models.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {models.length} model{models.length !== 1 ? 's' : ''} available
        </Typography>
      )}
    </Box>
  );
};

export default ModelDetector;
