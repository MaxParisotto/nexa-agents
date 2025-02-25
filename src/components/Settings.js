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
import { HelpOutline, Info, ErrorOutline, CheckCircle, Code, Download, ContentCopy, Assessment } from '@mui/icons-material';
import { addNotification } from '../store/actions/systemActions';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';

const DEFAULT_URLS = {
  lmStudio: 'http://localhost:1234',
  ollama: 'http://localhost:11434'
};

const Settings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  
  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 8) return 'success.main';
    if (score >= 5) return 'warning.main';
    return 'error.main';
  };
  
  const [formData, setFormData] = useState({
    lmStudio: {
      apiUrl: settings?.lmStudio?.apiUrl || DEFAULT_URLS.lmStudio,
      defaultModel: settings?.lmStudio?.defaultModel || ''
    },
    ollama: {
      apiUrl: settings?.ollama?.apiUrl || DEFAULT_URLS.ollama,
      defaultModel: settings?.ollama?.defaultModel || ''
    },
    projectManager: {
      apiUrl: settings?.projectManager?.apiUrl || DEFAULT_URLS.ollama,
      model: settings?.projectManager?.model || 'deepscaler:7b',
      parameters: settings?.projectManager?.parameters || {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        maxTokens: 1024,
        contextLength: 4096
      }
    },
    nodeEnv: settings?.nodeEnv || 'development',
    port: settings?.port || 5000
  });
  
  // State for benchmark functionality
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  
  const [validationErrors, setValidationErrors] = useState({
    lmStudio: { apiUrl: '', defaultModel: '' },
    ollama: { apiUrl: '', defaultModel: '' },
    projectManager: { apiUrl: '', model: '' }
  });

  // Check if services were manually loaded (via user interaction)
  const [servicesManuallyLoaded, setServicesManuallyLoaded] = useState({
    lmStudio: false,
    ollama: false,
    projectManager: false
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
  
  // Handle benchmark button click
  const handleBenchmark = async () => {
    if (!formData.projectManager.model) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please select a model to benchmark'
      }));
      return;
    }
    
    setIsBenchmarking(true);
    setBenchmarkResults(null);
    
    try {
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Starting benchmark for model: ${formData.projectManager.model}`));
      
      // Notify user
      dispatch(addNotification({
        type: 'info',
        message: `Benchmarking ${formData.projectManager.model}. This may take a minute...`
      }));
      
      // Run benchmark tests
      const results = await runModelBenchmark(
        formData.projectManager.apiUrl, 
        formData.projectManager.model,
        formData.projectManager.parameters
      );
      
      setBenchmarkResults(results);
      
      dispatch(addNotification({
        type: 'success',
        message: `Benchmark completed for ${formData.projectManager.model}`
      }));
    } catch (error) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Benchmark failed', error));
      dispatch(addNotification({
        type: 'error',
        message: `Benchmark failed: ${error.message}`
      }));
    } finally {
      setIsBenchmarking(false);
    }
  };
  
  // Run model benchmark
  const runModelBenchmark = async (apiUrl, modelName, parameters) => {
    // Prepare benchmark tests
    const tests = [
      {
        name: "Reasoning",
        prompt: "If John has 5 apples and gives 2 to Mary, then buys 3 more and gives half of his apples to Tom, how many apples does John have left?",
        evaluateFunc: (response) => {
          // Check if the answer is correct (3 apples)
          return response.toLowerCase().includes("3") ? 10 : 
                 response.toLowerCase().includes("three") ? 10 : 0;
        }
      },
      {
        name: "Function Calling",
        prompt: "Please call the create_workflow function to create a workflow named 'Test Workflow'",
        evaluateFunc: (response) => {
          // Check if response contains function call syntax
          const hasFunctionCall = response.includes("create_workflow") && 
                                 (response.includes("tool_call") || 
                                  response.includes("function") || 
                                  response.includes("arguments"));
          return hasFunctionCall ? 10 : 0;
        }
      },
      {
        name: "Instruction Following",
        prompt: "Respond with exactly one word: banana",
        evaluateFunc: (response) => {
          // Check if response is exactly "banana"
          const cleaned = response.trim().toLowerCase();
          if (cleaned === "banana") return 10;
          if (cleaned.includes("banana")) return 5;
          return 0;
        }
      }
    ];
    
    const startTime = Date.now();
    let totalTokens = 0;
    const results = [];
    
    // Run each test
    for (const test of tests) {
      const testStartTime = Date.now();
      try {
        // Call Ollama API
        const response = await axios.post(
          `${apiUrl}/api/generate`,
          {
            model: modelName,
            prompt: test.prompt,
            temperature: parameters?.temperature || 0.7,
            top_p: parameters?.topP || 0.9,
            top_k: parameters?.topK || 40,
            repeat_penalty: parameters?.repeatPenalty || 1.1,
            max_tokens: parameters?.maxTokens || 1024
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );
        
        const testEndTime = Date.now();
        const responseText = response.data.response;
        const tokensGenerated = response.data.eval_count || responseText.split(/\s+/).length;
        totalTokens += tokensGenerated;
        
        // Calculate metrics
        const latency = testEndTime - testStartTime;
        const tokensPerSecond = tokensGenerated / (latency / 1000);
        const score = test.evaluateFunc(responseText);
        
        results.push({
          name: test.name,
          score,
          latency,
          tokensPerSecond,
          response: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
        });
      } catch (error) {
        results.push({
          name: test.name,
          score: 0,
          latency: 0,
          tokensPerSecond: 0,
          error: error.message
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const averageLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const averageTokensPerSecond = results.reduce((sum, r) => sum + r.tokensPerSecond, 0) / results.length;
    
    return {
      model: modelName,
      timestamp: new Date().toISOString(),
      totalTime,
      totalTokens,
      averageScore,
      averageLatency,
      averageTokensPerSecond,
      tests: results
    };
  };
  
  // Handle parameter change
  const handleParameterChange = (param, value) => {
    setFormData(prev => ({
      ...prev,
      projectManager: {
        ...prev.projectManager,
        parameters: {
          ...prev.projectManager.parameters,
          [param]: value
        }
      }
    }));
  };

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
      projectManager: {
        apiUrl: formData.projectManager.apiUrl,
        model: formData.projectManager.model
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
    
    if (config.projectManager) {
      if (config.projectManager.apiUrl) newFormData.projectManager.apiUrl = config.projectManager.apiUrl;
      if (config.projectManager.model) newFormData.projectManager.model = config.projectManager.model;
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
    let apiUrl, modelName;
    
    if (provider === 'lmStudio') {
      apiUrl = formData.lmStudio.apiUrl;
      modelName = formData.lmStudio.defaultModel;
    } else if (provider === 'ollama') {
      apiUrl = formData.ollama.apiUrl;
      modelName = formData.ollama.defaultModel;
    } else if (provider === 'projectManager') {
      apiUrl = formData.projectManager.apiUrl;
      modelName = formData.projectManager.model;
    }
    
    if (!apiUrl) {
      setValidationErrors(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          apiUrl: 'API URL is required'
        }
      }));
      return;
    }
    
    // Dispatch the fetchModels action
    dispatch(fetchModels(provider, apiUrl))
      .then(models => {
        if (models && models.length > 0) {
          // Mark this service as manually loaded
          setServicesManuallyLoaded(prev => ({
            ...prev,
            [provider]: true
          }));
          
          // If no model is selected and we have models, select the first one
          if (!modelName && models.length > 0) {
            if (provider === 'projectManager') {
              // For Project Manager, prefer deepseek-r1:7b if available
              const deepseekModel = models.find(m => m === 'deepseek-r1:7b') || models[0];
              handleInputChange(provider, 'model', deepseekModel);
            } else {
              handleInputChange(provider, 'defaultModel', models[0]);
            }
          }
        }
      });
  };

  const validateForm = () => {
    const errors = {
      lmStudio: { apiUrl: '', defaultModel: '' },
      ollama: { apiUrl: '', defaultModel: '' },
      projectManager: { apiUrl: '', model: '' }
    };
    
    let isValid = true;
    
    // Validate LM Studio
    if (!formData.lmStudio.apiUrl) {
      errors.lmStudio.apiUrl = 'API URL is required';
      isValid = false;
    } else if (!formData.lmStudio.apiUrl.startsWith('http')) {
      errors.lmStudio.apiUrl = 'API URL must start with http:// or https://';
      isValid = false;
    }
    
    // Validate Ollama
    if (!formData.ollama.apiUrl) {
      errors.ollama.apiUrl = 'API URL is required';
      isValid = false;
    } else if (!formData.ollama.apiUrl.startsWith('http')) {
      errors.ollama.apiUrl = 'API URL must start with http:// or https://';
      isValid = false;
    }
    
    // Validate Project Manager
    if (!formData.projectManager.apiUrl) {
      errors.projectManager.apiUrl = 'API URL is required';
      isValid = false;
    } else if (!formData.projectManager.apiUrl.startsWith('http')) {
      errors.projectManager.apiUrl = 'API URL must start with http:// or https://';
      isValid = false;
    }
    
    if (!formData.projectManager.model) {
      errors.projectManager.model = 'Model is required';
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleInputChange = (provider, field, value) => {
    setFormData(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
    
    // Clear validation errors when user types
    setValidationErrors(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: ''
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
    if (provider === 'lmStudio') {
      setFormData(prev => ({
        ...prev,
        lmStudio: {
          apiUrl: DEFAULT_URLS.lmStudio,
          defaultModel: prev.lmStudio.defaultModel
        }
      }));
    } else if (provider === 'ollama') {
      setFormData(prev => ({
        ...prev,
        ollama: {
          apiUrl: DEFAULT_URLS.ollama,
          defaultModel: prev.ollama.defaultModel
        }
      }));
    } else if (provider === 'projectManager') {
      setFormData(prev => ({
        ...prev,
        projectManager: {
          apiUrl: DEFAULT_URLS.ollama, // Uses the same URL as Ollama
          model: 'deepscaler:7b'
        }
      }));
    }
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

  const renderProjectManagerCard = () => {
    const projectManagerModels = settings?.projectManager?.models || [];
    const isLoadingModels = settings?.projectManager?.loading || false;
    
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Manager Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure the dedicated LLM endpoint for the Project Manager agent. This agent is persistent across the project and uses a DeepScaler model with function calling capabilities.
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!validationErrors.projectManager.apiUrl} sx={{ mb: 2 }}>
                <TextField
                  label="API URL"
                  value={formData.projectManager.apiUrl}
                  onChange={(e) => handleInputChange('projectManager', 'apiUrl', e.target.value)}
                  error={!!validationErrors.projectManager.apiUrl}
                  helperText={validationErrors.projectManager.apiUrl}
                  placeholder="http://localhost:11434"
                  InputProps={{
                    endAdornment: (
                      <Tooltip title="The URL of your Ollama API endpoint">
                        <IconButton size="small" edge="end">
                          <HelpOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!validationErrors.projectManager.model} sx={{ mb: 2 }}>
                <InputLabel>Model</InputLabel>
                <Select
                  value={formData.projectManager.model}
                  onChange={(e) => handleInputChange('projectManager', 'model', e.target.value)}
                  label="Model"
                  error={!!validationErrors.projectManager.model}
                  disabled={isLoadingModels || projectManagerModels.length === 0}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {projectManagerModels.map((model, index) => (
                    <MenuItem key={index} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                  {projectManagerModels.length === 0 && (
                    <MenuItem value="deepscaler:7b">
                      deepscaler:7b (default)
                    </MenuItem>
                  )}
                </Select>
                <FormHelperText>
                  {validationErrors.projectManager.model || 
                  (projectManagerModels.length === 0 && !isLoadingModels && 'Test connection to load available models') ||
                  (isLoadingModels && 'Loading models...') ||
                  "Recommended: deepscaler:7b or deepscaler:14b"}
                </FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Advanced Parameters
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Temperature"
                  type="number"
                  value={formData.projectManager.parameters?.temperature || 0.7}
                  onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                  inputProps={{ 
                    step: 0.1,
                    min: 0,
                    max: 2
                  }}
                  helperText="Controls randomness (0-2)"
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Top P"
                  type="number"
                  value={formData.projectManager.parameters?.topP || 0.9}
                  onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
                  inputProps={{ 
                    step: 0.05,
                    min: 0,
                    max: 1
                  }}
                  helperText="Nucleus sampling (0-1)"
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Top K"
                  type="number"
                  value={formData.projectManager.parameters?.topK || 40}
                  onChange={(e) => handleParameterChange('topK', parseInt(e.target.value))}
                  inputProps={{ 
                    step: 1,
                    min: 1,
                    max: 100
                  }}
                  helperText="Limits vocabulary choices"
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Repeat Penalty"
                  type="number"
                  value={formData.projectManager.parameters?.repeatPenalty || 1.1}
                  onChange={(e) => handleParameterChange('repeatPenalty', parseFloat(e.target.value))}
                  inputProps={{ 
                    step: 0.1,
                    min: 1,
                    max: 2
                  }}
                  helperText="Prevents repetition (1-2)"
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Max Tokens"
                  type="number"
                  value={formData.projectManager.parameters?.maxTokens || 1024}
                  onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
                  inputProps={{ 
                    step: 128,
                    min: 128,
                    max: 8192
                  }}
                  helperText="Maximum output length"
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Context Length"
                  type="number"
                  value={formData.projectManager.parameters?.contextLength || 4096}
                  onChange={(e) => handleParameterChange('contextLength', parseInt(e.target.value))}
                  inputProps={{ 
                    step: 1024,
                    min: 2048,
                    max: 32768
                  }}
                  helperText="Maximum context window"
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={() => handleTestConnection('projectManager')}
                    startIcon={isLoadingModels ? <CircularProgress size={20} /> : <CheckCircle />}
                    disabled={isLoadingModels}
                    sx={{ mr: 2 }}
                  >
                    {isLoadingModels ? 'Loading Models...' : 'Test Connection'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={handleBenchmark}
                    startIcon={isBenchmarking ? <CircularProgress size={20} /> : <Assessment />}
                    disabled={isBenchmarking || !formData.projectManager.model}
                    color="info"
                  >
                    {isBenchmarking ? 'Benchmarking...' : 'Benchmark Model'}
                  </Button>
                </Box>
                
                <Button
                  variant="outlined"
                  onClick={() => handleUseDefault('projectManager')}
                  color="secondary"
                >
                  Use Default
                </Button>
              </Box>
              
              {servicesManuallyLoaded.projectManager && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Connection successful! {projectManagerModels.length > 0 ? 
                    `Found ${projectManagerModels.length} compatible models.` : 
                    'No compatible models found. Using default model.'}
                </Alert>
              )}
              
              {benchmarkResults && (
                <Paper elevation={1} sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="h6" gutterBottom>
                    Benchmark Results: {benchmarkResults.model}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle2">
                        Overall Score: {benchmarkResults.averageScore.toFixed(1)}/10
                      </Typography>
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <Box sx={{ 
                          height: 10, 
                          width: `${benchmarkResults.averageScore * 10}%`, 
                          bgcolor: getScoreColor(benchmarkResults.averageScore),
                          borderRadius: 5
                        }} />
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2">
                        Avg. Latency: {benchmarkResults.averageLatency.toFixed(0)}ms
                      </Typography>
                      <Typography variant="body2">
                        Tokens/sec: {benchmarkResults.averageTokensPerSecond.toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Test Results:
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {benchmarkResults.tests.map((test, index) => (
                      <Grid item xs={12} key={index}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                            {test.name}:
                          </Typography>
                          <Box sx={{ 
                            height: 8, 
                            width: `${test.score * 10}%`, 
                            bgcolor: getScoreColor(test.score),
                            borderRadius: 4,
                            ml: 2,
                            mr: 2,
                            flexGrow: 1
                          }} />
                          <Typography variant="body2">
                            {test.score}/10
                          </Typography>
                        </Box>
                        {test.error ? (
                          <Typography variant="body2" color="error.main" sx={{ ml: 2, fontSize: '0.8rem' }}>
                            Error: {test.error}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontSize: '0.8rem' }}>
                            {test.response}
                          </Typography>
                        )}
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="LLM Providers" />
          <Tab label="Project Manager" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>
      
      {activeTab === 0 ? (
        <>
          <Typography variant="h4" gutterBottom>
            LLM Providers
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
      ) : activeTab === 1 ? (
        <>
          {renderProjectManagerCard()}
        </>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            Environment Configuration
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" paragraph>
              View and edit your environment configuration in JSON or YAML format. This configuration is synchronized with the settings in the LLM Providers tab.
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
