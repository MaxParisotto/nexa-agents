import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Grid,
  Card, CardContent, CardActions, Switch, FormControlLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Divider, Accordion,
  AccordionSummary, AccordionDetails, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction, Avatar
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import CategoryIcon from '@mui/icons-material/Category';
import SettingsIcon from '@mui/icons-material/Settings';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';

import { apiService } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';

/**
 * Tools Management Page
 * Allows users to view, create, edit, and manage tools that can be assigned to agents
 */
export default function ToolsPage() {
  const { settings } = useSettings();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

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

  // View tool details
  const handleViewDetails = (tool) => {
    setSelectedTool(tool);
    setDetailsOpen(true);
  };

  // Navigate to settings page
  const handleNavigateToSettings = () => {
    // In a real implementation, this would navigate to the settings page
    // For now, we'll just log a message
    console.log('Navigate to settings page');
  };

  // Get category name by id
  const getCategoryName = (categoryId) => {
    const category = settings?.tools?.categories?.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Get all categories
  const getCategories = () => {
    return settings?.tools?.categories || [];
  };

  // Filter tools by category
  const getFilteredTools = () => {
    if (filterCategory === 'all') {
      return tools.filter(tool => tool.enabled);
    }
    return tools.filter(tool => tool.enabled && tool.category === filterCategory);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tools</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={handleNavigateToSettings}
          >
            Tool Settings
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNavigateToSettings}
          >
            Create Tool
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Category Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Filter by Category:
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip 
              label="All Tools" 
              icon={<CategoryIcon />}
              onClick={() => setFilterCategory('all')}
              color={filterCategory === 'all' ? 'primary' : 'default'}
              variant={filterCategory === 'all' ? 'filled' : 'outlined'}
            />
            
            {getCategories().map(category => (
              <Chip 
                key={category.id}
                label={category.name} 
                icon={<CategoryIcon />}
                onClick={() => setFilterCategory(category.id)}
                color={filterCategory === category.id ? 'primary' : 'default'}
                variant={filterCategory === category.id ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {getFilteredTools().length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" paragraph>
                  {tools.length === 0 ? 
                    'No tools configured yet.' : 
                    'No tools found for the selected category.'}
                </Typography>
                {tools.length === 0 && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleNavigateToSettings}
                  >
                    Create Your First Tool
                  </Button>
                )}
              </Paper>
            </Grid>
          ) : (
            getFilteredTools().map(tool => (
              <Grid item xs={12} md={6} lg={4} key={tool.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 48,
                          height: 48
                        }}
                      >
                        <BuildIcon />
                      </Avatar>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6">{tool.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tool.description}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ mt: 2 }}>
                      <Chip 
                        icon={<CategoryIcon />} 
                        label={getCategoryName(tool.category)} 
                        size="small" 
                        sx={{ mb: 1 }}
                      />
                      
                      {tool.parameters && tool.parameters.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Parameters:</strong>
                          </Typography>
                          <List dense disablePadding>
                            {tool.parameters.slice(0, 3).map((param, index) => (
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
                                />
                              </ListItem>
                            ))}
                          </List>
                          
                          {tool.parameters.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              +{tool.parameters.length - 3} more parameters
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<InfoIcon />}
                      onClick={() => handleViewDetails(tool)}
                    >
                      Details
                    </Button>
                    
                    <Box sx={{ flexGrow: 1 }} />
                    
                    <IconButton 
                      size="small" 
                      onClick={handleNavigateToSettings}
                    >
                      <EditIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
      
      {/* Tool Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTool && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BuildIcon sx={{ mr: 1 }} />
                {selectedTool.name}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" paragraph>
                {selectedTool.description}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Tool Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" gutterBottom>
                          <strong>ID:</strong> {selectedTool.id}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Category:</strong> {getCategoryName(selectedTool.category)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Status:</strong> {selectedTool.enabled ? 'Enabled' : 'Disabled'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                {selectedTool.parameters && selectedTool.parameters.length > 0 && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Parameters
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <List>
                        {selectedTool.parameters.map((param, index) => (
                          <ListItem key={index} divider={index < selectedTool.parameters.length - 1}>
                            <ListItemText 
                              primary={
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" component="span">
                                    {param.name}
                                    {param.required && (
                                      <Typography component="span" color="error" variant="caption" sx={{ ml: 0.5 }}>
                                        * (Required)
                                      </Typography>
                                    )}
                                  </Typography>
                                  <Chip 
                                    label={param.type} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ ml: 1 }}
                                  />
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2" color="text.secondary">
                                    {param.description}
                                  </Typography>
                                  {param.default && (
                                    <Typography variant="body2" color="text.secondary">
                                      Default: {param.default}
                                    </Typography>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Usage Example
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ bgcolor: 'grey.900', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'grey.300' }}>
                        {`// Example usage of ${selectedTool.name}`}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'grey.300' }}>
                        {`const result = await agent.useTool('${selectedTool.id}', {`}
                      </Typography>
                      {selectedTool.parameters && selectedTool.parameters.map((param, index) => (
                        <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', color: 'grey.300', ml: 2 }}>
                          {`${param.name}: ${param.type === 'string' ? `'example-${param.name}'` : 
                            param.type === 'number' ? '42' : 
                            param.type === 'boolean' ? 'true' : 
                            param.type === 'array' ? '[]' : '{}'
                          }${index < selectedTool.parameters.length - 1 ? ',' : ''}`}
                        </Typography>
                      ))}
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'grey.300' }}>
                        {`});`}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button 
                variant="contained" 
                startIcon={<EditIcon />}
                onClick={handleNavigateToSettings}
              >
                Edit Tool
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
