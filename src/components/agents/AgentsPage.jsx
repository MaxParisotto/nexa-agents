import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Grid,
  Card, CardContent, CardActions, Switch, FormControlLabel,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, Chip, Divider, Accordion,
  AccordionSummary, AccordionDetails, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction, Avatar, Badge
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { apiService } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';

/**
 * AI Agents Management Page
 * Allows users to view, create, edit, and interact with AI agents
 */
export default function AgentsPage() {
  const { settings } = useSettings();
  const [agents, setAgents] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAgents, setActiveAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch agents and tools on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const agentsResponse = await apiService.getAgents();
        const toolsResponse = await apiService.getTools();
        
        setAgents(agentsResponse.data);
        setTools(toolsResponse.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Start an agent
  const handleStartAgent = (agent) => {
    // In a real implementation, this would connect to the agent service
    // For now, we'll just add the agent to the activeAgents list
    setActiveAgents(prev => [...prev, agent.id]);
  };

  // Stop an agent
  const handleStopAgent = (agent) => {
    // In a real implementation, this would disconnect from the agent service
    // For now, we'll just remove the agent from the activeAgents list
    setActiveAgents(prev => prev.filter(id => id !== agent.id));
  };

  // View agent details
  const handleViewDetails = (agent) => {
    setSelectedAgent(agent);
    setDetailsOpen(true);
  };

  // Navigate to settings page
  const handleNavigateToSettings = () => {
    // In a real implementation, this would navigate to the settings page
    // For now, we'll just log a message
    console.log('Navigate to settings page');
  };

  // Get provider name by id
  const getProviderName = (providerId) => {
    const provider = settings?.llmProviders?.find(p => p.id === providerId);
    return provider ? provider.name : 'Unknown';
  };

  // Get tool name by id
  const getToolName = (toolId) => {
    const tool = tools.find(t => t.id === toolId);
    return tool ? tool.name : toolId;
  };

  // Get hierarchy level name by id
  const getHierarchyLevelName = (levelId) => {
    const level = settings?.agents?.hierarchyLevels?.find(h => h.id === levelId);
    return level ? level.name : `Level ${levelId}`;
  };

  // Check if agent is active
  const isAgentActive = (agentId) => {
    return activeAgents.includes(agentId);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">AI Agents</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={handleNavigateToSettings}
          >
            Agent Settings
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNavigateToSettings}
          >
            Create Agent
          </Button>
        </Box>
      </Box>
      
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
                  onClick={handleNavigateToSettings}
                >
                  Create Your First Agent
                </Button>
              </Paper>
            </Grid>
          ) : (
            agents.filter(agent => agent.enabled).map(agent => (
              <Grid item xs={12} md={6} lg={4} key={agent.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          isAgentActive(agent.id) ? (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: 'success.main',
                                border: '2px solid white'
                              }}
                            />
                          ) : null
                        }
                      >
                        <Avatar
                          sx={{
                            bgcolor: isAgentActive(agent.id) ? 'primary.main' : 'grey.400',
                            width: 56,
                            height: 56
                          }}
                        >
                          <SmartToyIcon />
                        </Avatar>
                      </Badge>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6">{agent.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {agent.description}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Provider:</strong> {getProviderName(agent.providerId)}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Model:</strong> {agent.model}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Hierarchy:</strong> {getHierarchyLevelName(agent.hierarchyLevel)}
                      </Typography>
                      
                      {agent.tools && agent.tools.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Tools:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {agent.tools.map((toolId, index) => (
                              <Chip 
                                key={index} 
                                label={getToolName(toolId)}
                                size="small"
                                icon={<BuildIcon />}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    {isAgentActive(agent.id) ? (
                      <Button 
                        size="small" 
                        startIcon={<StopIcon />}
                        color="error"
                        onClick={() => handleStopAgent(agent)}
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button 
                        size="small" 
                        startIcon={<PlayArrowIcon />}
                        color="success"
                        onClick={() => handleStartAgent(agent)}
                      >
                        Start
                      </Button>
                    )}
                    
                    <Button 
                      size="small" 
                      onClick={() => handleViewDetails(agent)}
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
      
      {/* Agent Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedAgent && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SmartToyIcon sx={{ mr: 1 }} />
                {selectedAgent.name}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body1" paragraph>
                {selectedAgent.description}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Configuration
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Provider:</strong> {getProviderName(selectedAgent.providerId)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Model:</strong> {selectedAgent.model}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Hierarchy Level:</strong> {getHierarchyLevelName(selectedAgent.hierarchyLevel)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Temperature:</strong> {selectedAgent.temperature}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Max Tokens:</strong> {selectedAgent.maxTokens}
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Personality & Directives
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    {selectedAgent.personality && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Personality:</strong>
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {selectedAgent.personality}
                        </Typography>
                      </Box>
                    )}
                    
                    {selectedAgent.directives && selectedAgent.directives.length > 0 && (
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>Directives:</strong>
                        </Typography>
                        <List dense>
                          {selectedAgent.directives.map((directive, index) => (
                            <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                              <ListItemText primary={directive} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      System Prompt
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedAgent.systemPrompt || 'No system prompt defined.'}
                    </Typography>
                  </Paper>
                </Grid>
                
                {selectedAgent.tools && selectedAgent.tools.length > 0 && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Tools
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={1}>
                        {selectedAgent.tools.map((toolId, index) => {
                          const tool = tools.find(t => t.id === toolId);
                          return tool ? (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                              <Card variant="outlined">
                                <CardContent sx={{ py: 1, px: 2 }}>
                                  <Typography variant="subtitle2">
                                    {tool.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {tool.description}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ) : null;
                        })}
                      </Grid>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
              <Button 
                variant="contained" 
                color={isAgentActive(selectedAgent.id) ? 'error' : 'success'}
                startIcon={isAgentActive(selectedAgent.id) ? <StopIcon /> : <PlayArrowIcon />}
                onClick={() => {
                  if (isAgentActive(selectedAgent.id)) {
                    handleStopAgent(selectedAgent);
                  } else {
                    handleStartAgent(selectedAgent);
                  }
                }}
              >
                {isAgentActive(selectedAgent.id) ? 'Stop Agent' : 'Start Agent'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
