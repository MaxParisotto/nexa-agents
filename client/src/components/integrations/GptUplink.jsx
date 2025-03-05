import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Switch,
  FormControlLabel, Alert, CircularProgress, Divider,
  Select, MenuItem, FormControl, InputLabel, Grid,
  Chip, Tooltip, IconButton, Card, CardContent, CardActions,
  OutlinedInput, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import InfoIcon from '@mui/icons-material/Info';
import PublicIcon from '@mui/icons-material/Public';
import TerminalIcon from '@mui/icons-material/Terminal';

import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';

/**
 * GPT Uplink Component for exposing local LLM providers via WebSocket API
 * This allows external GPT models to connect via actions and schema
 */
export default function GptUplink() {
  // Get settings from context
  const { settings, updateSection } = useSettings();
  
  // State for the component
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [serverRunning, setServerRunning] = useState(false);
  const [serverLogs, setServerLogs] = useState([]);
  const [connectedClients, setConnectedClients] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const logsEndRef = useRef(null);
  
  // State for uplink configuration
  const [uplinkConfig, setUplinkConfig] = useState({
    enabled: false,
    port: 3003,
    host: '0.0.0.0',
    requireApiKey: true,
    apiKey: '',
    allowedOrigins: ['*'],
    corsEnabled: true,
    rateLimit: 100, // requests per minute
    logLevel: 'info', // debug, info, warning, error
    schema: {
      name: 'Nexa LLM API',
      description: 'Access to local LLM models via WebSocket API',
      version: '1.0.0',
      exposeLlmModels: true,
      exposeMetadata: true,
    },
    availableProviders: [] // Will be populated from llmProviders
  });

  // Load uplink settings from global settings
  useEffect(() => {
    if (settings && settings.uplink) {
      setUplinkConfig(prev => ({
        ...prev,
        ...settings.uplink
      }));
    }
  }, [settings]);

  // Get available LLM providers from settings
  useEffect(() => {
    if (settings && settings.llmProviders) {
      // Get enabled providers with their available models
      const enabledProviders = settings.llmProviders
        .filter(p => p.enabled)
        .map(({ id, name, type, models, defaultModel }) => ({
          id,
          name,
          type,
          models,
          defaultModel,
          exposed: uplinkConfig.availableProviders?.some(p => p.id === id)?.exposed || false
        }));
      
      setUplinkConfig(prev => ({
        ...prev,
        availableProviders: enabledProviders
      }));
    }
  }, [settings?.llmProviders]);

  // Scroll logs to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serverLogs]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUplinkConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle number input with bounds
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    let numValue = parseInt(value, 10);
    
    // Apply bounds based on field
    if (name === 'port') {
      numValue = Math.max(1024, Math.min(65535, numValue));
    } else if (name === 'rateLimit') {
      numValue = Math.max(1, Math.min(1000, numValue));
    }
    
    setUplinkConfig(prev => ({
      ...prev,
      [name]: numValue
    }));
  };
  
  // Handle nested setting change (schema properties)
  const handleSchemaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUplinkConfig(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  // Add allowed origin
  const handleAddOrigin = () => {
    const newOrigin = document.getElementById('new-origin').value.trim();
    if (newOrigin && !uplinkConfig.allowedOrigins.includes(newOrigin)) {
      setUplinkConfig(prev => ({
        ...prev,
        allowedOrigins: [...prev.allowedOrigins, newOrigin]
      }));
      document.getElementById('new-origin').value = '';
    }
  };
  
  // Remove allowed origin
  const handleRemoveOrigin = (origin) => {
    setUplinkConfig(prev => ({
      ...prev,
      allowedOrigins: prev.allowedOrigins.filter(o => o !== origin)
    }));
  };

  // Toggle provider exposure to API
  const handleToggleProvider = (providerId) => {
    setUplinkConfig(prev => ({
      ...prev,
      availableProviders: prev.availableProviders.map(p =>
        p.id === providerId ? { ...p, exposed: !p.exposed } : p
      )
    }));
  };
  
  // Generate a secure API key
  const generateApiKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = 'nexa_';
    
    for (let i = 0; i < 32; i++) {
      apiKey += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    setUplinkConfig(prev => ({
      ...prev,
      apiKey
    }));
  };

  // Start WebSocket server
  const startServer = async () => {
    setError(null);
    setSuccess(null);
    
    // Validate configuration
    if (uplinkConfig.requireApiKey && !uplinkConfig.apiKey) {
      setError('API Key is required when authentication is enabled');
      return;
    }
    
    if (!uplinkConfig.availableProviders.some(p => p.exposed)) {
      setError('At least one LLM provider must be exposed');
      return;
    }
    
    try {
      // Start the uplink server
      const response = await apiService.post('/api/uplink/start', uplinkConfig);
      
      if (response.error) {
        throw new Error(response.error);
      }

      addLog('info', 'Starting WebSocket server...');
      addLog('info', `Binding to ${uplinkConfig.host}:${uplinkConfig.port}`);
      
      const exposedProviders = uplinkConfig.availableProviders.filter(p => p.exposed);
      for (const provider of exposedProviders) {
        addLog('info', `Registering provider: ${provider.name} (${provider.models.length} models)`);
      }
      
      addLog('info', 'Initializing schema registry');
      addLog('success', `Server is running at ws://${uplinkConfig.host}:${uplinkConfig.port}`);
      
      setServerRunning(true);
      setSuccess(`Uplink server is now running on port ${uplinkConfig.port}`);
      
      // Start polling server stats
      pollServerStats();
      
    } catch (error) {
      setError(`Failed to start server: ${error.message}`);
      addLog('error', `Server start failed: ${error.message}`);
    }
  };
  
  // Stop WebSocket server
  const stopServer = async () => {
    setError(null);
    setSuccess(null);
    
    try {
      // Stop the uplink server
      const response = await apiService.post('/api/uplink/stop');
      
      if (response.error) {
        throw new Error(response.error);
      }

      addLog('info', 'Stopping server...');
      addLog('info', 'Closing active connections...');
      addLog('info', 'Unregistering providers...');
      addLog('info', 'Server stopped');
      
      setServerRunning(false);
      setConnectedClients(0);
      setSuccess('Uplink server has been stopped');
      
      // Stop polling server stats
      if (window.statsInterval) {
        clearInterval(window.statsInterval);
        window.statsInterval = null;
      }
      
    } catch (error) {
      setError(`Failed to stop server: ${error.message}`);
      addLog('error', `Server stop failed: ${error.message}`);
    }
  };

  // Poll server stats
  const pollServerStats = async () => {
    const pollStats = async () => {
      try {
        const response = await apiService.get('/api/uplink/stats');
        if (response.data) {
          setConnectedClients(response.data.connectedClients);
          setTotalRequests(response.data.totalRequests);
          
          // Add log entries for new requests if any
          if (response.data.recentLogs) {
            response.data.recentLogs.forEach(log => {
              addLog(log.level, log.message);
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch server stats:', error);
      }
    };

    // Poll every 3 seconds
    window.statsInterval = setInterval(pollStats, 3000);
    
    // Initial poll
    pollStats();
  };

  // Save uplink settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save settings to backend
      const response = await apiService.post('/api/uplink/settings', uplinkConfig);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update settings in context
      await updateSection('uplink', uplinkConfig);
      
      // If server is running, update its settings
      if (serverRunning) {
        await apiService.post('/api/uplink/update', uplinkConfig);
        addLog('info', 'Server settings updated');
      }

      setSuccess("Uplink settings saved successfully");
    } catch (err) {
      setError(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (window.statsInterval) {
        clearInterval(window.statsInterval);
        window.statsInterval = null;
      }
    };
  }, []);

  // Add log entry with timestamp
  const addLog = (level, message) => {
    const timestamp = new Date().toISOString();
    setServerLogs(prev => [...prev, { level, message, timestamp }]);
  };
  
  // Clear server logs
  const clearLogs = () => {
    setServerLogs([]);
  };
  
  // Get the log level color
  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'error.main';
      case 'warning': return 'warning.main';
      case 'success': return 'success.main';
      case 'info': default: return 'info.main';
    }
  };
  
  // Get counts of exposed models
  const getExposedModelCount = () => {
    let count = 0;
    uplinkConfig.availableProviders.forEach(provider => {
      if (provider.exposed && provider.models) {
        count += provider.models.length;
      }
    });
    return count;
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>GPT Uplink</Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        GPT Uplink creates a WebSocket server that external GPT models can connect to for accessing your local LLMs via actions and schema.
        This allows ChatGPT and external clients to use your local models without sharing your data with OpenAI.
      </Alert>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Server Status Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Server Status</Typography>
              <Chip 
                label={serverRunning ? "Running" : "Stopped"} 
                color={serverRunning ? "success" : "default"}
              />
            </Box>
            
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Port:</strong> {uplinkConfig.port}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Host:</strong> {uplinkConfig.host}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Authentication:</strong> {uplinkConfig.requireApiKey ? "Required" : "Disabled"}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>CORS:</strong> {uplinkConfig.corsEnabled ? "Enabled" : "Disabled"}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Exposed Models:</strong> {getExposedModelCount()}
              </Typography>
            </Box>
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Metrics:</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Connected Clients:</Typography>
                <Typography variant="body2" fontWeight="bold">{connectedClients}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total Requests:</Typography>
                <Typography variant="body2" fontWeight="bold">{totalRequests}</Typography>
              </Box>
            </Box>
            
            <Box sx={{ mt: 'auto', pt: 2 }}>
              {serverRunning ? (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopServer}
                >
                  Stop Server
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={startServer}
                  disabled={!uplinkConfig.enabled}
                >
                  Start Server
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Server Logs Card */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Server Logs</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={clearLogs}
                disabled={serverLogs.length === 0}
              >
                Clear Logs
              </Button>
            </Box>
            
            <Box 
              sx={{ 
                flexGrow: 1, 
                bgcolor: 'background.default',
                borderRadius: 1,
                p: 1,
                overflowY: 'auto',
                height: '300px',
                fontFamily: 'monospace'
              }}
            >
              {serverLogs.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">No logs available</Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {serverLogs.map((log, index) => (
                    <ListItem key={index} dense disablePadding sx={{ py: 0.2 }}>
                      <ListItemText 
                        primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                        primary={
                          <React.Fragment>
                            <span style={{ color: 'grey' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span style={{ color: getLogColor(log.level), marginLeft: '8px', marginRight: '8px' }}>
                              [{log.level.toUpperCase()}]
                            </span>
                            {log.message}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                  ))}
                  <div ref={logsEndRef} />
                </List>
              )}
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip icon={<PublicIcon />} label="WebSocket API" color="primary" variant="outlined" />
              <Chip icon={<TerminalIcon />} label="JSON Schema" color="primary" variant="outlined" />
              <Chip icon={<CodeIcon />} label="OpenAPI" color="primary" variant="outlined" />
            </Box>
          </Paper>
        </Grid>
        
        {/* Server Configuration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Uplink Configuration</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={uplinkConfig.enabled}
                      onChange={handleChange}
                      name="enabled"
                    />
                  }
                  label="Enable WebSocket Server"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Port"
                  name="port"
                  type="number"
                  value={uplinkConfig.port}
                  onChange={handleNumberChange}
                  disabled={!uplinkConfig.enabled || serverRunning}
                  inputProps={{ min: 1024, max: 65535 }}
                  helperText="Port to run the WebSocket server on (1024-65535)"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Host"
                  name="host"
                  value={uplinkConfig.host}
                  onChange={handleChange}
                  disabled={!uplinkConfig.enabled || serverRunning}
                  helperText="Host to bind to (0.0.0.0 for all interfaces, 127.0.0.1 for local only)"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Rate Limit"
                  name="rateLimit"
                  type="number"
                  value={uplinkConfig.rateLimit}
                  onChange={handleNumberChange}
                  disabled={!uplinkConfig.enabled || serverRunning}
                  inputProps={{ min: 1, max: 1000 }}
                  helperText="Maximum requests per minute allowed"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!uplinkConfig.enabled || serverRunning}>
                  <InputLabel>Log Level</InputLabel>
                  <Select
                    name="logLevel"
                    value={uplinkConfig.logLevel}
                    onChange={handleChange}
                    label="Log Level"
                  >
                    <MenuItem value="debug">Debug</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="warning">Warning</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary">
                    Level of detail for server logs
                  </Typography>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={uplinkConfig.corsEnabled}
                      onChange={handleChange}
                      name="corsEnabled"
                      disabled={!uplinkConfig.enabled || serverRunning}
                    />
                  }
                  label="Enable CORS"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Allow cross-origin requests to the server
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>Authentication</Typography>
                
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={uplinkConfig.requireApiKey}
                        onChange={handleChange}
                        name="requireApiKey"
                        disabled={!uplinkConfig.enabled || serverRunning}
                      />
                    }
                    label="Require API Key Authentication"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="API Key"
                      name="apiKey"
                      value={uplinkConfig.apiKey}
                      onChange={handleChange}
                      type="password"
                      disabled={!uplinkConfig.enabled || !uplinkConfig.requireApiKey || serverRunning}
                      helperText={
                        uplinkConfig.requireApiKey 
                        ? "API key for authenticating clients" 
                        : "Authentication is disabled"
                      }
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={generateApiKey}
                      disabled={!uplinkConfig.enabled || !uplinkConfig.requireApiKey || serverRunning}
                    >
                      Generate API Key
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>Allowed Origins</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <TextField
                    id="new-origin"
                    label="Add Origin"
                    placeholder="https://example.com"
                    disabled={!uplinkConfig.enabled || serverRunning}
                    sx={{ flexGrow: 1, mr: 1 }}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleAddOrigin}
                    disabled={!uplinkConfig.enabled || serverRunning}
                    sx={{ mt: 1 }}
                  >
                    <AddIcon />
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {uplinkConfig.allowedOrigins.map((origin, index) => (
                    <Chip
                      key={index}
                      label={origin}
                      onDelete={serverRunning ? undefined : () => handleRemoveOrigin(origin)}
                      disabled={serverRunning}
                    />
                  ))}
                  {uplinkConfig.allowedOrigins.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No origins added. Add origins to restrict which websites can connect to the server.
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>API Schema Configuration</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Name"
                      name="name"
                      value={uplinkConfig.schema.name}
                      onChange={handleSchemaChange}
                      disabled={!uplinkConfig.enabled || serverRunning}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Version"
                      name="version"
                      value={uplinkConfig.schema.version}
                      onChange={handleSchemaChange}
                      disabled={!uplinkConfig.enabled || serverRunning}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="API Description"
                      name="description"
                      value={uplinkConfig.schema.description}
                      onChange={handleSchemaChange}
                      multiline
                      rows={2}
                      disabled={!uplinkConfig.enabled || serverRunning}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={uplinkConfig.schema.exposeLlmModels}
                          onChange={handleSchemaChange}
                          name="exposeLlmModels"
                          disabled={!uplinkConfig.enabled || serverRunning}
                        />
                      }
                      label="Expose LLM Models in Schema"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={uplinkConfig.schema.exposeMetadata}
                          onChange={handleSchemaChange}
                          name="exposeMetadata"
                          disabled={!uplinkConfig.enabled || serverRunning}
                        />
                      }
                      label="Expose Provider Metadata"
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={saving ? <CircularProgress size={24} /> : <SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={saving || serverRunning}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Providers Configuration */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>LLM Provider Exposure</Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Configure which local LLM providers and models should be exposed via the WebSocket API.
              External GPT models and clients will be able to use these providers through the uplink.
            </Alert>
            
            {uplinkConfig.availableProviders.length === 0 ? (
              <Alert severity="warning">
                No LLM providers configured. Add providers in the Settings section first.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {uplinkConfig.availableProviders.map((provider) => (
                  <Grid item xs={12} md={6} key={provider.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2
                        }}>
                          <Typography variant="h6">{provider.name}</Typography>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={provider.exposed}
                                onChange={() => handleToggleProvider(provider.id)}
                                disabled={!uplinkConfig.enabled || serverRunning}
                              />
                            }
                            label="Exposed"
                          />
                        </Box>
                        
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Provider Type: {provider.type}
                        </Typography>
                        
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                          Available Models:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                          {provider.models && provider.models.length > 0 ? (
                            provider.models.map((model, index) => (
                              <Chip 
                                key={index} 
                                label={model} 
                                size="small" 
                                variant={model === provider.defaultModel ? "filled" : "outlined"}
                                color="primary"
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No models available
                            </Typography>
                          )}
                        </Box>
                        
                        {provider.exposed && provider.defaultModel && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Default Model: <strong>{provider.defaultModel}</strong>
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={saving ? <CircularProgress size={24} /> : <SaveIcon />}
                      onClick={handleSaveSettings}
                      disabled={saving || !uplinkConfig.enabled || !uplinkConfig.apiKey}
                    >
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
