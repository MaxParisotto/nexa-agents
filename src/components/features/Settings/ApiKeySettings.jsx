import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { updateSettings } from '../../store/actions/settingsActions';
import apiClient from '../../utils/apiClient';

const ApiKeySettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [apiKeys, setApiKeys] = useState({
    openaiApiKey: '',
    anthropicApiKey: '',
    googleApiKey: '',
    azureOpenaiApiKey: '',
  });
  
  // Load keys from state when component mounts
  useEffect(() => {
    if (settings && settings.data) {
      setApiKeys({
        openaiApiKey: settings.data.openaiApiKey || '',
        anthropicApiKey: settings.data.anthropicApiKey || '',
        googleApiKey: settings.data.googleApiKey || '',
        azureOpenaiApiKey: settings.data.azureOpenaiApiKey || '',
      });
    }
  }, [settings]);
  
  const handleChange = (event) => {
    const { name, value } = event.target;
    setApiKeys(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // Update settings through Redux which will call the API
      await dispatch(updateSettings({
        ...settings.data,
        ...apiKeys
      }));
      
      setNotification({
        open: true,
        message: 'API keys saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save API keys:', error);
      setNotification({
        open: true,
        message: `Error saving API keys: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  // Verify an API key with a quick test
  const verifyApiKey = async (provider) => {
    try {
      setLoading(true);
      
      const keyName = `${provider}ApiKey`;
      const keyValue = apiKeys[keyName];
      
      if (!keyValue) {
        setNotification({
          open: true,
          message: `Please enter an API key for ${provider} first`,
          severity: 'warning'
        });
        return;
      }
      
      // Call API to verify the key
      const response = await apiClient.settings.verifyApiKey({
        provider,
        apiKey: keyValue
      });
      
      if (response.valid) {
        setNotification({
          open: true,
          message: `${provider} API key is valid!`,
          severity: 'success'
        });
      } else {
        setNotification({
          open: true,
          message: `${provider} API key is invalid: ${response.error}`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error(`Failed to verify ${provider} API key:`, error);
      setNotification({
        open: true,
        message: `Error verifying ${provider} API key: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>API Keys</Typography>
      
      {settings.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {settings.error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="openaiApiKey"
              label="OpenAI API Key"
              type="password"
              variant="outlined"
              placeholder="sk-..."
              value={apiKeys.openaiApiKey}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => verifyApiKey('openai')}
                    disabled={loading}
                  >
                    Verify
                  </Button>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="anthropicApiKey"
              label="Anthropic API Key"
              type="password"
              variant="outlined"
              placeholder="sk-ant-..."
              value={apiKeys.anthropicApiKey}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => verifyApiKey('anthropic')}
                    disabled={loading}
                  >
                    Verify
                  </Button>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="googleApiKey"
              label="Google AI API Key"
              type="password"
              variant="outlined"
              value={apiKeys.googleApiKey}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => verifyApiKey('google')}
                    disabled={loading}
                  >
                    Verify
                  </Button>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              name="azureOpenaiApiKey"
              label="Azure OpenAI API Key"
              type="password"
              variant="outlined"
              value={apiKeys.azureOpenaiApiKey}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => verifyApiKey('azureOpenai')}
                    disabled={loading}
                  >
                    Verify
                  </Button>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={saveSettings}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Saving...' : 'Save API Keys'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApiKeySettings;
