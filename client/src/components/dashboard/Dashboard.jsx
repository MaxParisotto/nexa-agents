import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, Button, Card, CardContent,
  Divider, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useNavigate } from 'react-router-dom';
import WorkflowCard from './WorkflowCard';
import MetricsCard from '../metrics/MetricsCard';
import SystemMetricsChart from '../metrics/SystemMetricsChart';
import { useMetrics } from '../../hooks/useMetrics';

/**
 * Dashboard Component - Main dashboard view
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { metrics, historicalMetrics, loading: metricsLoading, error: metricsError } = useMetrics();
  const [recentWorkflows, setRecentWorkflows] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Simulate API call to fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data
        const mockWorkflows = [
          {
            id: '1',
            name: 'Content Generation Pipeline',
            description: 'An end-to-end workflow for generating website content',
            status: 'active',
            steps: [
              { id: 'step1', name: 'Research Topics', status: 'completed' },
              { id: 'step2', name: 'Generate Outline', status: 'completed' },
              { id: 'step3', name: 'Write Draft', status: 'in_progress' },
              { id: 'step4', name: 'Edit & Refine', status: 'pending' },
              { id: 'step5', name: 'Publish', status: 'pending' }
            ],
            createdAt: '2023-05-10T10:30:00Z',
            updatedAt: '2023-05-10T14:22:00Z'
          },
          {
            id: '2',
            name: 'Customer Support Assistant',
            description: 'Workflow for handling customer support requests',
            status: 'completed',
            steps: [
              { id: 'step1', name: 'Ticket Analysis', status: 'completed' },
              { id: 'step2', name: 'Response Generation', status: 'completed' },
              { id: 'step3', name: 'Human Review', status: 'completed' },
              { id: 'step4', name: 'Send Response', status: 'completed' }
            ],
            createdAt: '2023-05-08T09:15:00Z',
            updatedAt: '2023-05-09T16:40:00Z'
          },
          {
            id: '3',
            name: 'Data Analysis Pipeline',
            description: 'Process and analyze customer data',
            status: 'draft',
            steps: [
              { id: 'step1', name: 'Data Collection', status: 'pending' },
              { id: 'step2', name: 'Data Cleaning', status: 'pending' },
              { id: 'step3', name: 'Analysis', status: 'pending' },
              { id: 'step4', name: 'Report Generation', status: 'pending' }
            ],
            createdAt: '2023-05-12T11:20:00Z',
            updatedAt: '2023-05-12T11:20:00Z'
          }
        ];
        
        const mockAgents = [
          {
            id: 'agent1',
            name: 'Content Writer',
            status: 'busy',
            capabilities: ['writing', 'editing', 'research'],
            currentTask: 'Writing blog post'
          },
          {
            id: 'agent2',
            name: 'Customer Support',
            status: 'idle',
            capabilities: ['conversation', 'ticketing', 'knowledge'],
            currentTask: null
          },
          {
            id: 'agent3',
            name: 'Data Analyst',
            status: 'idle',
            capabilities: ['statistics', 'visualization', 'reporting'],
            currentTask: null
          }
        ];
        
        setRecentWorkflows(mockWorkflows);
        setActiveAgents(mockAgents);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const formatBytes = (bytes) => {
    const GB = 1024 * 1024 * 1024;
    return (bytes / GB).toFixed(2) + ' GB';
  };
  
  const handleCreateWorkflow = () => {
    navigate('/workflows');
  };
  
  const handleViewWorkflow = (id) => {
    navigate(`/workflows/${id}`);
  };
  
  const handleViewMetrics = () => {
    navigate('/metrics');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkflow}
        >
          New Workflow
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* System Metrics Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">System Status</Typography>
          
          <Button
            size="small"
            endIcon={<BarChartIcon />}
            onClick={handleViewMetrics}
          >
            View Detailed Metrics
          </Button>
        </Box>
        
        {metricsError ? (
          <Alert severity="error">{metricsError}</Alert>
        ) : metricsLoading && !metrics ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box sx={{ height: 200 }}>
                <SystemMetricsChart data={historicalMetrics.slice(-20)} />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <MetricsCard
                    title="CPU Usage"
                    value={metrics ? `${metrics.cpu_usage.toFixed(1)}%` : 'N/A'}
                    progress={metrics?.cpu_usage}
                    color="primary"
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <MetricsCard
                    title="Memory Usage"
                    value={metrics ? formatBytes(metrics.memory_used) : 'N/A'}
                    progress={metrics ? (metrics.memory_used / metrics.memory_total) * 100 : 0}
                    color="secondary"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Paper>
      
      {/* Active Workflows Section */}
      <Typography variant="h6" sx={{ mb: 2 }}>Recent Workflows</Typography>
      
      <Grid container spacing={3}>
        {recentWorkflows.length > 0 ? (
          recentWorkflows.map((workflow) => (
            <Grid item xs={12} md={6} lg={4} key={workflow.id}>
              <WorkflowCard workflow={workflow} onClick={() => handleViewWorkflow(workflow.id)} />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No workflows available.</Typography>
              
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={handleCreateWorkflow}
                sx={{ mt: 2 }}
              >
                Create Your First Workflow
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* Quick Actions Section */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Quick Actions</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Create Workflow</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Start building a new agent workflow
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateWorkflow}
              >
                Create
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Run Workflow</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Execute an existing workflow
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PlayArrowIcon />}
                disabled={!recentWorkflows.some(wf => wf.status === 'draft')}
              >
                Run
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
