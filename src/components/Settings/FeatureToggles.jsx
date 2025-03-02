import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControlLabel,
  Switch,
  Box,
  Button,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { updateFeatures } from '../../store/actions/settingsActions';

/**
 * Feature Toggles component for enabling/disabling application features
 */
const FeatureToggles = () => {
  const dispatch = useDispatch();
  const currentFeatures = useSelector(state => state.settings.features || {});
  
  // Use actual features that are implemented in the application
  const [features, setFeatures] = useState({
    // Chat & Project Management
    chatWidget: currentFeatures.chatWidget ?? true,
    projectManager: currentFeatures.projectManager ?? true,
    
    // LLM Integrations
    lmStudioIntegration: currentFeatures.lmStudioIntegration ?? true,
    ollamaIntegration: currentFeatures.ollamaIntegration ?? true,
    openaiUplink: currentFeatures.openaiUplink ?? true,
    
    // UI Features
    connectionStatus: currentFeatures.connectionStatus ?? true,
    darkMode: currentFeatures.darkMode ?? true,
    
    // Advanced Features
    logViewer: currentFeatures.logViewer ?? true,
    modelBenchmarking: currentFeatures.modelBenchmarking ?? true,
    llmDiagnostics: currentFeatures.llmDiagnostics ?? true,
    
    // Experimental Features
    multiModelInference: currentFeatures.multiModelInference ?? false,
    agentCollaboration: currentFeatures.agentCollaboration ?? false
  });
  
  const [saved, setSaved] = useState(false);

  const handleChange = (name) => (event) => {
    setFeatures({ ...features, [name]: event.target.checked });
    setSaved(false);
  };

  const handleSave = () => {
    dispatch(updateFeatures(features));
    setSaved(true);
    
    // Reset saved status after 3 seconds
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };
  
  // Feature metadata with descriptions for actual implemented features
  const featureInfo = {
    // Chat & Project Management
    chatWidget: {
      label: "Chat Widget",
      description: "Enable the floating chat assistant widget",
      stability: "stable"
    },
    projectManager: {
      label: "Project Manager",
      description: "Enable the project management and workflow system",
      stability: "stable"
    },
    
    // LLM Integrations
    lmStudioIntegration: {
      label: "LM Studio Integration",
      description: "Connect to local LM Studio server for inference",
      stability: "stable"
    },
    ollamaIntegration: {
      label: "Ollama Integration",
      description: "Connect to local Ollama server for inference",
      stability: "stable"
    },
    openaiUplink: {
      label: "OpenAI CustomGPT Uplink",
      description: "Allow OpenAI CustomGPTs to connect via WebSocket",
      stability: "beta"
    },
    
    // UI Features
    connectionStatus: {
      label: "Connection Status Indicator",
      description: "Show LLM server connection status in the interface",
      stability: "stable"
    },
    darkMode: {
      label: "Dark Mode Support",
      description: "Allow toggling between light and dark themes",
      stability: "stable"
    },
    
    // Advanced Features
    logViewer: {
      label: "Log Viewer",
      description: "View and filter application logs",
      stability: "stable"
    },
    modelBenchmarking: {
      label: "LLM Benchmarking",
      description: "Test and compare model performance",
      stability: "beta"
    },
    llmDiagnostics: {
      label: "LLM Diagnostics",
      description: "Advanced diagnostics for LLM server connections",
      stability: "beta"
    },
    
    // Experimental Features
    multiModelInference: {
      label: "Multi-Model Inference",
      description: "Run inference across multiple models simultaneously",
      stability: "experimental"
    },
    agentCollaboration: {
      label: "Agent Collaboration",
      description: "Allow multiple agents to work together on tasks",
      stability: "experimental"
    }
  };
  
  const getStabilityColor = (stability) => {
    switch (stability) {
      case 'stable':
        return 'success';
      case 'beta':
        return 'warning';
      case 'experimental':
        return 'error';
      default:
        return 'default';
    }
  };

  // Group features by category
  const featureCategories = {
    "Core Features": ["chatWidget", "projectManager", "darkMode"],
    "LLM Providers": ["lmStudioIntegration", "ollamaIntegration", "openaiUplink"],
    "Tools & Diagnostics": ["connectionStatus", "logViewer", "modelBenchmarking", "llmDiagnostics"],
    "Experimental": ["multiModelInference", "agentCollaboration"]
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Feature Toggles
        </Typography>
        
        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Feature settings saved successfully
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Enable or disable features. Some features are experimental and may not be fully stable.
        </Typography>
        
        {Object.entries(featureCategories).map(([category, featureKeys]) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
              {category}
            </Typography>
            
            <List disablePadding>
              {featureKeys.map((featureKey) => (
                <ListItem
                  key={featureKey}
                  secondaryAction={
                    <FormControlLabel
                      control={
                        <Switch
                          edge="end"
                          checked={features[featureKey]}
                          onChange={handleChange(featureKey)}
                          color="primary"
                        />
                      }
                      label=""
                    />
                  }
                  disablePadding
                  sx={{ pt: 1, pb: 1 }}
                >
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {featureInfo[featureKey]?.label || featureKey}
                        <Chip 
                          label={featureInfo[featureKey]?.stability || 'unknown'} 
                          size="small" 
                          color={getStabilityColor(featureInfo[featureKey]?.stability)}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                    secondary={featureInfo[featureKey]?.description || ''}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FeatureToggles;
