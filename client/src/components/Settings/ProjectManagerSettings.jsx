import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, FormControl, InputLabel,
  Select, MenuItem, TextField, Button, Alert, Divider,
  Card, CardContent, CardActions, Switch, FormControlLabel,
  Chip, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Accordion, AccordionSummary, AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  SmartToy as SmartToyIcon,
  Psychology as PsychologyIcon,
  Build as BuildIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

import { apiService } from '../../services/api';

/**
 * Project Manager Settings Component
 * Dedicated settings for the Project Manager agent
 */
export default function ProjectManagerSettings({ settings, onUpdateSettings }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [projectManager, setProjectManager] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);

  // Find the Project Manager agent in settings
  useEffect(() => {
    if (settings?.agents?.items) {
      const pm = settings.agents.items.find(agent => agent.isProjectManager === true);
      if (pm) {
        setProjectManager(pm);
      } else {
        // If no Project Manager found, find it in the default settings
        const defaultAgents = settings.agents?.items || [];
        const defaultPM = defaultAgents.find(agent => agent.id === 'agent-project-manager');
        
        if (defaultPM) {
          // Use the default Project Manager from settings
          setProjectManager({
            ...defaultPM,
            // Ensure it has the isProjectManager flag
            isProjectManager: true
          });
        } else {
          // As a last resort, create a minimal Project Manager with real provider data
          const defaultProvider = settings.llmProviders.find(p => p.enabled);
          const defaultModel = defaultProvider?.defaultModel || defaultProvider?.models?.[0] || '';
          
          setProjectManager({
            id: 'agent-project-manager',
            name: 'Project Manager',
            description: 'Advanced agent that can help create and manage other agents, tools, and the environment',
            providerId: defaultProvider?.id || '',
            model: defaultModel,
            enabled: true,
            personality: 'Professional, efficient, and proactive',
            directives: [],
            hierarchyLevel: 4,
            tools: [],
            systemPrompt: '',
            temperature: 0.7,
            maxTokens: 2048,
            isProjectManager: true
          });
        }
      }
    }
  }, [settings]);

  // Update available providers when settings change
  useEffect(() => {
    if (settings?.llmProviders) {
      setAvailableProviders(settings.llmProviders.filter(p => p.enabled));
    }
  }, [settings]);

  // Update available tools when settings change
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await apiService.getTools();
        setAvailableTools(response.data);
      } catch (err) {
        console.error('Error fetching tools:', err);
      }
    };

    fetchTools();
  }, []);

  // Update available models when provider changes
  useEffect(() => {
    if (projectManager?.providerId) {
      const provider = settings.llmProviders.find(p => p.id === projectManager.providerId);
      if (provider) {
        setAvailableModels(provider.models || []);
      }
    }
  }, [projectManager?.providerId, settings.llmProviders]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProjectManager(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle tool selection
  const handleToolChange = (e) => {
    const { value } = e.target;
    setProjectManager(prev => ({
      ...prev,
      tools: value
    }));
  };

  // Save Project Manager settings
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required fields
      if (!projectManager.name) {
        setError('Agent name is required');
        setLoading(false);
        return;
      }
      
      if (!projectManager.providerId) {
        setError('LLM Provider is required');
        setLoading(false);
        return;
      }
      
      if (!projectManager.model) {
        setError('Model is required');
        setLoading(false);
        return;
      }

      // Update the Project Manager in the agents list
      const updatedAgents = settings.agents.items.map(agent => 
        agent.isProjectManager ? projectManager : agent
      );

      // If Project Manager doesn't exist in the list, add it
      if (!updatedAgents.some(agent => agent.isProjectManager)) {
        updatedAgents.push(projectManager);
      }

      // Update settings
      onUpdateSettings('agents', {
        ...settings.agents,
        items: updatedAgents
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(`Failed to save Project Manager settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!projectManager) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Project Manager</Typography>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure the Project Manager agent, which has special privileges to manage other agents, tools, and the environment.
        This agent is linked to the chat widget and can respond to natural language requests for system management.
      </Alert>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Project Manager settings saved successfully
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Agent Name"
              name="name"
              value={projectManager.name}
              onChange={handleInputChange}
              required
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={projectManager.enabled}
                  onChange={handleInputChange}
                  name="enabled"
                />
              }
              label="Enabled"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={projectManager.description}
              onChange={handleInputChange}
              multiline
              rows={2}
            />
          </Grid>
          
          {/* LLM Provider Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              LLM Provider Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>LLM Provider</InputLabel>
              <Select
                name="providerId"
                value={projectManager.providerId}
                onChange={handleInputChange}
                label="LLM Provider"
              >
                {availableProviders.map(provider => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Model</InputLabel>
              <Select
                name="model"
                value={projectManager.model}
                onChange={handleInputChange}
                label="Model"
                disabled={!projectManager.providerId || availableModels.length === 0}
              >
                {availableModels.map(model => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Personality & Directives */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Personality & Directives
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Personality"
              name="personality"
              value={projectManager.personality}
              onChange={handleInputChange}
              placeholder="e.g., Professional, efficient, and proactive"
              helperText="Describe the agent's personality traits"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="System Prompt"
              name="systemPrompt"
              value={projectManager.systemPrompt}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="You are the Project Manager, an advanced AI agent with the ability to help users create and manage other agents..."
              helperText="System prompt that defines the agent's behavior"
            />
          </Grid>
          
          {/* Tools */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Tools
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Assigned Tools</InputLabel>
              <Select
                multiple
                name="tools"
                value={projectManager.tools || []}
                onChange={handleToolChange}
                label="Assigned Tools"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((toolId) => {
                      const tool = availableTools.find(t => t.id === toolId);
                      return (
                        <Chip 
                          key={toolId} 
                          label={tool?.name || toolId}
                          size="small"
                          icon={<BuildIcon />}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {availableTools.map((tool) => (
                  <MenuItem key={tool.id} value={tool.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BuildIcon sx={{ mr: 1, fontSize: '0.9rem' }} />
                      <Box>
                        <Typography variant="body2">{tool.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tool.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Advanced Settings */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Advanced Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Temperature"
                      name="temperature"
                      type="number"
                      value={projectManager.temperature}
                      onChange={handleInputChange}
                      inputProps={{ min: 0, max: 2, step: 0.1 }}
                      helperText="Controls randomness (0-2)"
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max Tokens"
                      name="maxTokens"
                      type="number"
                      value={projectManager.maxTokens}
                      onChange={handleInputChange}
                      inputProps={{ min: 1, max: 8192 }}
                      helperText="Maximum output length"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Hierarchy Level</InputLabel>
                      <Select
                        name="hierarchyLevel"
                        value={projectManager.hierarchyLevel}
                        onChange={handleInputChange}
                        label="Hierarchy Level"
                      >
                        {settings.agents?.hierarchyLevels?.map(level => (
                          <MenuItem key={level.id} value={level.id}>
                            {level.name}
                          </MenuItem>
                        )) || (
                          <MenuItem value={4}>Manager</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Chat Widget Integration
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="body2" paragraph>
          The Project Manager agent is linked to the chat widget, allowing users to interact with it using natural language.
          The chat widget has been renamed from "Nexa Chat" to "Project Manager" to reflect this integration.
        </Typography>
        
        <Alert severity="info">
          You can use the chat widget to ask the Project Manager to create new agents, configure tools, or perform other system management tasks.
        </Alert>
      </Paper>
    </Box>
  );
}
