import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardHeader,
  Button, LinearProgress, Chip, List, ListItem, ListItemText,
  Avatar, Divider, IconButton, Alert, CircularProgress
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useNavigate } from 'react-router-dom';

import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';
import SystemMetricsChart from '../common/SystemMetricsChart';

// Simple MetricsCard component
const MetricsCard = ({ title, value, progress, color }) => (
  <Card sx={{ p: 2 }}>
    <Typography variant="subtitle2" gutterBottom>{title}</Typography>
    <Typography variant="h5" sx={{ mb: 1 }}>{value}</Typography>
    <LinearProgress 
      variant="determinate" 
      value={progress} 
      color={color} 
      sx={{ height: 8, borderRadius: 4 }} 
    />
  </Card>
);

// Simple WorkflowCard component
const WorkflowCard = ({ workflow, onClick }) => (
  <Card sx={{ cursor: 'pointer' }} onClick={onClick}>
    <CardContent>
      <Typography variant="h6">{workflow.name}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        {workflow.description}
      </Typography>
      <Chip 
        label={workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)} 
        color={
          workflow.status === 'active' ? 'success' : 
          workflow.status === 'completed' ? 'primary' : 'default'
        }
        size="small"
      />
    </CardContent>
  </Card>
);

/**
 * Dashboard Component - Main application dashboard
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [recentWorkflows, setRecentWorkflows] = useState([]);
  const [activeAgents, setActiveAgents] = useState([]);
  const [error, setError] = useState(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [historicalMetrics, setHistoricalMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  
  // Fetch dashboard data
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
  
  // Fetch metrics data
  useEffect(() => {
    const fetchMetricsData = async () => {
      try {
        setMetricsLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // Mock current metrics
        const mockMetrics = {
          cpu_usage: 45.2,
          memory_used: 4.2 * 1024 * 1024 * 1024, // 4.2 GB
          memory_total: 16 * 1024 * 1024 * 1024, // 16 GB
          disk_usage: 230 * 1024 * 1024 * 1024, // 230 GB
          disk_total: 512 * 1024 * 1024 * 1024, // 512 GB
          network_in: 25 * 1024 * 1024, // 25 MB
          network_out: 10 * 1024 * 1024, // 10 MB
          timestamp: new Date().toISOString()
        };
        
        // Mock historical metrics (last 24 hours, hourly data)
        const mockHistoricalMetrics = Array.from({ length: 24 }, (_, i) => {
          const date = new Date();
          date.setHours(date.getHours() - (23 - i));
          
          return {
            timestamp: date.toISOString(),
            cpu: Math.floor(30 + Math.random() * 50), // Random between 30-80%
            memory: Math.floor(30 + Math.random() * 40), // Random between 30-70%
            disk: Math.floor(40 + Math.random() * 20) // Random between 40-60%
          };
        });
        
        setMetrics(mockMetrics);
        setHistoricalMetrics(mockHistoricalMetrics);
        setMetricsError(null);
      } catch (err) {
        console.error('Error fetching metrics data:', err);
        setMetricsError('Failed to load metrics data');
      } finally {
        setMetricsLoading(false);
      }
    };
    
    fetchMetricsData();
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
