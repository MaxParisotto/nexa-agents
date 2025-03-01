import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveSettings } from '../store/actions/settingsActions';
import { 
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Switch,
  FormControlLabel
} from '@mui/material';
import { addNotification } from '../store/actions/systemActions';

const UplinkConfig = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  
  const [formData, setFormData] = useState({
    websocket: {
      enabled: settings?.uplink?.websocket?.enabled || false,
      port: settings?.uplink?.websocket?.port || 3002,
      apiPath: settings?.uplink?.websocket?.apiPath || '/api/v1/ws',
      restApi: {
        enabled: settings?.uplink?.websocket?.restApi?.enabled || false,
        path: settings?.uplink?.websocket?.restApi?.path || '/api/v1/rest',
        methods: settings?.uplink?.websocket?.restApi?.methods || ['GET', 'POST', 'PUT', 'DELETE']
      },
      authentication: {
        type: settings?.uplink?.websocket?.authentication?.type || 'apiKey',
        header: settings?.uplink?.websocket?.authentication?.header || 'X-API-KEY'
      },
      rateLimiting: {
        enabled: settings?.uplink?.websocket?.rateLimiting?.enabled || true,
        maxRequests: settings?.uplink?.websocket?.rateLimiting?.maxRequests || 100,
        windowMs: settings?.uplink?.websocket?.rateLimiting?.windowMs || 60000
      }
    }
  });

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    try {
      const updatedSettings = {
        ...settings,
        uplink: {
          websocket: formData.websocket
        }
      };

      await dispatch(saveSettings(updatedSettings));
      
      dispatch(addNotification({
        type: 'success',
        message: 'Uplink configuration saved successfully'
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to save uplink configuration: ${error.message}`
      }));
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Uplink Configuration
        </Typography>
        
        <Grid container spacing={3}>
          {/* Websocket Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Websocket Server
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.websocket.enabled}
                  onChange={(e) => handleInputChange('websocket', 'enabled', e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Websocket Server"
            />
            
            {formData.websocket.enabled && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Port"
                      type="number"
                      value={formData.websocket.port}
                      onChange={(e) => handleInputChange('websocket', 'port', e.target.value)}
                      helperText="Port to expose the websocket server on"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="API Path"
                      value={formData.websocket.apiPath}
                      onChange={(e) => handleInputChange('websocket', 'apiPath', e.target.value)}
                      helperText="Websocket API endpoint path"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Grid>

          {/* REST API Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              REST API Configuration
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.websocket.restApi.enabled}
                  onChange={(e) => handleNestedInputChange('websocket', 'restApi', 'enabled', e.target.checked)}
                  color="primary"
                />
              }
              label="Enable REST API"
            />
            
            {formData.websocket.restApi.enabled && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="API Path"
                      value={formData.websocket.restApi.path}
                      onChange={(e) => handleNestedInputChange('websocket', 'restApi', 'path', e.target.value)}
                      helperText="REST API endpoint path"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Allowed Methods</InputLabel>
                      <Select
                        multiple
                        value={formData.websocket.restApi.methods}
                        onChange={(e) => handleNestedInputChange('websocket', 'restApi', 'methods', e.target.value)}
                        renderValue={(selected) => selected.join(', ')}
                      >
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                          <MenuItem key={method} value={method}>
                            {method}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select allowed HTTP methods</FormHelperText>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Grid>

          {/* Authentication Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Authentication
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Authentication Type</InputLabel>
                  <Select
                    value={formData.websocket.authentication.type}
                    onChange={(e) => handleNestedInputChange('websocket', 'authentication', 'type', e.target.value)}
                    label="Authentication Type"
                  >
                    <MenuItem value="apiKey">API Key</MenuItem>
                    <MenuItem value="jwt">JWT</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {formData.websocket.authentication.type === 'apiKey' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="API Key Header"
                    value={formData.websocket.authentication.header}
                    onChange={(e) => handleNestedInputChange('websocket', 'authentication', 'header', e.target.value)}
                    helperText="Header name for API key authentication"
                  />
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* Rate Limiting Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Rate Limiting
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.websocket.rateLimiting.enabled}
                  onChange={(e) => handleNestedInputChange('websocket', 'rateLimiting', 'enabled', e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Rate Limiting"
            />
            
            {formData.websocket.rateLimiting.enabled && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Requests"
                      type="number"
                      value={formData.websocket.rateLimiting.maxRequests}
                      onChange={(e) => handleNestedInputChange('websocket', 'rateLimiting', 'maxRequests', e.target.value)}
                      helperText="Maximum requests per window"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Window (ms)"
                      type="number"
                      value={formData.websocket.rateLimiting.windowMs}
                      onChange={(e) => handleNestedInputChange('websocket', 'rateLimiting', 'windowMs', e.target.value)}
                      helperText="Time window for rate limiting"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSave}
          >
            Save Configuration
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UplinkConfig;
