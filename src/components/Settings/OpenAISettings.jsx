import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box, Paper, Typography, TextField, Button, Switch,
  FormControlLabel, Card, CardContent, Alert, CircularProgress,
  Divider, Grid, Chip
} from '@mui/material';
import { updateOpenAISettings } from '../../store/actions/settingsActions';
import { addNotification } from '../../store/actions/systemActions';

/**
 * OpenAI Settings component
 * Manages OpenAI API key and uplink WebSocket connections
 */
const OpenAISettings = () => {
  const dispatch = useDispatch();
  const openaiSettings = useSelector(state => state.settings.openai) || {};
  
  const [apiKey, setApiKey] = useState(openaiSettings.apiKey || '');
  const [orgId, setOrgId] = useState(openaiSettings.organizationId || '');
  const [isEnabled, setIsEnabled] = useState(openaiSettings.enabled || false);
  const [connectToUplink, setConnectToUplink] = useState(openaiSettings.connectToUplink || false);
  const [uplinkStatus, setUplinkStatus] = useState('disconnected');
  const [uplinkUrl, setUplinkUrl] = useState(openaiSettings.websocketUrl || 'ws://localhost:3002');
  const [availableGpts, setAvailableGpts] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [lastKeyTest, setLastKeyTest] = useState(null);
  
  // WebSocket connection
  const [socket, setSocket] = useState(null);
  
  // Initialize from stored settings
  useEffect(() => {
    if (openaiSettings) {
      setApiKey(openaiSettings.apiKey || '');
      setOrgId(openaiSettings.organizationId || '');
      setIsEnabled(openaiSettings.enabled || false);
      setConnectToUplink(openaiSettings.connectToUplink || false);
      setUplinkUrl(openaiSettings.websocketUrl || 'ws://localhost:3002');
    }
  }, [openaiSettings]);
  
  // Handle uplink WebSocket connection
  useEffect(() => {
    let ws = null;
    
    if (connectToUplink && isEnabled) {
      setIsLoading(true);
      setConnectionError(null);
      
      try {
        ws = new WebSocket(uplinkUrl);
        
        ws.onopen = () => {
          setUplinkStatus('connected');
          setConnectionError(null);
          setIsLoading(false);
          
          // Register API key with the uplink server
          if (apiKey) {
            ws.send(JSON.stringify({
              type: 'register_api_key',
              apiKey
            }));
          }
          
          // Request available GPTs
          ws.send(JSON.stringify({
            type: 'get_available_gpts'
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'api_key_registered':
                dispatch(addNotification({
                  type: 'success',
                  message: 'API Key registered with uplink server'
                }));
                break;
                
              case 'available_gpts':
                setAvailableGpts(message.gpts || []);
                break;
                
              case 'gpt_registered':
                // A new GPT was registered, refresh the list
                ws.send(JSON.stringify({
                  type: 'get_available_gpts'
                }));
                
                dispatch(addNotification({
                  type: 'info',
                  message: `New GPT registered: ${message.name}`
                }));
                break;
                
              default:
                // Unhandled message type
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onclose = () => {
          setUplinkStatus('disconnected');
          setIsLoading(false);
        };
        
        ws.onerror = (error) => {
          setConnectionError('Failed to connect to uplink server');
          setUplinkStatus('error');
          setIsLoading(false);
          console.error('WebSocket error:', error);
        };
        
        setSocket(ws);
      } catch (error) {
        setConnectionError(`Connection error: ${error.message}`);
        setUplinkStatus('error');
        setIsLoading(false);
      }
    } else if (socket) {
      // Close the socket if uplink is disabled
      socket.close();
      setSocket(null);
      setUplinkStatus('disconnected');
    }
    
    // Clean up on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectToUplink, isEnabled, uplinkUrl, apiKey, dispatch]);
  
  /**
   * Save OpenAI settings to Redux store
   */
  const saveSettings = () => {
    const settings = {
      apiKey,
      organizationId: orgId,
      enabled: isEnabled,
      connectToUplink,
      websocketUrl: uplinkUrl
    };
    
    dispatch(updateOpenAISettings(settings));
    
    dispatch(addNotification({
      type: 'success',
      message: 'OpenAI settings saved'
    }));
  };
  
  /**
   * Test the OpenAI API key
   */
  const testApiKey = async () => {
    if (!apiKey) {
      setConnectionError('Please enter an API key');
      return;
    }
    
    setIsTestingKey(true);
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(orgId ? { 'OpenAI-Organization': orgId } : {})
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setLastKeyTest({
          success: true,
          message: 'API key is valid',
          timestamp: new Date().toLocaleString(),
          models: data.data ? data.data.length : 0
        });
        setConnectionError(null);
        
        // Auto-enable if test was successful
        setIsEnabled(true);
      } else {
        setLastKeyTest({
          success: false,
          message: data.error?.message || 'API key validation failed',
          timestamp: new Date().toLocaleString(),
          error: data.error
        });
        setConnectionError(data.error?.message || 'API key validation failed');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setLastKeyTest({
        success: false,
        message: `Error: ${error.message}`,
        timestamp: new Date().toLocaleString(),
        error
      });
      setConnectionError(`Error testing API key: ${error.message}`);
    } finally {
      setIsTestingKey(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>OpenAI Configuration</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>API Settings</Typography>
              
              <TextField
                label="API Key"
                type="password"
                fullWidth
                margin="normal"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
              
              <TextField
                label="Organization ID (optional)"
                fullWidth
                margin="normal"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                helperText="Only required for enterprise accounts"
              />
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={testApiKey}
                  disabled={!apiKey || isTestingKey}
                >
                  {isTestingKey ? <CircularProgress size={24} /> : 'Test API Key'}
                </Button>
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={isEnabled}
                      onChange={(e) => setIsEnabled(e.target.checked)}
                    />
                  }
                  label="Enable OpenAI Integration"
                />
              </Box>
              
              {lastKeyTest && (
                <Alert 
                  severity={lastKeyTest.success ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                >
                  {lastKeyTest.message}
                  <Typography variant="caption" display="block">
                    Tested at {lastKeyTest.timestamp}
                  </Typography>
                  
                  {lastKeyTest.success && (
                    <Typography variant="body2">
                      {lastKeyTest.models} models available
                    </Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Uplink WebSocket</Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Connect to the OpenAI uplink WebSocket server to interact with OpenAI Custom GPTs
              </Typography>
              
              <TextField
                label="WebSocket URL"
                fullWidth
                margin="normal"
                value={uplinkUrl}
                onChange={(e) => setUplinkUrl(e.target.value)}
                placeholder="ws://localhost:3002"
              />
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip 
                  label={uplinkStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  color={uplinkStatus === 'connected' ? 'success' : uplinkStatus === 'error' ? 'error' : 'default'}
                  variant="outlined"
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={connectToUplink}
                      onChange={(e) => setConnectToUplink(e.target.checked)}
                      disabled={!isEnabled}
                    />
                  }
                  label="Connect to Uplink"
                />
              </Box>
              
              {connectionError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {connectionError}
                </Alert>
              )}
              
              {uplinkStatus === 'connected' && availableGpts.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Available Custom GPTs ({availableGpts.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {availableGpts.map(gpt => (
                      <Chip 
                        key={gpt.id} 
                        label={gpt.name} 
                        color="primary" 
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 3 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={saveSettings}
          disabled={isLoading}
        >
          Save Settings
        </Button>
      </Box>
    </Paper>
  );
};

export default OpenAISettings;
