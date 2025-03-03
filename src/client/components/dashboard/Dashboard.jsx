import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, CircularProgress } from '@mui/material';
import { apiService } from '../../services/api';
import { useSocket } from '../../services/socket';
import MetricsCard from '../metrics/MetricsCard';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [agents, setAgents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const { connected, events } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [metricsRes, workflowsRes] = await Promise.all([
          apiService.getSystemMetrics(),
          apiService.getWorkflows(),
        ]);
        
        setMetrics(metricsRes.data);
        setWorkflows(workflowsRes.data);
        
        // Try to get agents, but don't fail if endpoint not yet implemented
        try {
          const agentsRes = await apiService.getAgents();
          setAgents(agentsRes.data);
        } catch (error) {
          console.warn('Agents API not implemented yet');
          setAgents([
            { id: '1', name: 'Research Agent', status: 'idle' },
            { id: '2', name: 'Assistant Agent', status: 'busy' }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* System Metrics */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>System Metrics</Typography>
        <Grid container spacing={3}>
          {metrics && (
            <>
              <Grid item xs={12} md={3}>
                <MetricsCard 
                  title="CPU Usage" 
                  value={`${metrics.cpu_usage.toFixed(1)}%`} 
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricsCard 
                  title="Memory Usage" 
                  value={`${Math.round(metrics.memory_used / (1024 * 1024))} MB / ${Math.round(metrics.memory_total / (1024 * 1024))} MB`} 
                  color="secondary"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricsCard 
                  title="Uptime" 
                  value={metrics.uptime ? `${Math.floor(metrics.uptime / 3600)} hours` : 'N/A'} 
                  color="success"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricsCard 
                  title="Processes" 
                  value={metrics.processes || 'N/A'} 
                  color="info"
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Agent Status */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Agent Status</Typography>
        <Grid container spacing={2}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{agent.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: 
                          agent.status === 'idle' ? 'green' :
                          agent.status === 'busy' ? 'orange' : 'gray',
                        mr: 1,
                      }}
                    />
                    <Typography>{agent.status}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Recent Workflows */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Workflows</Typography>
        <Grid container spacing={2}>
          {workflows.map((workflow) => (
            <Grid item xs={12} key={workflow.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{workflow.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Status: {workflow.status}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Created: {new Date(workflow.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Socket Status */}
      <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: connected ? 'green' : 'red',
            mr: 1,
          }}
        />
        <Typography>
          Socket: {connected ? 'Connected' : 'Disconnected'} 
          {events.length > 0 && ` (${events.length} events received)`}
        </Typography>
      </Box>
    </Box>
  );
};

export default Dashboard;
