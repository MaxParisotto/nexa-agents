import React from 'react';
import {
  Grid, Typography, Box, Switch, FormControlLabel, 
  TextField, Divider, Card, CardContent, Button, 
  Link, Alert, Chip
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import CloudIcon from '@mui/icons-material/Cloud';
import SlackIcon from '@mui/icons-material/AlternateEmail';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/**
 * Integration Settings Form Component for configuring external services
 * 
 * @param {Object} props - Component props
 * @param {Object} props.settings - Settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 */
export default function IntegrationSettingsForm({ settings, onSettingChange }) {
  // Ensure integrations exist in settings
  const integrations = settings.integrations || {
    github: { enabled: false, token: '' },
    slack: { enabled: false, webhookUrl: '' },
    customGpt: { enabled: false },
    cloud: { enabled: false, apiKey: '' }
  };
  
  // Handle integration toggle
  const handleIntegrationToggle = (integration, value) => {
    onSettingChange('integrations', integration, {
      ...settings.integrations?.[integration],
      enabled: value
    });
  };
  
  // Handle integration field change
  const handleIntegrationFieldChange = (integration, field, value) => {
    onSettingChange('integrations', integration, {
      ...settings.integrations?.[integration],
      [field]: value
    });
  };
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Integration Settings</Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Connect Nexa Agents with external services and platforms
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Integration settings are securely stored and encrypted.
        </Alert>
      </Grid>
      
      {/* GitHub Integration */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <GitHubIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">GitHub</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={integrations.github?.enabled || false}
                    onChange={(e) => handleIntegrationToggle('github', e.target.checked)}
                    color="primary"
                  />
                }
                label={integrations.github?.enabled ? "Enabled" : "Disabled"}
              />
            </Box>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
              Connect to GitHub to access repositories, create pull requests, and track issues.
            </Typography>
            
            <TextField
              fullWidth
              label="GitHub Token"
              type="password"
              value={integrations.github?.token || ''}
              onChange={(e) => handleIntegrationFieldChange('github', 'token', e.target.value)}
              disabled={!integrations.github?.enabled}
              placeholder="ghp_..."
              helperText={
                <Typography variant="caption">
                  Generate a token with repo scope. 
                  <Link 
                    href="https://github.com/settings/tokens/new" 
                    target="_blank" 
                    rel="noopener"
                    sx={{ ml: 1 }}
                  >
                    Generate token <OpenInNewIcon fontSize="inherit" />
                  </Link>
                </Typography>
              }
              margin="normal"
              size="small"
            />
            
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 1 }}
              disabled={!integrations.github?.enabled || !integrations.github?.token}
            >
              Test Connection
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Slack Integration */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SlackIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">Slack</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={integrations.slack?.enabled || false}
                    onChange={(e) => handleIntegrationToggle('slack', e.target.checked)}
                    color="primary"
                  />
                }
                label={integrations.slack?.enabled ? "Enabled" : "Disabled"}
              />
            </Box>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
              Receive notifications in Slack about workflow status and critical events.
            </Typography>
            
            <TextField
              fullWidth
              label="Webhook URL"
              value={integrations.slack?.webhookUrl || ''}
              onChange={(e) => handleIntegrationFieldChange('slack', 'webhookUrl', e.target.value)}
              disabled={!integrations.slack?.enabled}
              placeholder="https://hooks.slack.com/services/..."
              helperText="Enter your Slack Incoming Webhook URL"
              margin="normal"
              size="small"
            />
            
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 1 }}
              disabled={!integrations.slack?.enabled || !integrations.slack?.webhookUrl}
            >
              Send Test Message
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Custom GPT Integration */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" fontWeight="bold">Custom GPT</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {integrations.customGpt?.connected && (
                  <Chip 
                    label="Connected" 
                    color="success" 
                    size="small"
                    sx={{ mr: 1 }}
                  />
                )}
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={integrations.customGpt?.enabled || false}
                      onChange={(e) => handleIntegrationToggle('customGpt', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={integrations.customGpt?.enabled ? "Enabled" : "Disabled"}
                />
              </Box>
            </Box>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
              Connect Nexa Agents with OpenAI's Custom GPT to enable advanced agent workflows.
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary"
              size="small" 
              component={Link}
              href="#/integrations/gpt-uplink"
              disabled={!integrations.customGpt?.enabled}
            >
              Configure GPT Uplink
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Cloud Storage Integration */}
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CloudIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">Cloud Storage</Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={integrations.cloud?.enabled || false}
                    onChange={(e) => handleIntegrationToggle('cloud', e.target.checked)}
                    color="primary"
                  />
                }
                label={integrations.cloud?.enabled ? "Enabled" : "Disabled"}
              />
            </Box>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
              Store workflow results and artifacts in cloud storage.
            </Typography>
            
            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={integrations.cloud?.apiKey || ''}
              onChange={(e) => handleIntegrationFieldChange('cloud', 'apiKey', e.target.value)}
              disabled={!integrations.cloud?.enabled}
              placeholder="Enter API key"
              margin="normal"
              size="small"
            />
            
            <TextField
              fullWidth
              label="Bucket Name"
              value={integrations.cloud?.bucketName || ''}
              onChange={(e) => handleIntegrationFieldChange('cloud', 'bucketName', e.target.value)}
              disabled={!integrations.cloud?.enabled}
              placeholder="my-bucket"
              margin="normal"
              size="small"
            />
            
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 1 }}
              disabled={!integrations.cloud?.enabled || !integrations.cloud?.apiKey}
            >
              Verify Storage Access
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}