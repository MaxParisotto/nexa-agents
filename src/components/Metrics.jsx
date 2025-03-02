import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Paper, CircularProgress } from '@mui/material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

/**
 * System Metrics Dashboard Component
 */
const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const serverStatus = useSelector(state => state.system?.serverStatus);
  
  // Connect to WebSocket on component mount
  useEffect(() => {
    const newSocket = io();
    
    newSocket.on('connect', () => {
      console.log('Connected to metrics socket');
      setConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from metrics socket');
      setConnected(false);
    });
    
    newSocket.on('system_metrics', (data) => {
      setMetrics(data);
    });
    
    setSocket(newSocket);
    
    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);
  
  // Format timestamp for charts
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Format bytes to human-readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  // Create data for hour-based histogram
  const createHourLabels = () => {
    if (!metrics?.histogram?.requests) return [];
    
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      requests: metrics.histogram.requests[i] || 0,
      errors: metrics.histogram.errors[i] || 0
    }));
  };
  
  if (!connected || !metrics) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          System Metrics
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            {connected ? 'Loading metrics data...' : 'Connecting to metrics server...'}
          </Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        System Metrics
      </Typography>
      
      <Grid container spacing={3}>
        {/* CPU Usage Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 240 }}>
            <Typography variant="h6" gutterBottom>
              CPU Usage
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={metrics.cpu.usage} 
                  size={120} 
                  thickness={5} 
                  sx={{ 
                    color: metrics.cpu.usage > 80 ? 'error.main' : 
                           metrics.cpu.usage > 60 ? 'warning.main' : 'success.main' 
                  }}
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
                  <Typography variant="h4" component="div">
                    {`${metrics.cpu.usage.toFixed(1)}%`}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {`${metrics.cpu.cores} Cores Available`}
            </Typography>
          </Paper>
        </Grid>
        
        {/* Memory Usage Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 240 }}>
            <Typography variant="h6" gutterBottom>
              Memory Usage
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={metrics.memory.usagePercent} 
                  size={120} 
                  thickness={5} 
                  sx={{ 
                    color: metrics.memory.usagePercent > 80 ? 'error.main' : 
                           metrics.memory.usagePercent > 60 ? 'warning.main' : 'success.main' 
                  }}
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
                  <Typography variant="h4" component="div">
                    {`${metrics.memory.usagePercent.toFixed(1)}%`}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
            </Typography>
          </Paper>
        </Grid>
        
        {/* Server Info Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 240 }}>
            <Typography variant="h6" gutterBottom>
              Server Info
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Uptime:</Typography>
                <Typography variant="body1">
                  {`${Math.floor(metrics.uptime / 60 / 60)}h ${Math.floor((metrics.uptime / 60) % 60)}m`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Active Connections:</Typography>
                <Typography variant="body1">{metrics.serverLoad.current}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Server Status:</Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: connected ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}
                >
                  {connected ? 'ONLINE' : 'OFFLINE'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* CPU Usage History Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              CPU Usage History
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={metrics.cpu.history}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'CPU Usage']}
                  labelFormatter={formatTimestamp}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  name="CPU Usage" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Memory Usage History Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Memory Usage History
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={metrics.memory.history}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Memory Usage']}
                  labelFormatter={formatTimestamp}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#82ca9d" 
                  name="Memory Usage" 
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Hourly Requests Bar Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Request Activity by Hour
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={createHourLabels()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="requests" fill="#8884d8" name="Requests" />
                <Bar dataKey="errors" fill="#ff5252" name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Metrics;