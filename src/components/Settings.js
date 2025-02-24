import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels, saveSettings } from '../store/actions/settingsActions';
import { Box, Button, Card, CardContent, CircularProgress, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, TextField, Typography, Alert } from '@mui/material';

const Settings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  
  const [formData, setFormData] = useState({
    lmStudio: {
      apiUrl: settings.lmStudio.apiUrl,
      defaultModel: settings.lmStudio.defaultModel
    },
    ollama: {
      apiUrl: settings.ollama.apiUrl,
      defaultModel: settings.ollama.defaultModel
    }
  });
  
  const [validationErrors, setValidationErrors] = useState({
    lmStudio: { apiUrl: '', defaultModel: '' },
    ollama: { apiUrl: '', defaultModel: '' }
  });

  useEffect(() => {
    // Fetch models on component mount and when URLs change
    if (formData.lmStudio.apiUrl) {
      dispatch(fetchModels('lmStudio', formData.lmStudio.apiUrl));
    }
    if (formData.ollama.apiUrl) {
      dispatch(fetchModels('ollama', formData.ollama.apiUrl));
    }
  }, [dispatch, formData.lmStudio.apiUrl, formData.ollama.apiUrl]);

  const validateForm = () => {
    const errors = {
      lmStudio: { apiUrl: '', defaultModel: '' },
      ollama: { apiUrl: '', defaultModel: '' }
    };
    
    // Validate LM Studio URL
    if (!formData.lmStudio.apiUrl) {
      errors.lmStudio.apiUrl = 'LM Studio API URL is required';
    } else if (!formData.lmStudio.apiUrl.startsWith('http')) {
      errors.lmStudio.apiUrl = 'Invalid URL format';
    }
    
    // Validate Ollama URL
    if (!formData.ollama.apiUrl) {
      errors.ollama.apiUrl = 'Ollama API URL is required';
    } else if (!formData.ollama.apiUrl.startsWith('http')) {
      errors.ollama.apiUrl = 'Invalid URL format';
    }
    
    setValidationErrors(errors);
    return !Object.values(errors).some(provider => 
      Object.values(provider).some(error => error !== '')
    );
  };

  const handleInputChange = (provider, field, value) => {
    setFormData(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (validateForm()) {
      dispatch(saveSettings(formData));
    }
  };

  const renderProviderCard = (provider, title) => {
    const providerData = settings[provider];
    const isLoading = providerData.loading;
    const error = providerData.error;
    const models = providerData.models || [];

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title} Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API URL"
                value={formData[provider].apiUrl}
                onChange={(e) => handleInputChange(provider, 'apiUrl', e.target.value)}
                error={!!validationErrors[provider].apiUrl}
                helperText={validationErrors[provider].apiUrl}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors[provider].defaultModel}>
                <InputLabel>Default Model</InputLabel>
                <Select
                  value={formData[provider].defaultModel}
                  onChange={(e) => handleInputChange(provider, 'defaultModel', e.target.value)}
                  label="Default Model"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {models.map((model, index) => (
                    <MenuItem key={index} value={typeof model === 'string' ? model : model.name}>
                      {typeof model === 'string' ? model : model.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{validationErrors[provider].defaultModel}</FormHelperText>
              </FormControl>
            </Grid>

            {isLoading && (
              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  <Typography variant="body2">Fetching models...</Typography>
                </Box>
              </Grid>
            )}

            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
                  Failed to fetch models: {error}
                </Alert>
              </Grid>
            )}

            {!isLoading && !error && models.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  {models.length} models available
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {renderProviderCard('lmStudio', 'LM Studio')}
      {renderProviderCard('ollama', 'Ollama')}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          size="large"
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
