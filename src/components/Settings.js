import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels, saveSettings } from '../store/actions/settingsActions';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import configService from '../services/configService';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  FormControl, 
  FormHelperText, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Select, 
  TextField, 
  Typography, 
  Alert, 
  Link,
  Divider,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import { HelpOutline, Info, ErrorOutline, CheckCircle, Code, Download, ContentCopy } from '@mui/icons-material';
import { addNotification } from '../store/actions/systemActions';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';

const DEFAULT_URLS = {
  lmStudio: 'http://localhost:1234',
  ollama: 'http://localhost:11434'
};

const Settings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  
  const [formData, setFormData] = useState({
    lmStudio: {
      apiUrl: settings?.lmStudio?.apiUrl || DEFAULT_URLS.lmStudio,
      defaultModel: settings?.lmStudio?.defaultModel || ''
    },
    ollama: {
      apiUrl: settings?.ollama?.apiUrl || DEFAULT_URLS.ollama,
      defaultModel: settings?.ollama?.defaultModel || ''
    },
    nodeEnv: settings?.nodeEnv || 'development',
    port: settings?.port || 5000
  });
  
  const [validationErrors, setValidationErrors] = useState({
    lmStudio: { apiUrl: '', defaultModel: '' },
    ollama: { apiUrl: '', defaultModel: '' }
  });

  // Check if services were manually loaded (via user interaction)
  const [servicesManuallyLoaded, setServicesManuallyLoaded] = useState({
    lmStudio: false,
    ollama: false
  });

  const [configFormat, setConfigFormat] = useState('json');
  const [configValue, setConfigValue] = useState('');
  const [isConfigValid, setIsConfigValid] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  
  // Track last operation to prevent repeated calls
  const [lastOperation, setLastOperation] = useState({
    type: null,
    timestamp: 0,
    result: null
  });
  
  useEffect(() => {
    // Log current settings on component mount - but only once
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings component mounted'));
    
    // Load saved settings from Redux/localStorage
    const savedNodeEnv = localStorage.getItem('nodeEnv') || 'development';
    const savedPort = localStorage.getItem('port') || '5000';
    
    setFormData(prevState => ({
      ...prevState,
      nodeEnv: savedNodeEnv,
      port: savedPort
    }));
    
    // Try to load config from file
    loadConfigFromFile();
    
    // Generate config from settings as fallback
    generateConfigFromSettings();
    
    // Cleanup function
    return () => {
      // Log when component unmounts
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings component unmounted'));
    };
  }, []);
  
  // Debounce config generation to prevent excessive updates
  useEffect(() => {
    const timer = setTimeout(() => {
      generateConfigFromSettings();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [formData, configFormat]);
  
  const generateConfigFromSettings = () => {
    const config = {
      lmStudio: {
        apiUrl: formData.lmStudio.apiUrl,
        defaultModel: formData.lmStudio.defaultModel
      },
      ollama: {
        apiUrl: formData.ollama.apiUrl,
        defaultModel: formData.ollama.defaultModel
      },
      nodeEnv: formData.nodeEnv,
      port: formData.port
    };
    
    try {
      if (configFormat === 'json') {
        setConfigValue(JSON.stringify(config, null, 2));
      } else {
        // Simple YAML conversion for demo
        let yamlStr = '';
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'object') {
            yamlStr += `${key}:\n`;
            Object.entries(value).forEach(([subKey, subValue]) => {
              yamlStr += `  ${subKey}: ${subValue || '""'}\n`;
            });
          } else {
            yamlStr += `${key}: ${value}\n`;
          }
        });
        setConfigValue(yamlStr);
      }
      setIsConfigValid(true);
    } catch (error) {
      console.error('Error generating config:', error);
      setIsConfigValid(false);
    }
  };
  
  const handleEditorChange = (value) => {
    setConfigValue(value);
    
    try {
      // Validate and update settings
      if (configFormat === 'json') {
        const parsedConfig = JSON.parse(value);
        updateSettingsFromConfig(parsedConfig);
        setIsConfigValid(true);
      } else {
        // Basic YAML validation and parsing
        // In a real app, you'd use a proper YAML parser library
        setIsConfigValid(true);
        // For demo, we're not implementing full YAML parsing
        // updateSettingsFromConfig(yamlParse(value));
      }
    } catch (error) {
      console.error('Invalid config format:', error);
      setIsConfigValid(false);
    }
  };
  
  const updateSettingsFromConfig = (config) => {
    if (!config) return;
    
    const newFormData = { ...formData };
    
    // Update form data if properties exist in config
    if (config.lmStudio) {
      if (config.lmStudio.apiUrl) newFormData.lmStudio.apiUrl = config.lmStudio.apiUrl;
      if (config.lmStudio.defaultModel) newFormData.lmStudio.defaultModel = config.lmStudio.defaultModel;
    }
    
    if (config.ollama) {
      if (config.ollama.apiUrl) newFormData.ollama.apiUrl = config.ollama.apiUrl;
      if (config.ollama.defaultModel) newFormData.ollama.defaultModel = config.ollama.defaultModel;
    }
    
    if (config.nodeEnv) newFormData.nodeEnv = config.nodeEnv;
    if (config.port) newFormData.port = config.port;
    
    setFormData(newFormData);
  };
  
  const handleFormatChange = (event, newFormat) => {
    setConfigFormat(newFormat);
    
    // Try to load the configuration for the selected format
    setTimeout(() => {
      loadConfigFromFile();
    }, 100);
  };
  
  const handleCopyConfig = () => {
    navigator.clipboard.writeText(configValue);
    dispatch(addNotification({
      type: 'success',
      message: 'Configuration copied to clipboard!'
    }));
  };
  
  const handleDownloadConfig = () => {
    const filename = `nexa-config.${configFormat}`;
    const blob = new Blob([configValue], { type: 'text/plain' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    dispatch(addNotification({
      type: 'success',
      message: `Configuration downloaded as ${filename}`
    }));
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleTestConnection = (provider) => {
    if (formData[provider].apiUrl) {
      // Log the connection attempt
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Testing connection to ${provider}`, {
        apiUrl: formData[provider].apiUrl
      }));
      
      setServicesManuallyLoaded(prev => ({
        ...prev,
        [provider]: true
      }));
      
      dispatch(fetchModels(provider, formData[provider].apiUrl));
    }
  };

  const validateForm = () => {
    const errors = {
      lmStudio: { apiUrl: '', defaultModel: '' },
      ollama: { apiUrl: '', defaultModel: '' }
    };
    
    // Validate LM Studio URL
    if (formData.lmStudio.apiUrl && !formData.lmStudio.apiUrl.startsWith('http')) {
      errors.lmStudio.apiUrl = 'Invalid URL format';
    }
    
    // Validate Ollama URL
    if (formData.ollama.apiUrl && !formData.ollama.apiUrl.startsWith('http')) {
      errors.ollama.apiUrl = 'Invalid URL format';
    }
    
    // Validate that at least one service has a model selected
    if (!formData.lmStudio.defaultModel && !formData.ollama.defaultModel) {
      errors.lmStudio.defaultModel = 'At least one service must have a model selected';
      errors.ollama.defaultModel = 'At least one service must have a model selected';
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
      // Only log once, not for each operation
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Saving settings'));
      
      // Update Redux store and save to localStorage
      dispatch(saveSettings(formData));
      
      // Also save to file
      saveConfigToFile();
      
      dispatch(addNotification({
        type: 'success',
        message: 'Settings saved successfully!'
      }));
    } else {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Settings validation failed', validationErrors));
      dispatch(addNotification({
        type: 'error',
        message: 'Please fix validation errors before saving'
      }));
    }
  };

  const handleUseDefault = (provider) => {
    setFormData(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiUrl: DEFAULT_URLS[provider]
      }
    }));
  };

  const loadConfigFromFile = async () => {
    // Rate limiting - don't reload if we just loaded in the last 3 seconds
    const now = Date.now();
    if (lastOperation.type === 'load' && now - lastOperation.timestamp < 3000) {
      console.log('Skipping repeated load operation');
      // Use the last result
      if (lastOperation.result) {
        if (configFormat === 'json') {
          setConfigValue(JSON.stringify(lastOperation.result, null, 2));
          updateSettingsFromConfig(lastOperation.result);
        } else {
          setConfigValue(lastOperation.result);
        }
      }
      return;
    }
    
    setIsLoadingFile(true);
    setFileError('');
    
    try {
      // First, check if the server is available
      const serverAvailable = await configService.checkServerAvailability(true);
      
      if (!serverAvailable) {
        throw new Error('Server is not available. Configuration will be loaded from browser storage.');
      }
      
      const config = await configService.loadConfigFromFile(configFormat);
      
      // Update the last operation
      setLastOperation({
        type: 'load',
        timestamp: Date.now(),
        result: config
      });
      
      if (configFormat === 'json') {
        // If it's a JSON config, update the state
        setConfigValue(JSON.stringify(config, null, 2));
        updateSettingsFromConfig(config);
      } else {
        // If it's YAML, it's just the text content
        setConfigValue(config);
      }
      
      dispatch(addNotification({
        type: 'success',
        message: `Configuration loaded from file`
      }));
    } catch (error) {
      // Different handling based on error type
      if (error.message.includes('Server is not available')) {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Server unavailable for configuration loading', error));
        setFileError('Server unavailable - using browser storage');
        
        // Load from localStorage as fallback
        const localConfig = configService.loadConfigFromLocalStorage();
        setConfigValue(JSON.stringify(localConfig, null, 2));
        updateSettingsFromConfig(localConfig);
        
        dispatch(addNotification({
          type: 'warning',
          message: 'Server unavailable - Using settings from browser storage'
        }));
      } else if (error.message === 'Configuration file not found') {
        // For file not found, just use a gentle notification
        dispatch(addNotification({
          type: 'info',
          message: 'Using default configuration (no file found)'
        }));
      } else {
        // For other errors, show more details
        dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Error loading configuration file', error));
        setFileError('Failed to load configuration file: ' + error.message);
        
        dispatch(addNotification({
          type: 'warning',
          message: 'Error loading configuration: ' + error.message
        }));
      }
    } finally {
      setIsLoadingFile(false);
    }
  };
  
  const saveConfigToFile = async () => {
    if (!isConfigValid) {
      dispatch(addNotification({
        type: 'error',
        message: 'Cannot save invalid configuration'
      }));
      return;
    }
    
    // Rate limiting - don't save if we just saved in the last 3 seconds
    const now = Date.now();
    if (lastOperation.type === 'save' && now - lastOperation.timestamp < 3000) {
      console.log('Skipping repeated save operation');
      dispatch(addNotification({
        type: 'info',
        message: 'Configuration already saved'
      }));
      return;
    }
    
    setIsSavingFile(true);
    setFileError('');
    
    try {
      // First, check if the server is available
      const serverAvailable = await configService.checkServerAvailability(true);
      
      if (!serverAvailable) {
        // Still save to localStorage but inform the user
        if (configFormat === 'json') {
          const configObj = JSON.parse(configValue);
          configService.saveConfigToLocalStorage(configObj);
        }
        
        throw new Error('Server is not available. Configuration saved to browser storage only.');
      }
      
      let configToSave;
      
      if (configFormat === 'json') {
        // Parse JSON content to get an object
        configToSave = JSON.parse(configValue);
        // Also save to localStorage for redundancy
        configService.saveConfigToLocalStorage(configToSave);
      } else {
        // For YAML, we'd need to parse it first
        // But for now we'll just save the raw content
        configToSave = configValue;
      }
      
      const result = await configService.saveConfigToFile(configToSave, configFormat);
      
      // Update the last operation
      setLastOperation({
        type: 'save',
        timestamp: now,
        result: configToSave
      });
      
      // Check response properties
      if (result.rateLimited) {
        dispatch(addNotification({
          type: 'info',
          message: 'Configuration saved to browser storage only (rate limited)'
        }));
      } else if (result.serverUnavailable) {
        dispatch(addNotification({
          type: 'warning',
          message: 'Server unavailable - Configuration saved to browser storage only'
        }));
      } else {
        dispatch(addNotification({
          type: 'success',
          message: `Configuration saved to file: config/nexa-config.${configFormat}`
        }));
      }
    } catch (error) {
      // Different handling based on error type
      if (error.message.includes('Server is not available')) {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Server unavailable for configuration saving', error));
        setFileError('Server unavailable - saved to browser storage only');
        
        dispatch(addNotification({
          type: 'warning',
          message: 'Server unavailable - Configuration saved to browser storage only'
        }));
      } else {
        dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Error saving configuration to file', error));
        setFileError('Failed to save configuration file: ' + error.message);
        
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to save configuration: ' + (error.message || 'Unknown error')
        }));
      }
    } finally {
      setIsSavingFile(false);
    }
  };

  const renderProviderCard = (provider, title, description) => {
    const providerData = settings[provider] || {};
    const isLoading = providerData.loading;
    const error = providerData.error;
    const models = providerData.models || [];
    const hasTestedConnection = servicesManuallyLoaded[provider];
    const isConfigured = formData[provider].apiUrl && formData[provider].defaultModel;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              {title} Settings
            </Typography>
            {isConfigured && <CheckCircle color="success" fontSize="small" />}
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={formData[provider].apiUrl}
                  onChange={(e) => handleInputChange(provider, 'apiUrl', e.target.value)}
                  error={!!validationErrors[provider].apiUrl}
                  helperText={validationErrors[provider].apiUrl || 
                    `Example: ${DEFAULT_URLS[provider]}`}
                  sx={{ mr: 1 }}
                />
                <Tooltip title={`Use default (${DEFAULT_URLS[provider]})`}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleUseDefault(provider)}
                  >
                    Default
                  </Button>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                variant="outlined" 
                onClick={() => handleTestConnection(provider)}
                sx={{ mr: 2 }}
                disabled={isLoading || !formData[provider].apiUrl}
                color="primary"
              >
                {isLoading ? 'Testing...' : 'Test Connection'}
              </Button>
              
              {isLoading && <CircularProgress size={20} sx={{ mr: 1 }} />}
              
              {!isLoading && hasTestedConnection && !error && (
                <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                  Connection successful
                </Typography>
              )}
              
              {!isLoading && hasTestedConnection && error && (
                <Typography variant="body2" color="error" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ErrorOutline fontSize="small" sx={{ mr: 0.5 }} />
                  Connection failed
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors[provider].defaultModel}>
                <InputLabel>Default Model</InputLabel>
                <Select
                  value={formData[provider].defaultModel}
                  onChange={(e) => handleInputChange(provider, 'defaultModel', e.target.value)}
                  label="Default Model"
                  disabled={models.length === 0}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {models.map((model, index) => (
                    <MenuItem key={index} value={typeof model === 'string' ? model : model.id || model.name}>
                      {typeof model === 'string' ? model : model.id || model.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {validationErrors[provider].defaultModel || 
                  (models.length === 0 && 'Test connection to load available models')}
                </FormHelperText>
              </FormControl>
            </Grid>

            {error && (
              <Grid item xs={12}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  Failed to fetch models: {error}
                </Alert>
                <Typography variant="body2">
                  Make sure your {title} is running and the API URL is correct.
                </Typography>
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

  const renderConfigEditor = () => {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              <Code sx={{ mr: 1 }} />
              Environment Configuration
            </Typography>
            {isLoadingFile && <CircularProgress size={20} sx={{ ml: 1 }} />}
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            View and edit your environment configuration in JSON or YAML format. 
            This configuration is saved to a file in the <code>config/</code> directory of your workspace.
          </Typography>
          
          {fileError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {fileError}
            </Alert>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={configFormat} onChange={handleFormatChange}>
              <Tab label="JSON" value="json" />
              <Tab label="YAML" value="yaml" />
            </Tabs>
          </Box>
          
          <Box sx={{ 
            border: 1, 
            borderColor: isConfigValid ? 'divider' : 'error.main',
            borderRadius: 1
          }}>
            <Editor
              height="300px"
              language={configFormat === 'json' ? 'json' : 'yaml'}
              value={configValue}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true
              }}
            />
          </Box>
          
          {!isConfigValid && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Invalid {configFormat.toUpperCase()} format. Please check your syntax.
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
            <Button 
              variant="outlined" 
              startIcon={<ContentCopy />}
              onClick={handleCopyConfig}
            >
              Copy
            </Button>
            <Button 
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadConfig}
            >
              Download
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveConfigToFile}
              disabled={isSavingFile || !isConfigValid}
              startIcon={isSavingFile ? <CircularProgress size={20} /> : null}
            >
              Save to File
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="LLM Settings" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>
      
      {activeTab === 0 ? (
        <>
          <Typography variant="h4" gutterBottom>
            LLM Settings
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              You need to configure at least one LLM provider (LM Studio or Ollama) to enable advanced functionality for the Project Manager.
            </Typography>
          </Alert>
          
          {renderProviderCard(
            'lmStudio', 
            'LM Studio', 
            'LM Studio is a desktop application that provides a GUI for running models using the OpenAI API format. Make sure LM Studio is running on your computer before testing the connection.'
          )}
          
          {renderProviderCard(
            'ollama', 
            'Ollama', 
            'Ollama allows you to run open-source large language models locally using its own API format. Make sure Ollama is installed and running on your computer before testing the connection.'
          )}
        </>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            Environment Configuration
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              View and edit your environment configuration in JSON or YAML format. This configuration is synchronized with the settings in the LLM Settings tab.
            </Typography>
          </Alert>
          
          {renderConfigEditor()}
        </>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
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
