import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Grid, Card, CardContent, 
  Button, Tabs, Tab, IconButton, Chip, Avatar, List, 
  ListItem, ListItemText, ListItemAvatar, Divider 
} from '@mui/material';
import { 
  Add as AddIcon,
  Person as PersonIcon,
  SmartToy as SmartToyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import WorkflowList from './WorkflowList';
import AgentManager from './AgentManager';

/**
 * Agents component for managing AI agents and their workflows
 */
const Agents = () => {
  const [tabValue, setTabValue] = useState(0);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isAddingAgent, setIsAddingAgent] = useState(false);

  useEffect(() => {
    // Fetch agents on component mount
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // This would be an API call in a real application
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Document Analyzer',
          description: 'Analyzes documents and extracts key information',
          type: 'analyzer',
          status: 'active',
          createdAt: '2023-04-15T10:30:00Z',
          workflows: ['workflow-1', 'workflow-3']
        },
        {
          id: 'agent-2',
          name: 'Content Generator',
          description: 'Generates marketing content from simple prompts',
          type: 'generator',
          status: 'active',
          createdAt: '2023-05-20T14:15:00Z',
          workflows: ['workflow-2']
        },
        {
          id: 'agent-3',
          name: 'Customer Support',
          description: 'Handles customer inquiries and routes them appropriately',
          type: 'support',
          status: 'inactive',
          createdAt: '2023-06-10T09:45:00Z',
          workflows: []
        }
      ];
      
      setAgents(mockAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
  };

  const handleAddAgent = () => {
    setIsAddingAgent(true);
  };

  const handleDeleteAgent = (agentId) => {
    // This would be an API call in a real application
    setAgents(agents.filter(agent => agent.id !== agentId));
    if (selectedAgent && selectedAgent.id === agentId) {
      setSelectedAgent(null);
    }
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Agents
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="My Agents" />
          <Tab label="Agent Marketplace" />
          <Tab label="Agent Settings" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Agent List</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={handleAddAgent}
                  >
                    Add Agent
                  </Button>
                </Box>

                <List>
                  {agents.map((agent) => (
                    <React.Fragment key={agent.id}>
                      <ListItem 
                        component="div" 
                        selected={selectedAgent && selectedAgent.id === agent.id}
                        onClick={() => handleAgentSelect(agent)}
                        sx={{ 
                          borderRadius: 1,
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                          },
                          cursor: 'pointer'
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <SmartToyIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={agent.name} 
                          // Fix DOM nesting error: Change Typography to Box for secondary content
                          secondary={
                            <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip 
                                label={agent.status} 
                                size="small" 
                                color={getStatusChipColor(agent.status)} 
                                sx={{ height: 20 }}
                              />
                              <Typography 
                                component="span" 
                                variant="caption"
                              >
                                {agent.workflows.length} workflows
                              </Typography>
                            </Box>
                          }
                        />
                        <Box>
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            // Handle edit
                          }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAgent(agent.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                  
                  {agents.length === 0 && (
                    <ListItem>
                      <ListItemText 
                        primary="No agents found" 
                        secondary="Click 'Add Agent' to create your first agent"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {selectedAgent ? (
              <AgentManager agent={selectedAgent} />
            ) : isAddingAgent ? (
              <AgentManager isNew onCancel={() => setIsAddingAgent(false)} />
            ) : (
              <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SmartToyIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select an agent to view details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Or create a new agent to get started
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{ mt: 2 }}
                    onClick={handleAddAgent}
                  >
                    Create New Agent
                  </Button>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Agent Marketplace
          </Typography>
          <Typography variant="body1">
            Browse and install pre-configured agents from the marketplace.
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {['Document Processing', 'Customer Support', 'Content Creation', 'Data Analysis'].map((category, index) => (
              <Grid item xs={12} sm={6} md={3} key={`category-${index}`}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {category}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {`${index + 3} agents available`}
                    </Typography>
                    <Button size="small" sx={{ mt: 2 }}>
                      Browse
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Agent Settings
          </Typography>
          <Typography variant="body1">
            Configure global settings for all your agents.
          </Typography>
          {/* Settings content */}
        </Box>
      )}
    </Container>
  );
};

export default Agents;
