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
  
  // Default features with fallbacks from Redux state
  const [features, setFeatures] = useState({
    experimentalWorkflows: currentFeatures.experimentalWorkflows ?? false,
    advancedAgentConfig: currentFeatures.advancedAgentConfig ?? false,
    multiModelInference: currentFeatures.multiModelInference ?? true,
    collaborativeEditing: currentFeatures.collaborativeEditing ?? false,
    debugTools: currentFeatures.debugTools ?? false,
    dataVisualization: currentFeatures.dataVisualization ?? true,
    cloudSync: currentFeatures.cloudSync ?? false,
    remoteExecution: currentFeatures.remoteExecution ?? false
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
  
  // Feature metadata with descriptions and stability info
  const featureInfo = {
    experimentalWorkflows: {
      label: "Experimental Workflows",
      description: "Enable experimental workflow features and templates",
      stability: "experimental"
    },
    advancedAgentConfig: {
      label: "Advanced Agent Configuration",
      description: "Access advanced configuration options for AI agents",
      stability: "beta"
    },
    multiModelInference: {
      label: "Multi-Model Inference",
      description: "Run inference across multiple AI models simultaneously",
      stability: "stable"
    },
    collaborativeEditing: {
      label: "Collaborative Editing",
      description: "Allow multiple users to edit workflows simultaneously",
      stability: "beta"
    },
    debugTools: {
      label: "Debug Tools",
      description: "Advanced debugging tools for workflow development",
      stability: "beta"
    },
    dataVisualization: {
      label: "Data Visualization",
      description: "Advanced charts and visualization tools",
      stability: "stable"
    },
    cloudSync: {
      label: "Cloud Synchronization",
      description: "Sync your workflows and settings to the cloud",
      stability: "experimental"
    },
    remoteExecution: {
      label: "Remote Execution",
      description: "Execute workflows on remote servers",
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
        
        <List>
          {Object.keys(features).map((featureKey) => (
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
