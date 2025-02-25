import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Grid, Paper, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { 
  ListAlt as WorkflowIcon,
  SmartToy as AgentIcon,
  Description as PromptIcon,
  Output as OutputIcon
} from '@mui/icons-material';

import { startSystemMonitoring } from '../store/actions/systemActions';

/**
 * Dashboard component displays system status and workflow statistics
 */
const Dashboard = () => {
  const dispatch = useDispatch();
  const system = useSelector(state => state.system);
  const workflows = useSelector(state => state.system.workflows || []);
  
  // Start system monitoring on component mount
  useEffect(() => {
    dispatch(startSystemMonitoring());
  }, [dispatch]);
  
  // Calculate statistics
  const getTotalNodes = () => {
    return workflows.reduce((total, workflow) => total + (workflow.nodes?.length || 0), 0);
  };
  
  const getNodesByType = () => {
    const stats = { agents: 0, prompts: 0, outputs: 0 };
    
    workflows.forEach(workflow => {
      if (!workflow.nodes) return;
      
      workflow.nodes.forEach(node => {
        if (node.type === 'agent') stats.agents++;
        else if (node.type === 'prompt') stats.prompts++;
        else if (node.type === 'output') stats.outputs++;
      });
    });
    
    return stats;
  };
  
  const nodeStats = getNodesByType();
  
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Workflow statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5">{workflows.length}</Typography>
                <Typography variant="body2" color="text.secondary">Workflows</Typography>
              </Box>
              <WorkflowIcon fontSize="large" color="primary" />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5">{nodeStats.agents}</Typography>
                <Typography variant="body2" color="text.secondary">Agents</Typography>
              </Box>
              <AgentIcon fontSize="large" color="secondary" />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5">{nodeStats.prompts}</Typography>
                <Typography variant="body2" color="text.secondary">Prompts</Typography>
              </Box>
              <PromptIcon fontSize="large" sx={{ color: '#2196f3' }} />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5">{nodeStats.outputs}</Typography>
                <Typography variant="body2" color="text.secondary">Outputs</Typography>
              </Box>
              <OutputIcon fontSize="large" sx={{ color: '#4caf50' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* System Status */}
      <Typography variant="h5" gutterBottom>
        System Status
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Metrics
            </Typography>
            
            {system.systemMetrics ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
                      <CircularProgress 
                        variant="determinate" 
                        value={system.systemMetrics.cpuUsage || 0} 
                        sx={{ color: '#3f51b5' }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" component="div" color="text.secondary">
                          {`${Math.round(system.systemMetrics.cpuUsage || 0)}%`}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.primary">CPU Usage</Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
                      <CircularProgress 
                        variant="determinate" 
                        value={system.systemMetrics.memoryUsage || 0} 
                        sx={{ color: '#f50057' }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" component="div" color="text.secondary">
                          {`${Math.round(system.systemMetrics.memoryUsage || 0)}%`}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.primary">Memory Usage</Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Active Agents: {system.systemMetrics.activeAgents || 0}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Pending Tasks: {system.systemMetrics.pendingTasks || 0}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            {workflows.length > 0 ? (
              <Box>
                {workflows.slice(0, 5).map((workflow, index) => (
                  <Box key={workflow.id} sx={{ 
                    py: 1,
                    borderBottom: index < workflows.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    <Typography variant="body1">{workflow.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last modified: {new Date(workflow.modified).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No workflows available. Create a workflow to get started.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 