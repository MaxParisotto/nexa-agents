import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Grid,
  Card, CardContent, CardActions, Switch, FormControlLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Divider, Accordion,
  AccordionSummary, AccordionDetails, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction, Autocomplete
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import SaveIcon from '@mui/icons-material/Save';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

import { apiService } from '../../services/api';

/**
 * Agent Settings Component
 * Allows users to create, edit, and manage AI agents
 */
export default function AgentSettings({ settings = {}, onUpdateSettings }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [newAgent, setNewAgent] = useState({
    id: '',
    name: '',
    description: '',
    providerId: '',
    model: '',
    enabled: true,
    personality: '',
    directives: [],
    hierarchyLevel: 1,
    tools: [],
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2048
  });
  const [newDirective, setNewDirective] = useState('');
  const [availableTools, setAvailableTools] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const response = await apiService.getAgents();
        setAgents(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch agents: ' + err.message);
        console.error('Error fetching agents:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchTools = async () => {
      try {
        const response = await apiService.getTools();
        setAvailableTools(response.data);
      } catch (err) {
        console.error('Error fetching tools:', err);
      }
    };

    fetchAgents();
    fetchTools();
  }, []);

  // Update local agents when settings change
  useEffect(() => {
    if (settings?.agents?.items) {
      setAgents(settings.agents.items);
    }
  }, [settings]);

  // Update available providers when settings change
  useEffect(() => {
    if (settings?.llmProviders) {
      setAvailableProviders(settings.llmProviders.filter(p => p.enabled));
    }
  }, [settings]);

  // Update available models when provider changes
  useEffect(() => {
    if (newAgent.providerId) {
      const provider = settings?.llmProviders?.find(p => p.id === newAgent.providerId);
      if (provider) {
        setAvailableModels(provider.models || []);
        
        // Set default model if available
        if (provider.models?.length > 0 && !newAgent.model) {
          setNewAgent(prev => ({
            ...prev,
            model: provider.defaultModel || provider.models[0]
          }));
        }
      }
    }
  }, [newAgent.providerId, settings?.llmProviders]);

  // Add a new agent
  const handleAddAgent = () => {
    setNewAgent({
      id: `agent-${Date.now()}`,
      name: '',
      description: '',
      providerId: settings?.llmProviders?.find(p => p.enabled)?.id || '',
      model: '',
      enabled: true,
      personality: '',
      directives: [],
      hierarchyLevel: 1,
      tools: [],
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 2048
    });
    setEditingAgent(null);
    setAddDialogOpen(true);
  };

  // Edit an existing agent
  const handleEditAgent = (agent) => {
    // Ensure tools is always an array
    setNewAgent({ 
      ...agent,
      tools: agent.tools || [],
      directives: agent.directives || []
    });
    setEditingAgent(agent);
    setAddDialogOpen(true);
  };

  // Delete an agent
  const handleDeleteAgent = (agentId) => {
    const updatedAgents = agents.filter(a => a.id !== agentId);
    onUpdateSettings('agents', {
      ...settings.agents,
      items: updatedAgents
    });
  };

  // Handle agent dialog input change
  const handleAgentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAgent(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Add a directive
  const handleAddDirective = () => {
    if (newDirective.trim()) {
      setNewAgent(prev => ({
        ...prev,
        directives: [...prev.directives, newDirective.trim()]
      }));
      setNewDirective('');
    }
  };

  // Remove a directive
  const handleRemoveDirective = (index) => {
    setNewAgent(prev => ({
      ...prev,
      directives: prev.directives.filter((_, i) => i !== index)
    }));
  };

  // Save agent
  const handleSaveAgent = async () => {
    setDialogLoading(true);
    
    try {
      // Validate required fields
      if (!newAgent.name) {
        setError('Agent name is required');
        setDialogLoading(false);
        return;
      }
      
      if (!newAgent.providerId) {
        setError('LLM Provider is required');
        setDialogLoading(false);
        return;
      }
      
      if (!newAgent.model) {
        setError('Model is required');
        setDialogLoading(false);
        return;
      }
      
      let updatedAgents;
      
      if (editingAgent) {
        // Update existing agent
        const response = await apiService.updateAgent(editingAgent.id, newAgent);
        updatedAgents = agents.map(a => a.id === editingAgent.id ? response.data : a);
      } else {
        // Create new agent
        const response = await apiService.createAgent(newAgent);
        updatedAgents = [...agents, response.data];
      }
      
      // Update settings
      onUpdateSettings('agents', {
        ...settings.agents,
        items: updatedAgents
      });
      
      // Close dialog
      setAddDialogOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to save agent: ' + err.message);
      console.error('Error saving agent:', err);
    } finally {
      setDialogLoading(false);
    }
  };

  // Toggle agent enable/disable
  const handleToggleAgent = (agentId) => {
    const updatedAgents = agents.map(agent => {
      if (agent.id === agentId) {
        return { ...agent, enabled: !agent.enabled };
      }
      return agent;
    });
    
    onUpdateSettings('agents', {
      ...settings.agents,
      items: updatedAgents
    });
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">AI Agents</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAgent}
        >
          Add Agent
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Create and manage AI agents with different personalities, directives, and capabilities.
        Assign LLM providers, models, and tools to each agent.
      </Alert>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {agents.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" paragraph>
                  No AI agents configured yet.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddAgent}
                >
                  Create Your First Agent
                </Button>
              </Paper>
            </Grid>
          ) : (
            agents.map(agent => (
              <Grid item xs={12} md={6} key={agent.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="h6">{agent.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {agent.description}
                          </Typography>
                        </Box>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={agent.enabled}
                            onChange={() => handleToggleAgent(agent.id)} 
                          />
                        }
                        label="Enabled"
                      />
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Provider:</strong> {settings?.llmProviders?.find(p => p.id === agent.providerId)?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Model:</strong> {agent.model}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Hierarchy Level:</strong> {settings?.agents?.hierarchyLevels?.find(h => h.id === agent.hierarchyLevel)?.name || agent.hierarchyLevel}
                      </Typography>
                      
                      {agent.personality && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Personality:</strong> {agent.personality}
                        </Typography>
                      )}
                      
                      {agent.directives && agent.directives.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            <strong>Directives:</strong>
                          </Typography>
                          <List dense disablePadding>
                            {agent.directives.map((directive, index) => (
                              <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                                <ListItemText primary={directive} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      
                      {agent.tools && agent.tools.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" mb={0.5}>
                            <strong>Tools:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {agent.tools.map((toolId, index) => {
                              const tool = availableTools.find(t => t.id === toolId);
                              return (
                                <Chip 
                                  key={index} 
                                  label={tool?.name || toolId}
                                  size="small"
                                  icon={<BuildIcon />}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<EditIcon />}
                      onClick={() => handleEditAgent(agent)}
                    >
                      Edit
                    </Button>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Agent Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => !dialogLoading && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAgent ? `Edit ${editingAgent.name}` : 'Add AI Agent'}
        </DialogTitle>
        <DialogContent dividers>
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
                value={newAgent.name}
                onChange={handleAgentChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Hierarchy Level</InputLabel>
                <Select
                  name="hierarchyLevel"
                  value={newAgent.hierarchyLevel}
                  onChange={handleAgentChange}
                  label="Hierarchy Level"
                >
                  {settings?.agents?.hierarchyLevels?.map(level => (
                    <MenuItem key={level.id} value={level.id}>
                      {level.name}
                    </MenuItem>
                  )) || (
                    <MenuItem value={1}>Assistant</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={newAgent.description}
                onChange={handleAgentChange}
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
                  value={newAgent.providerId}
                  onChange={handleAgentChange}
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
                  value={newAgent.model}
                  onChange={handleAgentChange}
                  label="Model"
                  disabled={!newAgent.providerId || availableModels.length === 0}
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
                value={newAgent.personality}
                onChange={handleAgentChange}
                placeholder="e.g., Helpful, friendly, and concise"
                helperText="Describe the agent's personality traits"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="System Prompt"
                name="systemPrompt"
                value={newAgent.systemPrompt}
                onChange={handleAgentChange}
                multiline
                rows={3}
                placeholder="You are a helpful assistant that provides accurate and concise information."
                helperText="System prompt that defines the agent's behavior"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                Directives
              </Typography>
              <Box sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  fullWidth
                  label="Add Directive"
                  value={newDirective}
                  onChange={(e) => setNewDirective(e.target.value)}
                  placeholder="e.g., Answer questions accurately and truthfully"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddDirective();
                    }
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddDirective}
                  disabled={!newDirective.trim()}
                  sx={{ ml: 1 }}
                >
                  Add
                </Button>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 1, maxHeight: '150px', overflow: 'auto' }}>
                {newAgent.directives.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                    No directives added yet
                  </Typography>
                ) : (
                  <List dense>
                    {newAgent.directives.map((directive, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={directive} />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleRemoveDirective(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
            
            {/* Tools */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Tools
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={availableTools}
                getOptionLabel={(option) => option.name}
                value={availableTools.filter(tool => newAgent.tools.includes(tool.id))}
                onChange={(event, newValue) => {
                  setNewAgent(prev => ({
                    ...prev,
                    tools: newValue.map(tool => tool.id)
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assign Tools"
                    placeholder="Select tools"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BuildIcon sx={{ mr: 1, fontSize: '0.9rem' }} />
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={option.name}
                      size="small"
                      icon={<BuildIcon />}
                    />
                  ))
                }
              />
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
                        value={newAgent.temperature}
                        onChange={handleAgentChange}
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
                        value={newAgent.maxTokens}
                        onChange={handleAgentChange}
                        inputProps={{ min: 1, max: 8192 }}
                        helperText="Maximum output length"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newAgent.enabled}
                            onChange={handleAgentChange}
                            name="enabled"
                          />
                        }
                        label="Enabled"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAddDialogOpen(false)}
            disabled={dialogLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveAgent}
            disabled={dialogLoading || !newAgent.name || !newAgent.providerId || !newAgent.model}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {dialogLoading ? 'Saving...' : 'Save Agent'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
