import React, { useState } from 'react';
import { 
  Grid, Typography, TextField, Button, Box, Divider,
  FormControl, Select, MenuItem, InputLabel, FormHelperText,
  Switch, FormControlLabel, IconButton, Tooltip, Alert,
  Stack, Paper, Card, CardContent, CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';

/**
 * LLM Settings Form Component for configuring language model providers
 * 
 * @param {Object} props - Component props
 * @param {Object} props.settings - Settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 */
export default function LlmSettingsForm({ settings, onSettingChange }) {
  const [testingConnection, setTestingConnection] = useState({
    lmStudio: false,
    ollama: false,
    agora: false,
  });
  const [connectionStatus, setConnectionStatus] = useState({
    lmStudio: null,
    ollama: null,
    agora: null,
  });
  
  // Handle text field changes
  const handleProviderChange = (provider, field, value) => {
    onSettingChange('api', provider, {
      ...settings.api[provider],
      [field]: value
    });
  };
  
  // Test connection to a provider
  const testConnection = async (provider) => {
    setTestingConnection(prev => ({ ...prev, [provider]: true }));
    
    // Simulate API call to test connection
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // This is where you'd make a real API call to test the connection
      // For demo purposes, we'll randomly succeed or fail
      const success = Math.random() > 0.3; // 70% chance of success
      
      if (success) {
        setConnectionStatus(prev => ({
          ...prev,
          [provider]: {
            connected: true,
            message: 'Successfully connected to service'
          }
        }));
      } else {
        setConnectionStatus(prev => ({
          ...prev,
          [provider]: {
            connected: false,
            message: 'Failed to connect. Please check URL and credentials.'
          }
        }));
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: {
          connected: false,
          message: `Error: ${error.message || 'Unknown error occurred'}`
        }
      }));
    } finally {
      setTestingConnection(prev => ({ ...prev, [provider]: false }));
    }
  };
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          LLM Provider Settings
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Configure connections to local and remote language model providers
        </Typography>
      </Grid>
      
      {/* LM Studio Settings */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">LM Studio</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={testingConnection.lmStudio ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={() => testConnection('lmStudio')}
                disabled={testingConnection.lmStudio}
              >
                Test Connection
              </Button>
            </Box>
            
            {connectionStatus.lmStudio && (
              <Alert 
                severity={connectionStatus.lmStudio.connected ? 'success' : 'error'}
                sx={{ mb: 2 }}
                icon={connectionStatus.lmStudio.connected ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                {connectionStatus.lmStudio.message}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={settings.api.lmStudio.apiUrl}
                  onChange={(e) => handleProviderChange('lmStudio', 'apiUrl', e.target.value)}
                  placeholder="http://localhost:1234"
                  helperText="LM Studio API endpoint"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={settings.api.lmStudio.apiKey}
                  onChange={(e) => handleProviderChange('lmStudio', 'apiKey', e.target.value)}
                  placeholder="Optional"
                  helperText="Leave empty if not using authentication"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default Model"
                  value={settings.api.lmStudio.defaultModel}
                  onChange={(e) => handleProviderChange('lmStudio', 'defaultModel', e.target.value)}
                  placeholder="model-name"
                  helperText="Name of the default model to use"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.api.lmStudio.enabled !== false} // Default to true if undefined
                      onChange={(e) => handleProviderChange('lmStudio', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable LM Studio"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Ollama Settings */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">Ollama</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={testingConnection.ollama ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={() => testConnection('ollama')}
                disabled={testingConnection.ollama}
              >
                Test Connection
              </Button>
            </Box>
            
            {connectionStatus.ollama && (
              <Alert 
                severity={connectionStatus.ollama.connected ? 'success' : 'error'}
                sx={{ mb: 2 }}
                icon={connectionStatus.ollama.connected ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                {connectionStatus.ollama.message}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={settings.api.ollama.apiUrl}
                  onChange={(e) => handleProviderChange('ollama', 'apiUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  helperText="Ollama API endpoint"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default Model"
                  value={settings.api.ollama.defaultModel}
                  onChange={(e) => handleProviderChange('ollama', 'defaultModel', e.target.value)}
                  placeholder="llama2"
                  helperText="Name of the default model to use"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.api.ollama.enabled !== false} // Default to true if undefined
                      onChange={(e) => handleProviderChange('ollama', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Ollama"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Agora LLM Settings */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">Agora</Typography>
                <Tooltip title="Agora is a unified API for accessing various commercial LLM providers">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={testingConnection.agora ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={() => testConnection('agora')}
                disabled={testingConnection.agora}
              >
                Test Connection
              </Button>
            </Box>
            
            {connectionStatus.agora && (
              <Alert 
                severity={connectionStatus.agora.connected ? 'success' : 'error'}
                sx={{ mb: 2 }}
                icon={connectionStatus.agora.connected ? <CheckCircleIcon /> : <ErrorIcon />}
              >
                {connectionStatus.agora.message}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={settings.api.agora?.apiKey || ''}
                  onChange={(e) => handleProviderChange('agora', 'apiKey', e.target.value)}
                  placeholder="Your Agora API Key"
                  helperText="Required for Agora API access"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="agora-model-label">Default Provider</InputLabel>
                  <Select
                    labelId="agora-model-label"
                    value={settings.api.agora?.defaultProvider || 'openai'}
                    label="Default Provider"
                    onChange={(e) => handleProviderChange('agora', 'defaultProvider', e.target.value)}
                  >
                    <MenuItem value="openai">OpenAI</MenuItem>
                    <MenuItem value="anthropic">Anthropic</MenuItem>
                    <MenuItem value="google">Google (Gemini)</MenuItem>
                    <MenuItem value="cohere">Cohere</MenuItem>
                    <MenuItem value="mistral">Mistral AI</MenuItem>
                  </Select>
                  <FormHelperText>Select the default LLM provider</FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default Model"
                  value={settings.api.agora?.defaultModel || 'gpt-4'}
                  onChange={(e) => handleProviderChange('agora', 'defaultModel', e.target.value)}
                  placeholder="gpt-4"
                  helperText="Name of the default model to use"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.api.agora?.enabled || false}
                      onChange={(e) => handleProviderChange('agora', 'enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Agora"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
