import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Box,
  Alert,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useSelector, useDispatch } from 'react-redux';

/**
 * OpenAI Uplink Settings component
 * Configures the integration with OpenAI's CustomGPT Action API
 */
const OpenAIUplinkSettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings.openaiUplink || {});
  
  // Initialize state with settings from Redux or defaults
  const [uplinkSettings, setUplinkSettings] = useState({
    enabled: settings.enabled ?? true,
    port: settings.port || 3002,
    requireApiKey: settings.requireApiKey ?? true,
    apiKey: settings.apiKey || generateApiKey(),
    allowedActions: settings.allowedActions || ['echo', 'systemInfo', 'queryAgent'],
    customActions: settings.customActions || []
  });
  
  const [saved, setSaved] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  
  // Generate a secure API key
  function generateApiKey() {
    return `nexauplink_${uuidv4().replace(/-/g, '')}`;
  }
  
  // Handle settings changes
  const handleChange = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setUplinkSettings({ ...uplinkSettings, [name]: value });
    setSaved(false);
  };
  
  // Handle regenerating API key
  const handleRegenerateApiKey = () => {
    setUplinkSettings({ ...uplinkSettings, apiKey: generateApiKey() });
    setSaved(false);
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Get the WebSocket URL for the uplink
  const getUplinkUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const hostname = window.location.hostname;
    const port = uplinkSettings.port;
    const apiKey = uplinkSettings.requireApiKey ? uplinkSettings.apiKey : '';
    
    return `${protocol}://${hostname}:${port}/uplink${apiKey ? `?apiKey=${apiKey}` : ''}`;
  };
  
  // Update settings in Redux and localStorage
  const handleSave = () => {
    // Here you would typically dispatch an action to update settings
    // For now, we'll just simulate saving
    console.log('Saving OpenAI Uplink settings:', uplinkSettings);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ApiIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            OpenAI CustomGPT Uplink
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure the WebSocket uplink server that allows OpenAI CustomGPTs to connect and use your agents as actions.
        </Typography>
        
        {saved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Settings saved successfully. Server restart may be required for changes to take effect.
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={uplinkSettings.enabled}
                  onChange={handleChange('enabled')}
                  color="primary"
                />
              }
              label="Enable OpenAI Uplink Server"
            />
            
            <TextField
              label="Server Port"
              type="number"
              fullWidth
              margin="normal"
              value={uplinkSettings.port}
              onChange={handleChange('port')}
              disabled={!uplinkSettings.enabled}
              helperText="Port for the WebSocket uplink server"
              inputProps={{ min: 1000, max: 65535 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={uplinkSettings.requireApiKey}
                  onChange={handleChange('requireApiKey')}
                  disabled={!uplinkSettings.enabled}
                  color="primary"
                />
              }
              label="Require API Key Authentication"
            />
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <TextField
                label="API Key"
                fullWidth
                value={uplinkSettings.apiKey}
                onChange={handleChange('apiKey')}
                disabled={!uplinkSettings.enabled || !uplinkSettings.requireApiKey}
                InputProps={{
                  endAdornment: (
                    <>
                      <Tooltip title="Copy API Key">
                        <IconButton
                          edge="end"
                          onClick={() => copyToClipboard(uplinkSettings.apiKey, setApiKeyCopied)}
                          disabled={!uplinkSettings.enabled || !uplinkSettings.requireApiKey}
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Generate New API Key">
                        <IconButton
                          edge="end"
                          onClick={handleRegenerateApiKey}
                          disabled={!uplinkSettings.enabled || !uplinkSettings.requireApiKey}
                        >
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  ),
                }}
              />
              {apiKeyCopied && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  API key copied to clipboard!
                </Alert>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ backgroundColor: 'background.default', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                WebSocket Connection URL
              </Typography>
              <Typography
                variant="body2"
                component="div"
                sx={{
                  fontFamily: 'monospace',
                  p: 1,
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  wordBreak: 'break-all'
                }}
              >
                {getUplinkUrl()}
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(getUplinkUrl(), setUrlCopied)}
                    sx={{ ml: 1 }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Typography>
              {urlCopied && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  WebSocket URL copied to clipboard!
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Use this URL in your OpenAI CustomGPT actions specification.
              </Typography>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Available Actions
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {uplinkSettings.allowedActions.map(action => (
                <Chip 
                  key={action} 
                  label={action} 
                  color="primary" 
                  variant="outlined" 
                />
              ))}
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={!uplinkSettings.enabled}
          >
            Save Settings
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OpenAIUplinkSettings;
