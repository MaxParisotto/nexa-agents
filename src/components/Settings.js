import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels, saveSettings } from '../store/actions/settingsActions';
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
  Tooltip
} from '@mui/material';
import { HelpOutline, Info, ErrorOutline, CheckCircle } from '@mui/icons-material';
import { addNotification } from '../store/actions/systemActions';
import { logInfo, logError, LOG_CATEGORIES } from '../store/actions/logActions';

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

  useEffect(() => {
    // Log current settings on component mount
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings component mounted', { 
      lmStudio: settings?.lmStudio,
      ollama: settings?.ollama
    }));
  }, []);

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
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Saving LLM settings', formData));
      dispatch(saveSettings(formData));
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

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
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
