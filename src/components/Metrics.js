import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { startSystemMonitoring } from '../store/actions/systemActions';

// Styled components
const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(3),
  color: theme.palette.text.secondary,
}));

/**
 * Metrics component that displays system performance metrics and charts
 */
const Metrics = () => {
  const dispatch = useDispatch();
  const metrics = useSelector((state) => state.system.metrics);
  const metricsHistory = useSelector((state) => state.system.metricsHistory || []);
  const websocketStatus = useSelector((state) => state.system.websocketStatus);

  useEffect(() => {
    const metricsInterval = dispatch(startSystemMonitoring());
    
    return () => {
      if (metricsInterval) {
        clearInterval(metricsInterval);
      }
    };
  }, [dispatch]);

  // Format timestamp for chart display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  // Prepare chart data
  const chartData = metricsHistory.map((item) => ({
    timestamp: formatTimestamp(item.timestamp),
    cpuUsage: item.cpuUsage,
    memoryUsage: item.memoryUsage,
    activeAgents: item.activeAgents,
    pendingTasks: item.pendingTasks
  }));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Metrics
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              CPU Usage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  name="CPU Usage" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </Item>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              Memory Usage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="memoryUsage" 
                  name="Memory Usage" 
                  stroke="#82ca9d" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </Item>
        </Grid>
        
        <Grid item xs={12}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              Agent and Task Activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="activeAgents" 
                  name="Active Agents" 
                  stroke="#8884d8" 
                />
                <Line 
                  type="monotone" 
                  dataKey="pendingTasks" 
                  name="Pending Tasks" 
                  stroke="#ff8042" 
                />
              </LineChart>
            </ResponsiveContainer>
          </Item>
        </Grid>
        
        <Grid item xs={12}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              Current System Status
            </Typography>
            <Typography variant="body1">
              WebSocket Connection: {websocketStatus}
            </Typography>
            <Typography variant="body1">
              CPU Usage: {Math.round(metrics.cpuUsage)}%
            </Typography>
            <Typography variant="body1">
              Memory Usage: {Math.round(metrics.memoryUsage)}%
            </Typography>
            <Typography variant="body1">
              Active Agents: {metrics.activeAgents}
            </Typography>
            <Typography variant="body1">
              Pending Tasks: {metrics.pendingTasks}
            </Typography>
            <Typography variant="body1">
              Last Updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Item>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Metrics; 