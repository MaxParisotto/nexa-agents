import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import { setDefaultModel, updateModelSettings, fetchAvailableModels } from '../../store/actions/modelActions';
import apiClient from '../../utils/apiClient';

const ModelSettings = () => {
  const dispatch = useDispatch();
  const { models, loading, error } = useSelector(state => state.models);
  const [selectedModel, setSelectedModel] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [modelSettings, setModelSettings] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    enabled: true
  });
  
  // Load models when component mounts
  useEffect(() => {
    dispatch(fetchAvailableModels());
  }, [dispatch]);
  
  const handleEditModel = (model) => {
    setSelectedModel(model);
    setModelSettings({
      temperature: model.settings?.temperature || 0.7,
      maxTokens: model.settings?.maxTokens || 1000,
      enabled: model.settings?.enabled !== false
    });
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedModel(null);
  };
  
  const handleSaveModelSettings = async () => {
    try {
      await dispatch(updateModelSettings(selectedModel.id, modelSettings));
      setNotification({
        open: true,
        message: `Settings for ${selectedModel.name} saved successfully`,
        severity: 'success'
      });
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save model settings:', error);
      setNotification({
        open: true,
        message: `Error saving model settings: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleSetDefaultModel = async (modelId) => {
    try {
      await dispatch(setDefaultModel(modelId));
      setNotification({
        open: true,
        message: 'Default model updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to set default model:', error);
      setNotification({
        open: true,
        message: `Error setting default model: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleTestModel = async (model) => {
    try {
      const response = await apiClient.models.testModel(model.id);
      
      setNotification({
        open: true,
        message: response.success 
          ? `Test successful: ${response.message}` 
          : `Test failed: ${response.error}`,
        severity: response.success ? 'success' : 'error'
      });
    } catch (error) {
      console.error('Model test failed:', error);
      setNotification({
        open: true,
        message: `Test failed: ${error.message}`,
        severity: 'error'
      });
    }
  };
  
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  const handleSettingsChange = (event) => {
    const { name, value, checked, type } = event.target;
    setModelSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  if (loading && !models.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  const getModelStatusColor = (status) => {
    if (status === 'available') return 'success';
    if (status === 'unavailable') return 'error';
    return 'warning'; // for degraded or other states
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>AI Model Settings</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => dispatch(fetchAvailableModels())}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Refreshing...' : 'Refresh Models'}
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {models.map((model) => (
          <Grid item xs={12} sm={6} md={4} key={model.id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {model.name}
                  </Typography>
                  <Chip 
                    label={model.status} 
                    size="small"
                    color={getModelStatusColor(model.status)}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  Provider: {model.provider}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Context: {model.contextLength.toLocaleString()} tokens
                </Typography>
                
                {model.isDefault && (
                  <Chip 
                    label="Default Model" 
                    color="primary" 
                    size="small" 
                    sx={{ mt: 1 }} 
                  />
                )}
                
                {model.settings?.enabled === false && (
                  <Chip 
                    label="Disabled" 
                    color="default" 
                    size="small" 
                    sx={{ mt: 1, ml: 1 }} 
                  />
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  onClick={() => model.isDefault 
                    ? handleEditModel(model) 
                    : handleSetDefaultModel(model.id)
                  }
                >
                  {model.isDefault ? 'Edit Settings' : 'Set as Default'}
                </Button>
                <Button 
                  size="small" 
                  color="secondary"
                  onClick={() => handleTestModel(model)}
                >
                  Test
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Model Settings Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedModel?.name} Settings
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="temperature"
                  label="Temperature"
                  type="number"
                  variant="outlined"
                  value={modelSettings.temperature}
                  onChange={handleSettingsChange}
                  inputProps={{ 
                    min: 0, 
                    max: 1, 
                    step: 0.1 
                  }}
                  helperText="Controls randomness (0-1). Lower is more deterministic."
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="maxTokens"
                  label="Max Tokens"
                  type="number"
                  variant="outlined"
                  value={modelSettings.maxTokens}
                  onChange={handleSettingsChange}
                  inputProps={{ min: 1 }}
                  helperText="Maximum tokens to generate in completion."
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="enabled"
                      checked={modelSettings.enabled}
                      onChange={handleSettingsChange}
                    />
                  }
                  label="Enabled"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveModelSettings} variant="contained" color="primary">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default ModelSettings;
