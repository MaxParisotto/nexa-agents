import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, FormGroup, Slider, Box, Divider, Button, Grid, Chip
} from '@mui/material';
import { clearLogs } from '../../store/actions/logActions';
import { useDispatch } from 'react-redux';

/**
 * Component for configuring application logging settings
 */
const LogSettingsPanel = () => {
  const dispatch = useDispatch();
  const [settings, setSettings] = useState({
    logLevel: 'info',
    detailedModelLogs: false,
    connectionCheckInterval: 60, // seconds
    detailedLogThrottle: 5, // minutes
    projectManagerVerboseLogging: false,
    modelManagerVerboseLogging: false,
    logFullResponses: true,        // Add this setting
    maxResponseLogLength: 1000,    // Add this setting
    disabledLogCategories: []      // Add this setting for categories to disable completely
  });

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('logSettingsConfig');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error loading log settings:', e);
      }
    }
    
    // Load project manager settings
    try {
      const pmSettings = localStorage.getItem('projectManagerLoggingConfig');
      if (pmSettings) {
        const parsed = JSON.parse(pmSettings);
        setSettings(prev => ({
          ...prev,
          logLevel: parsed.logLevel || prev.logLevel,
          verboseModelChecks: parsed.verboseModelChecks || prev.detailedModelLogs,
          connectionCheckInterval: parsed.connectionCheckInterval / 1000 || prev.connectionCheckInterval,
          detailedLogThrottle: parsed.detailedLogThrottle / 60000 || prev.detailedLogThrottle
        }));
      }
    } catch (e) {
      console.error('Error loading project manager log settings:', e);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('logSettingsConfig', JSON.stringify(settings));
    
    // Update project manager logging config
    try {
      localStorage.setItem('projectManagerLoggingConfig', JSON.stringify({
        logLevel: settings.logLevel,
        verboseModelChecks: settings.detailedModelLogs,
        connectionCheckInterval: settings.connectionCheckInterval * 1000, // convert to ms
        detailedLogThrottle: settings.detailedLogThrottle * 60000, // convert to ms
        logFullResponses: settings.logFullResponses,
        maxResponseLogLength: settings.maxResponseLogLength
      }));
    } catch (e) {
      console.error('Error saving project manager log settings:', e);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSliderChange = (name) => (event, newValue) => {
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };
  
  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      dispatch(clearLogs());
    }
  };

  const logCategories = [
    { id: 'model-available', label: 'Model Availability Checks' },
    { id: 'connection-success', label: 'Connection Success Messages' },
    { id: 'model-list', label: 'Model List Details' },
    { id: 'settings-check', label: 'Settings Check Messages' },
    { id: 'llm-config-check', label: 'LLM Configuration Checks' },
    { id: 'connection-test', label: 'Connection Test Messages' },
    { id: 'api-request', label: 'API Request Details' }
  ];

  const handleCategoryToggle = (categoryId) => {
    setSettings(prev => {
      const currentDisabled = prev.disabledLogCategories || [];
      const isCurrentlyDisabled = currentDisabled.includes(categoryId);
      
      let newDisabled;
      if (isCurrentlyDisabled) {
        // Enable it by removing from disabled list
        newDisabled = currentDisabled.filter(id => id !== categoryId);
      } else {
        // Disable it by adding to disabled list
        newDisabled = [...currentDisabled, categoryId];
      }
      
      return {
        ...prev,
        disabledLogCategories: newDisabled
      };
    });
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>Log Settings</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Log Level</InputLabel>
              <Select
                name="logLevel"
                value={settings.logLevel}
                onChange={handleChange}
                label="Log Level"
              >
                <MenuItem value="debug">Debug (Verbose)</MenuItem>
                <MenuItem value="info">Info (Default)</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error Only</MenuItem>
              </Select>
            </FormControl>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.detailedModelLogs}
                    onChange={handleChange}
                    name="detailedModelLogs"
                  />
                }
                label="Show detailed model information in logs"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.projectManagerVerboseLogging}
                    onChange={handleChange}
                    name="projectManagerVerboseLogging"
                  />
                }
                label="Enable verbose Project Manager logging"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.modelManagerVerboseLogging}
                    onChange={handleChange}
                    name="modelManagerVerboseLogging"
                  />
                }
                label="Enable verbose Model Manager logging"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.logFullResponses}
                    onChange={handleChange}
                    name="logFullResponses"
                  />
                }
                label="Log full LLM responses"
              />
            </FormGroup>
            
            {!settings.logFullResponses && (
              <Box sx={{ mt: 2, ml: 3 }}>
                <Typography gutterBottom>Maximum response log length</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Slider
                    value={settings.maxResponseLogLength}
                    onChange={handleSliderChange('maxResponseLogLength')}
                    aria-labelledby="max-response-length-slider"
                    valueLabelDisplay="auto"
                    min={100}
                    max={5000}
                    step={100}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {settings.maxResponseLogLength} chars
                  </Typography>
                </Box>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>Server Connection Check Interval</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={settings.connectionCheckInterval}
                onChange={handleSliderChange('connectionCheckInterval')}
                aria-labelledby="connection-check-slider"
                valueLabelDisplay="auto"
                min={10}
                max={300}
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {settings.connectionCheckInterval} seconds
              </Typography>
            </Box>
            
            <Typography gutterBottom sx={{ mt: 2 }}>Log Throttling Time</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Slider
                value={settings.detailedLogThrottle}
                onChange={handleSliderChange('detailedLogThrottle')}
                aria-labelledby="throttle-slider"
                valueLabelDisplay="auto"
                min={1}
                max={30}
                sx={{ flexGrow: 1, mr: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {settings.detailedLogThrottle} minutes
              </Typography>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={handleClearLogs}
              >
                Clear All Logs
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Disable Specific Log Categories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select categories of logs that should be completely suppressed
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {logCategories.map(category => (
                <Chip
                  key={category.id}
                  label={category.label}
                  onClick={() => handleCategoryToggle(category.id)}
                  color={settings.disabledLogCategories?.includes(category.id) ? 'primary' : 'default'}
                  variant={settings.disabledLogCategories?.includes(category.id) ? 'filled' : 'outlined'}
                  sx={{ mb: 1 }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default LogSettingsPanel;
