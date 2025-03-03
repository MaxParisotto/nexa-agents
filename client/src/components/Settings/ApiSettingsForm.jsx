import React, { useState } from 'react';
import { 
  Grid, TextField, Typography, Box, Divider,
  InputAdornment, IconButton, FormControl,
  InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * API Settings Form Component
 * @param {Object} props - Component props
 * @param {Object} props.settings - Settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 */
export default function ApiSettingsForm({ settings, onSettingChange }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testConnectionStatus, setTestConnectionStatus] = useState(null);
  
  // Handle text field change
  const handleLmStudioChange = (event) => {
    onSettingChange('api', 'lmStudio', event.target.name, event.target.value);
  };
  
  // Handle ollama change
  const handleOllamaChange = (event) => {
    onSettingChange('api', 'ollama', event.target.name, event.target.value);
  };
  
  // Toggle password visibility
  const handleToggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };
  
  // Test API connection
  const handleTestConnection = async (apiType) => {
    setTestConnectionStatus({ loading: true, api: apiType });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Random success/failure for demonstration
      const success = Math.random() > 0.5;
      
      if (success) {
        setTestConnectionStatus({ success: true, api: apiType });
      } else {
        setTestConnectionStatus({ error: 'Connection failed', api: apiType });
      }
      
      // Clear status after a delay
      setTimeout(() => setTestConnectionStatus(null), 3000);
    } catch (err) {
      setTestConnectionStatus({ error: err.message, api: apiType });
    }
  };
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Model APIs</Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Configure connections to local and remote LLM services
        </Typography>
      </Grid>
      
      {/* LM Studio Settings */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>LM Studio Settings</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="API URL"
          name="apiUrl"
          value={settings.api.lmStudio.apiUrl}
          onChange={handleLmStudioChange}
          helperText="The API endpoint for LM Studio"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="API Key"
          name="apiKey"
          type={showApiKey ? 'text' : 'password'}
          value={settings.api.lmStudio.apiKey}
          onChange={handleLmStudioChange}
          helperText="Leave blank if no API key is required"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleToggleApiKeyVisibility}
                  edge="end"
                >
                  {showApiKey ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Default Model"
          name="defaultModel"
          value={settings.api.lmStudio.defaultModel}
          onChange={handleLmStudioChange}
          helperText="Model identifier to use by default"
        />
      </Grid>
      
      <Grid item xs={12}>
        {testConnectionStatus?.api === 'lmStudio' && (
          testConnectionStatus.loading ? (
            <Alert severity="info">Testing connection...</Alert>
          ) : testConnectionStatus.success ? (
            <Alert severity="success">Connection successful!</Alert>
          ) : (
            <Alert severity="error">Connection failed: {testConnectionStatus.error}</Alert>
          )
        )}
      </Grid>
      
      <Grid item xs={12}>
        <Divider />
      </Grid>
      
      {/* Ollama Settings */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>Ollama Settings</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="API URL"
          name="apiUrl"
          value={settings.api.ollama.apiUrl}
          onChange={handleOllamaChange}
          helperText="The API endpoint for Ollama"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel id="ollama-model-label">Default Model</InputLabel>
          <Select
            labelId="ollama-model-label"
            name="defaultModel"
            value={settings.api.ollama.defaultModel}
            label="Default Model"
            onChange={handleOllamaChange}
          >
            <MenuItem value="llama2">Llama 2</MenuItem>
            <MenuItem value="mistral">Mistral</MenuItem>
            <MenuItem value="openhermes">OpenHermes</MenuItem>
            <MenuItem value="vicuna">Vicuna</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12}>
        {testConnectionStatus?.api === 'ollama' && (
          testConnectionStatus.loading ? (
            <Alert severity="info">Testing connection...</Alert>
          ) : testConnectionStatus.success ? (
            <Alert severity="success">Connection successful!</Alert>
          ) : (
            <Alert severity="error">Connection failed: {testConnectionStatus.error}</Alert>
          )
        )}
      </Grid>
    </Grid>
  );
}
