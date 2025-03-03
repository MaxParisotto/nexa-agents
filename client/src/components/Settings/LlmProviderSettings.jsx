import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Grid,
  Card, CardContent, CardActions, Switch, FormControlLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Divider, Accordion,
  AccordionSummary, AccordionDetails, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SaveIcon from '@mui/icons-material/Save';

import { apiService } from '../../services/api';

/**
 * LLM Provider Settings Component
 */
export default function LlmProviderSettings({ settings, onUpdateSettings }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [newProvider, setNewProvider] = useState({
    id: '',
    name: '',
    type: 'ollama',
    apiKey: '',
    baseUrl: 'http://localhost:11434',
    models: [],
    defaultModel: '',
    enabled: true,
    contextWindow: 4096,
    temperature: 0.7,
    maxTokens: 2048
  });

  // Get supported provider types
  const providerTypes = [
    { id: 'ollama', name: 'Ollama', url: 'http://localhost:11434' },
    { id: 'lmstudio', name: 'LM Studio', url: 'http://localhost:1234/v1' },
    { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1' },
    { id: 'anthropic', name: 'Anthropic', url: 'https://api.anthropic.com' },
    { id: 'custom', name: 'Custom API', url: '' }
  ];

  // Add a new provider
  const handleAddProvider = () => {
    setNewProvider({
      id: `provider-${Date.now()}`,
      name: '',
      type: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      models: [],
      defaultModel: '',
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7,
      maxTokens: 2048
    });
    setEditingProvider(null);
    setAddDialogOpen(true);
    setTestResult(null);
  };

  // Edit an existing provider
  const handleEditProvider = (provider) => {
    setNewProvider({ ...provider });
    setEditingProvider(provider);
    setAddDialogOpen(true);
    setTestResult(null);
  };

  // Delete a provider
  const handleDeleteProvider = (providerId) => {
    const updatedProviders = settings.llmProviders.filter(p => p.id !== providerId);
    onUpdateSettings('llmProviders', updatedProviders);
  };

  // Handle provider dialog input change
  const handleProviderChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewProvider(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Reset test result when changing provider type or URL
    if (name === 'type' || name === 'baseUrl') {
      setTestResult(null);
    }

    // Set default URL based on provider type
    if (name === 'type') {
      const providerType = providerTypes.find(type => type.id === value);
      if (providerType) {
        setNewProvider(prev => ({
          ...prev,
          baseUrl: providerType.url || prev.baseUrl
        }));
      }
    }
  };

  // Test provider connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const credentials = {
        baseUrl: newProvider.baseUrl,
        apiKey: newProvider.apiKey
      };

      const response = await apiService.testIntegration(newProvider.type, credentials);
      
      if (response?.data?.success) {
        setTestResult({ 
          success: true, 
          message: response.data.message,
          models: response.data.models || []
        });
        
        // Update available models in the provider
        if (response.data.models && response.data.models.length > 0) {
          setNewProvider(prev => ({
            ...prev,
            models: response.data.models,
            defaultModel: response.data.suggestedDefault || response.data.models[0]
          }));
        }
      } else {
        setTestResult({ 
          success: false, 
          message: response?.data?.message || 'Connection test failed'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Error: ${err.message || 'Unknown error'}`
      });
    } finally {
      setTesting(false);
    }
  };

  // Save provider
  const handleSaveProvider = () => {
    setDialogLoading(true);

    // Make a copy of providers
    const providers = [...settings.llmProviders];
    
    // Validate
    if (!newProvider.name) {
      setTestResult({ success: false, message: 'Provider name is required' });
      setDialogLoading(false);
      return;
    }
    
    if (!newProvider.baseUrl) {
      setTestResult({ success: false, message: 'Base URL is required' });
      setDialogLoading(false);
      return;
    }

    // Edit existing or add new
    if (editingProvider) {
      const index = providers.findIndex(p => p.id === editingProvider.id);
      if (index !== -1) {
        providers[index] = newProvider;
      }
    } else {
      providers.push(newProvider);
    }

    // Update settings
    onUpdateSettings('llmProviders', providers);
    
    // Close dialog
    setAddDialogOpen(false);
    setDialogLoading(false);
  };

  // Toggle provider enable/disable
  const handleToggleProvider = (providerId) => {
    const updatedProviders = settings.llmProviders.map(provider => {
      if (provider.id === providerId) {
        return { ...provider, enabled: !provider.enabled };
      }
      return provider;
    });
    
    onUpdateSettings('llmProviders', updatedProviders);
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">LLM Providers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddProvider}
        >
          Add Provider
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure LLM providers to connect to local or remote language models. 
        Nexa Agents supports Ollama, LM Studio, and other compatible providers.
      </Alert>
      
      {/* Provider Cards */}
      <Grid container spacing={3}>
        {settings.llmProviders.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" paragraph>
                No LLM providers configured yet.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddProvider}
              >
                Add Your First Provider
              </Button>
            </Paper>
          </Grid>
        ) : (
          settings.llmProviders.map(provider => (
            <Grid item xs={12} md={6} key={provider.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6">{provider.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {providerTypes.find(t => t.id === provider.type)?.name || 'Custom Provider'}
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={provider.enabled}
                          onChange={() => handleToggleProvider(provider.id)} 
                        />
                      }
                      label="Enabled"
                    />
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>URL:</strong> {provider.baseUrl}
                    </Typography>
                    {provider.models && provider.models.length > 0 && (
                      <>
                        <Typography variant="body2" mt={1}>
                          <strong>Default Model:</strong> {provider.defaultModel || 'None selected'}
                        </Typography>
                        <Typography variant="body2" mt={1} mb={0.5}>
                          <strong>Available Models:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {provider.models.map((model, index) => (
                            <Chip 
                              key={index} 
                              label={model}
                              size="small"
                              variant={model === provider.defaultModel ? 'filled' : 'outlined'}
                              color={model === provider.defaultModel ? 'primary' : 'default'}
                            />
                          ))}
                        </Box>
                      </>
                    )}
                    {(!provider.models || provider.models.length === 0) && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        No models available. Try testing the connection.
                      </Alert>
                    )}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<EditIcon />}
                    onClick={() => handleEditProvider(provider)}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<RefreshIcon />}
                  >
                    Refresh Models
                  </Button>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteProvider(provider.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Advanced Provider Settings */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Advanced Model Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            These settings control the behavior of language models across all providers.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Temperature"
                type="number"
                value={settings.system?.defaultTemperature || 0.7}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  onUpdateSettings('system', {
                    ...settings.system,
                    defaultTemperature: value
                  });
                }}
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                helperText="Controls randomness in generation (0-2)"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Max Tokens"
                type="number"
                value={settings.system?.defaultMaxTokens || 2048}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  onUpdateSettings('system', {
                    ...settings.system,
                    defaultMaxTokens: value
                  });
                }}
                inputProps={{ min: 1, max: 8192 }}
                helperText="Maximum output length in tokens"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Provider Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => !dialogLoading && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProvider ? `Edit ${editingProvider.name}` : 'Add LLM Provider'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provider Name"
                name="name"
                value={newProvider.name}
                onChange={handleProviderChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Provider Type</InputLabel>
                <Select
                  name="type"
                  value={newProvider.type}
                  onChange={handleProviderChange}
                  label="Provider Type"
                >
                  {providerTypes.map(type => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Base URL"
                name="baseUrl"
                value={newProvider.baseUrl}
                onChange={handleProviderChange}
                required
                helperText={
                  newProvider.type === 'ollama' ? 'Default: http://localhost:11434' :
                  newProvider.type === 'lmstudio' ? 'Default: http://localhost:1234/v1' :
                  'Enter the API base URL'
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key"
                name="apiKey"
                type="password"
                value={newProvider.apiKey}
                onChange={handleProviderChange}
                helperText={
                  newProvider.type === 'ollama' || newProvider.type === 'lmstudio' ?
                  'Local providers typically don\'t require an API key' :
                  'Enter your API key for this provider'
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleTestConnection}
                  disabled={testing || !newProvider.baseUrl}
                  startIcon={testing ? <CircularProgress size={20} /> : <AutorenewIcon />}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={newProvider.enabled}
                      onChange={handleProviderChange}
                      name="enabled"
                    />
                  }
                  label="Enabled"
                />
              </Box>
            </Grid>
            
            {/* Test results */}
            {testResult && (
              <Grid item xs={12}>
                <Alert severity={testResult.success ? 'success' : 'error'}>
                  {testResult.message}
                </Alert>
                
                {testResult.success && testResult.models && testResult.models.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Available Models:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: '150px', overflowY: 'auto' }}>
                      {testResult.models.map((model, index) => (
                        <Chip 
                          key={index} 
                          label={model}
                          size="small"
                          onClick={() => {
                            setNewProvider(prev => ({
                              ...prev,
                              defaultModel: model
                            }));
                          }}
                          variant={model === newProvider.defaultModel ? 'filled' : 'outlined'}
                          color={model === newProvider.defaultModel ? 'primary' : 'default'}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>
            )}
            
            {/* Advanced Settings */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Context Window"
                        name="contextWindow"
                        type="number"
                        value={newProvider.contextWindow}
                        onChange={handleProviderChange}
                        inputProps={{ min: 512, max: 128000 }}
                        helperText="Max context size"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Temperature"
                        name="temperature"
                        type="number"
                        value={newProvider.temperature}
                        onChange={handleProviderChange}
                        inputProps={{ min: 0, max: 2, step: 0.1 }}
                        helperText="Default: 0.7"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Max Tokens"
                        name="maxTokens"
                        type="number"
                        value={newProvider.maxTokens}
                        onChange={handleProviderChange}
                        inputProps={{ min: 1, max: 8192 }}
                        helperText="Default: 2048"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAddDialogOpen(false)}
            disabled={dialogLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveProvider}
            disabled={dialogLoading || !newProvider.name || !newProvider.baseUrl}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {dialogLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
