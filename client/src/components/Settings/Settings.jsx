import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Tabs, Tab, TextField,
  Button, Switch, FormControlLabel, Divider,
  List, ListItem, ListItemText, ListSubheader,
  Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Alert, CircularProgress, IconButton, Tooltip,
  Card, CardContent, CardActions, Collapse, Chip
} from '@mui/material';
// Remove MuiColorInput import
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import KeyIcon from '@mui/icons-material/Key';

import { apiService } from '../../services/api';

/**
 * Settings Component - Handles both direct API connections and local state
 */
export default function Settings() {
  // State for tab management
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    theme: {
      darkMode: false,
      primaryColor: '#673ab7',
      secondaryColor: '#ffc107',
      fontSize: 'medium'
    },
    notifications: {
      enabled: true,
      sound: true,
      desktop: true,
      email: {
        enabled: false,
        frequency: 'daily',
        types: ['important', 'mentions']
      }
    },
    llmProviders: [
      // LLM providers will be fetched from API
    ],
    system: {
      loggingLevel: 'info',
      metrics: true,
      autoUpdate: true,
      concurrency: 3
    }
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState(null);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle settings change
  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };
  
  // Handle nested settings change (like email.enabled)
  const handleNestedSettingChange = (section, parent, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...prev[section][parent],
          [key]: value
        }
      }
    }));
  };
  
  // Handle adding a new LLM provider - now with default values for local providers
  const handleAddProvider = () => {
    const newProvider = {
      id: `provider-${Date.now()}`,
      name: '',
      type: 'ollama', // Default to Ollama
      apiKey: '',
      baseUrl: 'http://localhost:11434', // Default Ollama URL
      models: [],
      enabled: true
    };
    
    setCurrentProvider(newProvider);
    setDialogOpen(true);
  };

  // Update provider type with appropriate default URL
  const handleProviderTypeChange = (e) => {
    const type = e.target.value;
    let baseUrl = '';
    
    // Set default URLs based on provider type
    if (type === 'ollama') {
      baseUrl = 'http://localhost:11434';
    } else if (type === 'lmstudio') {
      baseUrl = 'http://localhost:1234/v1';
    }
    
    setCurrentProvider(prev => ({ 
      ...prev, 
      type,
      baseUrl,
      models: [] // Clear models when type changes
    }));
  };

  // Save provider changes
  const handleSaveProvider = () => {
    if (currentProvider) {
      // If there's only one model available and no default set, automatically set it as default
      let providerToSave = {...currentProvider};
      if (providerToSave.models?.length === 1 && !providerToSave.defaultModel) {
        providerToSave.defaultModel = providerToSave.models[0];
      }
      
      // Add or update provider in the settings
      setSettings(prev => {
        const updatedProviders = prev.llmProviders.find(p => p.id === providerToSave.id)
          ? prev.llmProviders.map(p => p.id === providerToSave.id ? {...providerToSave, isNew: false} : p)
          : [...prev.llmProviders, {...providerToSave, isNew: false}];
          
        return {
          ...prev,
          llmProviders: updatedProviders
        };
      });
    }
    setDialogOpen(false);
    setCurrentProvider(null);
    setModelError(null);
  };
  
  // Delete provider
  const handleDeleteProvider = (providerId) => {
    setSettings(prev => ({
      ...prev,
      llmProviders: prev.llmProviders.filter(p => p.id !== providerId)
    }));
  };
  
  // Handle provider expansion toggle
  const handleExpandProvider = (providerId) => {
    setExpandedProvider(expandedProvider === providerId ? null : providerId);
  };
  
  // Error handling with helpful messages for connection issues
  const handleConnectionError = (err) => {
    console.error('Connection error:', err);
    
    // Check if the error is CORS related
    if (err.message && err.message.includes('CORS')) {
      return 'CORS error: The server refused the connection. Make sure CORS is enabled on your LLM provider.';
    }
    
    // Network errors
    if (err.message && err.message.includes('NetworkError') || err.message.includes('Network Error')) {
      return 'Network error: Could not connect to the provider. Please check if the service is running.';
    }
    
    // Fall back to the error message or a generic message
    return err.message || 'Connection failed. Please check your settings and try again.';
  };
  
  // Test provider connection with proper error handling
  const handleTestProvider = async (provider) => {
    setTestingProvider(provider.id);
    setTestResult(null);
    
    try {
      // Direct API call based on provider type
      const response = await apiService.testIntegration(provider.type, {
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl
      });
      
      const success = response?.data?.success;
      const message = response?.data?.message || (success ? 'Connection successful' : 'Connection failed');
      
      // Store the related provider ID in the test result to properly display it
      setTestResult({
        success,
        message,
        relatedProviderId: provider.id
      });
      
      // If connection successful and models were returned, update the provider
      if (success && response.data?.models?.length > 0) {
        // If we're in the dialog, update the currentProvider state
        if (currentProvider && currentProvider.id === provider.id) {
          setCurrentProvider(prev => ({
            ...prev,
            models: response.data.models
          }));
        }
        
        // Update the provider in the settings state
        setSettings(prev => ({
          ...prev,
          llmProviders: prev.llmProviders.map(p => 
            p.id === provider.id 
              ? {...p, models: response.data.models} 
              : p
          )
        }));
      }
    } catch (err) {
      const errorMessage = handleConnectionError(err);
      setTestResult({
        success: false,
        message: errorMessage,
        relatedProviderId: provider.id
      });
    } finally {
      setTestingProvider(null);
    }
  };
  
  // Fetch models with proper error handling
  const fetchProviderModels = async (provider) => {
    if (!provider || !provider.baseUrl) return;
    
    setLoadingModels(true);
    setModelError(null);
    
    try {
      const response = await apiService.getProviderModels(provider.type, {
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl
      });
      
      if (response?.data?.success && response.data.models?.length > 0) {
        // Update provider with fetched models
        setCurrentProvider(prev => ({
          ...prev,
          models: response.data.models
        }));
      } else {
        setModelError("No models found. Make sure the provider is running and properly configured.");
      }
    } catch (err) {
      const errorMessage = handleConnectionError(err);
      setModelError(`Failed to retrieve models: ${errorMessage}`);
    } finally {
      setLoadingModels(false);
    }
  };
  
  // Save settings - simplified now that apiService handles fallbacks
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // The updated apiService.updateSettings handles saving to localStorage if backend is unavailable
      await apiService.updateSettings(settings);
      setSuccess(true);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Modified fetch settings - now using the more robust api service
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // The updated apiService.getSettings already handles all the fallbacks
        const response = await apiService.getSettings();
        if (response && response.data) {
          setSettings(response.data);
        }
      } catch (error) {
        console.error("Unexpected settings error:", error);
        setError("Could not initialize settings. Using default values.");
      }
    };

    fetchSettings();
  }, []);
  
  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  // Available LLM provider types - only include local providers
  const providerTypes = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'lmstudio', label: 'LM Studio' },
  ];

  // Replace color picker component with standard text field
  const handleColorChange = (section, key, value) => {
    // Validate hex color format
    const isValidColor = /^#([0-9A-F]{3}){1,2}$/i.test(value);
    
    if (isValidColor || value === '') {
      handleSettingChange(section, key, value);
    }
  };

  // Handle base URL change for providers
  const handleBaseUrlChange = (e) => {
    const baseUrl = e.target.value;
    setCurrentProvider(prev => ({...prev, baseUrl}));
    
    // Clear models when base URL changes as they may no longer be valid
    if (prev => prev.models?.length > 0) {
      setCurrentProvider(prev => ({...prev, models: []}));
    }
  };

  // Handle setting a default model for a provider
  const handleSetDefaultModel = (providerId, modelName) => {
    setSettings(prev => ({
      ...prev,
      llmProviders: prev.llmProviders.map(p => 
        p.id === providerId 
          ? {...p, defaultModel: modelName} 
          : p
      )
    }));
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="General" />
          <Tab label="LLM Providers" />
          <Tab label="Notifications" />
          <Tab label="System" />
        </Tabs>
      </Paper>
      
      {/* General Settings */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Theme Settings</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.theme.darkMode}
                    onChange={(e) => handleSettingChange('theme', 'darkMode', e.target.checked)}
                  />
                }
                label="Dark Mode"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={settings.theme.fontSize}
                  onChange={(e) => handleSettingChange('theme', 'fontSize', e.target.value)}
                  label="Font Size"
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Primary Color</Typography>
              <TextField
                fullWidth
                value={settings.theme.primaryColor}
                onChange={(e) => handleColorChange('theme', 'primaryColor', e.target.value)}
                placeholder="#673ab7"
                helperText="Enter a hex color code (e.g. #673ab7)"
                InputProps={{
                  endAdornment: (
                    <Box 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        bgcolor: settings.theme.primaryColor,
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        ml: 1
                      }} 
                    />
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Secondary Color</Typography>
              <TextField
                fullWidth
                value={settings.theme.secondaryColor}
                onChange={(e) => handleColorChange('theme', 'secondaryColor', e.target.value)}
                placeholder="#ffc107"
                helperText="Enter a hex color code (e.g. #ffc107)"
                InputProps={{
                  endAdornment: (
                    <Box 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        bgcolor: settings.theme.secondaryColor,
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        ml: 1
                      }} 
                    />
                  )
                }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              Save Settings
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* LLM Provider Settings - Improved Layout */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>LLM Providers</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddProvider}
              size="medium"
            >
              Add Provider
            </Button>
          </Box>
          
          {settings.llmProviders.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              No LLM providers configured. Add a provider to get started.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {settings.llmProviders.map((provider) => (
                <Card key={provider.id} variant="outlined" sx={{ overflow: 'visible' }}>
                  <CardContent sx={{ pb: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      pb: 1,
                      mb: 2
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 500 }}>
                          {provider.name}
                        </Typography>
                        <Chip 
                          label={provider.enabled ? 'Enabled' : 'Disabled'} 
                          color={provider.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditProvider(provider)}
                          variant="outlined"
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteProvider(provider.id)}
                          color="error"
                          variant="outlined"
                        >
                          Remove
                        </Button>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={2} alignItems="flex-start">
                      {/* Provider Info Column */}
                      <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                          <Typography>
                            {providerTypes.find(t => t.value === provider.type)?.label || 'Custom'}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Base URL</Typography>
                          <Typography sx={{ overflowWrap: 'break-word' }}>
                            {provider.baseUrl || 'Not set'}
                          </Typography>
                        </Box>
                        
                        {provider.apiKey && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">API Key</Typography>
                            <Typography>••••••••••••••••</Typography>
                          </Box>
                        )}
                        
                        {/* Default Model Selection */}
                        {provider.models && provider.models.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Default Model</Typography>
                            <FormControl size="small" sx={{ mt: 0.5, minWidth: 120 }}>
                              <Select
                                value={provider.defaultModel || ''}
                                onChange={(e) => handleSetDefaultModel(provider.id, e.target.value)}
                                displayEmpty
                                sx={{ fontSize: '0.875rem' }}
                              >
                                <MenuItem value="">
                                  <em>None</em>
                                </MenuItem>
                                {provider.models.map((model) => (
                                  <MenuItem key={model} value={model}>
                                    {model}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        )}
                      </Grid>
                      
                      {/* Models Column */}
                      <Grid item xs={12} md={8}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Available Models
                        </Typography>
                        
                        {provider.models && provider.models.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                            {provider.models.map((model, index) => (
                              <Chip 
                                key={index} 
                                label={model} 
                                size="small" 
                                variant={model === provider.defaultModel ? "filled" : "outlined"}
                                color="primary"
                                onClick={() => handleSetDefaultModel(provider.id, model)}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No models detected. Try testing the connection.
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pt: 0, pb: 2 }}>
                    <Button 
                      size="small" 
                      onClick={() => handleTestProvider(provider)}
                      disabled={testingProvider === provider.id}
                      startIcon={testingProvider === provider.id ? <CircularProgress size={16} /> : null}
                      variant="contained"
                    >
                      {testingProvider === provider.id ? 'Testing...' : 'Test Connection'}
                    </Button>
                    
                    {testResult && testResult.relatedProviderId === provider.id && (
                      <Alert 
                        severity={testResult.success ? 'success' : 'error'}
                        sx={{ py: 0, px: 1 }}
                        size="small"
                      >
                        {testResult.message}
                      </Alert>
                    )}
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              Save Settings
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Notification Settings */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Notification Settings</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.enabled}
                    onChange={(e) => handleSettingChange('notifications', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Notifications"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.sound}
                    onChange={(e) => handleSettingChange('notifications', 'sound', e.target.checked)}
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Sound Notifications"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.desktop}
                    onChange={(e) => handleSettingChange('notifications', 'desktop', e.target.checked)}
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Desktop Notifications"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Email Notifications</Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.email.enabled}
                    onChange={(e) => handleNestedSettingChange('notifications', 'email', 'enabled', e.target.checked)}
                    disabled={!settings.notifications.enabled}
                  />
                }
                label="Email Notifications"
              />
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <FormControl 
                    fullWidth
                    disabled={!settings.notifications.enabled || !settings.notifications.email.enabled}
                  >
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={settings.notifications.email.frequency}
                      onChange={(e) => handleNestedSettingChange('notifications', 'email', 'frequency', e.target.value)}
                      label="Frequency"
                    >
                      <MenuItem value="immediate">Immediate</MenuItem>
                      <MenuItem value="hourly">Hourly Digest</MenuItem>
                      <MenuItem value="daily">Daily Digest</MenuItem>
                      <MenuItem value="weekly">Weekly Digest</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              Save Settings
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* System Settings */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>System Settings</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Logging Level</InputLabel>
                <Select
                  value={settings.system.loggingLevel}
                  onChange={(e) => handleSettingChange('system', 'loggingLevel', e.target.value)}
                  label="Logging Level"
                >
                  <MenuItem value="debug">Debug</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Concurrency"
                value={settings.system.concurrency}
                onChange={(e) => handleSettingChange('system', 'concurrency', parseInt(e.target.value, 10) || 1)}
                helperText="Maximum concurrent operations"
                InputProps={{ inputProps: { min: 1, max: 10 } }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.system.metrics}
                    onChange={(e) => handleSettingChange('system', 'metrics', e.target.checked)}
                  />
                }
                label="Enable System Metrics"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.system.autoUpdate}
                    onChange={(e) => handleSettingChange('system', 'autoUpdate', e.target.checked)}
                  />
                }
                label="Enable Auto Updates"
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              Save Settings
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Provider Dialog - Improved Layout */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentProvider?.id ? `Edit LLM Provider: ${currentProvider.name || 'New Provider'}` : 'Add LLM Provider'}
        </DialogTitle>
        <DialogContent dividers>
          {currentProvider && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Provider Name"
                  value={currentProvider.name}
                  onChange={(e) => setCurrentProvider({...currentProvider, name: e.target.value})}
                  required
                  placeholder={providerTypes.find(t => t.value === currentProvider.type)?.label || 'Provider'}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Provider Type</InputLabel>
                  <Select
                    value={currentProvider.type}
                    onChange={handleProviderTypeChange}
                    label="Provider Type"
                  >
                    {providerTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Base URL"
                  value={currentProvider.baseUrl || ''}
                  onChange={(e) => setCurrentProvider({...currentProvider, baseUrl: e.target.value, models: []})}
                  placeholder={currentProvider.type === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234/v1'}
                  helperText={
                    currentProvider.type === 'ollama' 
                      ? "Default for Ollama is http://localhost:11434" 
                      : "Default for LM Studio is http://localhost:1234/v1"
                  }
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key (Optional)"
                  value={currentProvider.apiKey || ''}
                  onChange={(e) => setCurrentProvider({...currentProvider, apiKey: e.target.value})}
                  type="password"
                  helperText="Not required for most local providers like Ollama and LM Studio"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2 
                  }}>
                    <Typography variant="subtitle1" fontWeight="medium">Available Models</Typography>
                    {currentProvider.baseUrl && (
                      <Button 
                        size="small" 
                        onClick={() => fetchProviderModels(currentProvider)}
                        disabled={loadingModels || !currentProvider.baseUrl}
                        startIcon={loadingModels ? <CircularProgress size={16} /> : null}
                        variant="outlined"
                      >
                        {loadingModels ? 'Fetching...' : 'Refresh Models'}
                      </Button>
                    )}
                  </Box>
                  
                  {modelError && (
                    <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setModelError(null)}>
                      {modelError}
                    </Alert>
                  )}
                  
                  <Box sx={{ minHeight: '80px', display: 'flex', alignItems: 'center' }}>
                    {loadingModels ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Retrieving available models...</Typography>
                      </Box>
                    ) : currentProvider.models && currentProvider.models.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {currentProvider.models.map((model, index) => (
                          <Chip 
                            key={index} 
                            label={model} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {currentProvider.baseUrl ? 
                          'No models found. Click "Refresh Models" to detect available models.' : 
                          'Enter a base URL and test the connection to detect available models.'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
              
              {/* Default Model Selection */}
              {currentProvider.models && currentProvider.models.length > 0 && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="default-model-label">Default Model</InputLabel>
                    <Select
                      labelId="default-model-label"
                      value={currentProvider.defaultModel || ''}
                      onChange={(e) => setCurrentProvider({
                        ...currentProvider,
                        defaultModel: e.target.value
                      })}
                      label="Default Model"
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {currentProvider.models.map((model) => (
                        <MenuItem key={model} value={model}>
                          {model}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      Select the default model to use for this provider
                    </FormHelperText>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentProvider.enabled}
                      onChange={(e) => setCurrentProvider({...currentProvider, enabled: e.target.checked})}
                    />
                  }
                  label="Provider Enabled"
                />
              </Grid>
              
              {/* Add a note about CORS if needed */}
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    {currentProvider.type === 'ollama' 
                      ? "For Ollama, make sure to enable CORS in your Ollama installation if you encounter connection issues." 
                      : "For LM Studio, ensure it's running and serving on the specified URL."}
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {currentProvider?.baseUrl && (
            <Button 
              onClick={() => handleTestProvider(currentProvider)}
              disabled={testingProvider === currentProvider.id || !currentProvider.baseUrl}
              startIcon={testingProvider === currentProvider.id ? <CircularProgress size={16} /> : null}
            >
              Test Connection
            </Button>
          )}
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveProvider}
            disabled={!currentProvider?.name || !currentProvider?.baseUrl}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}