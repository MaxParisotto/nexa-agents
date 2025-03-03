import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress,
  Alert, Stepper, Step, StepLabel, StepContent, Card, CardContent,
  Grid, Divider, Chip, IconButton, Tooltip, Link
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Custom GPT Uplink Component - Creates uplinks between Nexa and GPT-based products
 */
export default function GptUplink() {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uplinkData, setUplinkData] = useState({
    name: 'Nexa Assistant',
    description: 'Connect to Nexa Agents for advanced workflow orchestration',
    apiKey: '',
    endpoint: 'https://api.example.com/nexa-uplink',
    verified: false,
  });
  const [copied, setCopied] = useState(false);
  
  // Handle next step
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  // Handle back step
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUplinkData(prev => ({ ...prev, [name]: value }));
  };
  
  // Generate API key
  const generateApiKey = async () => {
    setLoading(true);
    try {
      // This would be an actual API call in a real application
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Generate a random API key for demo purposes
      const randomKey = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
        
      setUplinkData(prev => ({ ...prev, apiKey: randomKey }));
      setError(null);
    } catch (err) {
      setError('Failed to generate API key. Please try again.');
      console.error('Error generating API key:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Verify connection
  const verifyConnection = async () => {
    setLoading(true);
    try {
      // This would be an actual API call in a real application
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // Simulate success (usually 80% of the time)
      const success = Math.random() > 0.2;
      
      if (success) {
        setUplinkData(prev => ({ ...prev, verified: true }));
        setSuccess('Connection verified successfully! Your Custom GPT is now linked to Nexa Agents.');
        setError(null);
      } else {
        throw new Error("Couldn't verify connection. Make sure your Custom GPT is configured correctly.");
      }
    } catch (err) {
      setError(err.message || 'Failed to verify connection. Please check your configuration.');
      console.error('Error verifying connection:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Copy endpoint to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        // Reset copied status after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };
  
  // Steps for connecting
  const steps = [
    {
      label: 'Configure Uplink',
      description: 'Enter a name and description for your GPT uplink.',
      content: (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={uplinkData.name}
            onChange={handleChange}
            margin="normal"
            helperText="Name of your Custom GPT"
          />
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={uplinkData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
            helperText="How your Custom GPT will use Nexa Agents"
          />
          <Button 
            variant="contained" 
            onClick={handleNext}
            sx={{ mt: 2 }}
          >
            Continue
          </Button>
        </Box>
      ),
    },
    {
      label: 'Generate API Key',
      description: 'Create a secure API key for authenticating your Custom GPT.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textSecondary" paragraph>
            Generate a unique API key that will be used to authenticate requests from your Custom GPT.
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextField
              fullWidth
              label="API Key"
              value={uplinkData.apiKey}
              InputProps={{ readOnly: true }}
              margin="normal"
              sx={{ mr: 1 }}
            />
            <Button
              variant={uplinkData.apiKey ? "outlined" : "contained"}
              onClick={generateApiKey}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {uplinkData.apiKey ? "Regenerate" : "Generate"}
            </Button>
          </Box>
          
          {uplinkData.apiKey && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Save this API key in a secure location. For security reasons, it won't be displayed again.
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!uplinkData.apiKey}
            >
              Continue
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: 'Configure Custom GPT',
      description: 'Add this information to your GPT in the OpenAI platform.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" paragraph>
            In the OpenAI Custom GPT creator, go to "Configure" and add the following Action:
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="h6">Nexa Agent Orchestration</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>Endpoint URL:</Typography>
                <Chip 
                  label={uplinkData.endpoint}
                  onDelete={() => copyToClipboard(uplinkData.endpoint)}
                  deleteIcon={copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Authentication:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>Type:</Typography>
                    <Chip size="small" label="API Key" />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>API Key:</Typography>
                    <Chip 
                      size="small"
                      label={uplinkData.apiKey.substring(0, 8) + '...'}
                      icon={<LockIcon fontSize="small" />}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Follow the prompts in the OpenAI interface to define the schema. We recommend using the API endpoint URL directly which will return OpenAPI documentation.
          </Alert>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Continue
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: 'Verify Connection',
      description: 'Test the connection between your Custom GPT and Nexa Agents.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" paragraph>
            Now that you've configured your Custom GPT, let's verify the connection. Click the "Verify Connection" button below.
          </Typography>
          
          {uplinkData.verified ? (
            <Alert 
              severity="success" 
              icon={<CheckCircleIcon fontSize="inherit" />}
              sx={{ mb: 3 }}
            >
              Connection verified successfully! Your Custom GPT is now linked to Nexa Agents.
            </Alert>
          ) : (
            <Button
              variant="contained"
              onClick={verifyConnection}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              sx={{ mb: 3 }}
            >
              Verify Connection
            </Button>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              variant="contained"
              color="success"
              disabled={!uplinkData.verified}
              endIcon={<ArrowForwardIcon />}
            >
              Finish Setup
            </Button>
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Custom GPT Uplink</Typography>
        <Typography variant="body1" color="textSecondary">
          Connect your Custom GPT to Nexa Agents for enhanced workflow automation and agent orchestration.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === steps.length - 1 ? (
                    <Typography variant="caption">Last step</Typography>
                  ) : null
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography>{step.description}</Typography>
                {step.content}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>Need Help?</Typography>
        <Typography variant="body2">
          For more information on setting up Custom GPTs with external API connections, check out the{' '}
          <Link href="https://platform.openai.com/docs" target="_blank" rel="noopener">
            OpenAI documentation
          </Link>{' '}
          or{' '}
          <Link href="#/support">contact our support team</Link>.
        </Typography>
      </Box>
    </Box>
  );
}
