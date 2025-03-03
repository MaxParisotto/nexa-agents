import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Grid,
  Card, CardContent, CardActions, Switch, FormControlLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Divider, Accordion,
  AccordionSummary, AccordionDetails, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import BuildIcon from '@mui/icons-material/Build';
import CategoryIcon from '@mui/icons-material/Category';
import CodeIcon from '@mui/icons-material/Code';
import SettingsIcon from '@mui/icons-material/Settings';

import { apiService } from '../../services/api';

/**
 * Tool Settings Component
 * Allows users to create, edit, and manage tools that can be assigned to agents
 */
export default function ToolSettings({ settings, onUpdateSettings }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [newTool, setNewTool] = useState({
    id: '',
    name: '',
    description: '',
    enabled: true,
    category: '',
    parameters: []
  });
  const [newParameter, setNewParameter] = useState({
    name: '',
    type: 'string',
    required: false,
    default: '',
    description: ''
  });

  // Fetch tools on component mount
  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      try {
        const response = await apiService.getTools();
        setTools(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch tools: ' + err.message);
        console.error('Error fetching tools:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  // Update local tools when settings change
  useEffect(() => {
    if (settings?.tools?.items) {
      setTools(settings.tools.items);
    }
  }, [settings]);

  // Add a new tool
  const handleAddTool = () => {
    setNewTool({
      id: `tool-${Date.now()}`,
      name: '',
      description: '',
      enabled: true,
      category: settings.tools?.categories?.[0]?.id || 'utility',
      parameters: []
    });
    setEditingTool(null);
    setAddDialogOpen(true);
  };

  // Edit an existing tool
  const handleEditTool = (tool) => {
    setNewTool({ ...tool });
    setEditingTool(tool);
    setAddDialogOpen(true);
  };

  // Delete a tool
  const handleDeleteTool = (toolId) => {
    const updatedTools = tools.filter(t => t.id !== toolId);
    onUpdateSettings('tools', {
      ...settings.tools,
      items: updatedTools
    });
  };

  // Handle tool dialog input change
  const handleToolChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTool(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle parameter input change
  const handleParameterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewParameter(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Add a parameter
  const handleAddParameter = () => {
    if (newParameter.name.trim()) {
      setNewTool(prev => ({
        ...prev,
        parameters: [...prev.parameters, { ...newParameter }]
      }));
      
      // Reset parameter form
      setNewParameter({
        name: '',
        type: 'string',
        required: false,
        default: '',
        description: ''
      });
    }
  };

  // Remove a parameter
  const handleRemoveParameter = (index) => {
    setNewTool(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  // Save tool
  const handleSaveTool = async () => {
    setDialogLoading(true);
    
    try {
      // Validate required fields
      if (!newTool.name) {
        setError('Tool name is required');
        setDialogLoading(false);
        return;
      }
      
      if (!newTool.category) {
        setError('Category is required');
        setDialogLoading(false);
        return;
      }
      
      let updatedTools;
      
      if (editingTool) {
        // Update existing tool
        const response = await apiService.updateTool(editingTool.id, newTool);
        updatedTools = tools.map(t => t.id === editingTool.id ? response.data : t);
      } else {
        // Create new tool
        const response = await apiService.createTool(newTool);
        updatedTools = [...tools, response.data];
      }
      
      // Update settings
      onUpdateSettings('tools', {
        ...settings.tools,
        items: updatedTools
      });
      
      // Close dialog
      setAddDialogOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to save tool: ' + err.message);
      console.error('Error saving tool:', err);
    } finally {
      setDialogLoading(false);
    }
  };

  // Toggle tool enable/disable
  const handleToggleTool = (toolId) => {
    const updatedTools = tools.map(tool => {
      if (tool.id === toolId) {
        return { ...tool, enabled: !tool.enabled };
      }
      return tool;
    });
    
    onUpdateSettings('tools', {
      ...settings.tools,
      items: updatedTools
    });
  };

  // Get category name by id
  const getCategoryName = (categoryId) => {
    const category = settings.tools?.categories?.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Tools</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTool}
        >
          Add Tool
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Create and manage tools that can be assigned to AI agents. Tools define capabilities that agents can use to perform tasks.
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
          {tools.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" paragraph>
                  No tools configured yet.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddTool}
                >
                  Create Your First Tool
                </Button>
              </Paper>
            </Grid>
          ) : (
            tools.map(tool => (
              <Grid item xs={12} md={6} key={tool.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BuildIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="h6">{tool.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tool.description}
                          </Typography>
                        </Box>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={tool.enabled}
                            onChange={() => handleToggleTool(tool.id)} 
                          />
                        }
                        label="Enabled"
                      />
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        icon={<CategoryIcon />} 
                        label={getCategoryName(tool.category)} 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                      
                      {tool.parameters && tool.parameters.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Parameters:</strong>
                          </Typography>
                          <List dense disablePadding>
                            {tool.parameters.map((param, index) => (
                              <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                                <ListItemText 
                                  primary={
                                    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Typography variant="body2" component="span">
                                        {param.name}
                                        {param.required && (
                                          <Typography component="span" color="error" variant="caption" sx={{ ml: 0.5 }}>
                                            *
                                          </Typography>
                                        )}
                                      </Typography>
                                      <Chip 
                                        label={param.type} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                      />
                                    </Box>
                                  }
                                  secondary={param.description}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<EditIcon />}
                      onClick={() => handleEditTool(tool)}
                    >
                      Edit
                    </Button>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeleteTool(tool.id)}
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

      {/* Tool Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => !dialogLoading && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTool ? `Edit ${editingTool.name}` : 'Add Tool'}
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
                label="Tool Name"
                name="name"
                value={newTool.name}
                onChange={handleToolChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={newTool.category}
                  onChange={handleToolChange}
                  label="Category"
                >
                  {settings.tools?.categories?.map(category => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  )) || (
                    <MenuItem value="utility">Utility</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={newTool.description}
                onChange={handleToolChange}
                multiline
                rows={2}
              />
            </Grid>
            
            {/* Parameters */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Parameters
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Add Parameter
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Parameter Name"
                      name="name"
                      value={newParameter.name}
                      onChange={handleParameterChange}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        name="type"
                        value={newParameter.type}
                        onChange={handleParameterChange}
                        label="Type"
                      >
                        <MenuItem value="string">String</MenuItem>
                        <MenuItem value="number">Number</MenuItem>
                        <MenuItem value="boolean">Boolean</MenuItem>
                        <MenuItem value="array">Array</MenuItem>
                        <MenuItem value="object">Object</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Default Value"
                      name="default"
                      value={newParameter.default}
                      onChange={handleParameterChange}
                      placeholder="Optional"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      value={newParameter.description}
                      onChange={handleParameterChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={newParameter.required}
                          onChange={handleParameterChange}
                          name="required"
                        />
                      }
                      label="Required"
                    />
                    
                    <Button
                      variant="contained"
                      onClick={handleAddParameter}
                      disabled={!newParameter.name.trim()}
                      sx={{ float: 'right' }}
                    >
                      Add Parameter
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
              
              <Typography variant="subtitle2" gutterBottom>
                Parameters List
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 1, maxHeight: '200px', overflow: 'auto' }}>
                {newTool.parameters.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                    No parameters added yet
                  </Typography>
                ) : (
                  <List dense>
                    {newTool.parameters.map((param, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" component="span">
                                {param.name}
                                {param.required && (
                                  <Typography component="span" color="error" variant="caption" sx={{ ml: 0.5 }}>
                                    *
                                  </Typography>
                                )}
                              </Typography>
                              <Chip 
                                label={param.type} 
                                size="small" 
                                variant="outlined"
                                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              {param.description}
                              {param.default && ` (Default: ${param.default})`}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleRemoveParameter(index)}
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
            
            {/* Advanced Settings */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newTool.enabled}
                            onChange={handleToolChange}
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
            onClick={handleSaveTool}
            disabled={dialogLoading || !newTool.name || !newTool.category}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {dialogLoading ? 'Saving...' : 'Save Tool'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
