import React, { useEffect, useState, useCallback } from 'react';
import { 
  Container, Typography, Paper, Grid, Box, 
  Card, CardContent, CircularProgress, LinearProgress
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { startSystemMonitoring } from '../store/actions/systemActions';

const Metrics = () => {
  const dispatch = useDispatch();
  const metrics = useSelector(state => state.system.metrics || {});
  const tokenMetrics = useSelector(state => state.system.tokenMetrics || {});
  const benchmarks = useSelector(state => state.system.benchmarks || []);
  const workflows = useSelector(state => state.system.workflows || []);
  
  // State for metrics history
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [tokenHistory, setTokenHistory] = useState([]);
  
  // Add metrics to history when they change
  useEffect(() => {
    if (metrics && Object.keys(metrics).length > 0) {
      setMetricsHistory(prev => {
        // Keep only the last 50 data points to prevent memory issues
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          cpu: metrics.cpu || 0,
          memory: metrics.memory || 0,
          disk: metrics.disk || 0,
          timestamp: Date.now()
        }];
        
        // Only keep the last 50 entries
        return newHistory.slice(-50);
      });
    }
  }, [metrics]);
  
  // Add token metrics to history when they change
  useEffect(() => {
    if (tokenMetrics && Object.keys(tokenMetrics).length > 0) {
      setTokenHistory(prev => {
        // Keep only the last 50 data points to prevent memory issues
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          used: tokenMetrics.used || 0,
          remaining: tokenMetrics.remaining || 0,
          total: tokenMetrics.total || 0,
          timestamp: Date.now()
        }];
        
        // Only keep the last 50 entries
        return newHistory.slice(-50);
      });
    }
  }, [tokenMetrics]);
  
  // Start system monitoring when component mounts
  useEffect(() => {
    // Start system monitoring
    const monitoringInterval = dispatch(startSystemMonitoring());
    
    // Clean up on unmount
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [dispatch]);
  
  // Calculate model usage distribution from benchmarks
  const getModelUsageData = useCallback(() => {
    if (!benchmarks || benchmarks.length === 0) {
      return [
        { name: 'No Data', value: 1 }
      ];
    }
    
    // Aggregate token usage by model name
    const modelUsage = benchmarks.reduce((acc, benchmark) => {
      const modelName = benchmark.model || 'Unknown';
      const tokensUsed = benchmark.tokens || 0;
      
      if (!acc[modelName]) {
        acc[modelName] = 0;
      }
      
      acc[modelName] += tokensUsed;
      return acc;
    }, {});
    
    // Convert to array format for the pie chart
    return Object.entries(modelUsage).map(([name, value]) => ({
      name,
      value
    }));
  }, [benchmarks]);
  
  // Format for pie chart
  const pieData = getModelUsageData();
  
  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Calculate active workflows
  const activeWorkflows = workflows.filter(w => w.status === 'running').length;
  
  // Calculate total tokens used today
  const calculateTodayTokens = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return benchmarks
      .filter(b => new Date(b.timestamp) >= today)
      .reduce((sum, b) => sum + (b.tokens || 0), 0);
  }, [benchmarks]);
  
  const todayTokens = calculateTodayTokens();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>System Metrics</Typography>
      
      <Grid container spacing={3}>
        {/* System status cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                CPU Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <CircularProgress 
                  variant="determinate" 
                  value={metrics.cpu || 0} 
                  size={60}
                  sx={{ mr: 2 }}
                />
                <Typography variant="h5">
                  {metrics.cpu || 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Memory Usage
              </Typography>
              <Box display="flex" alignItems="center">
                <CircularProgress 
                  variant="determinate" 
                  value={metrics.memory || 0} 
                  size={60}
                  sx={{ mr: 2 }}
                  color="secondary"
                />
                <Typography variant="h5">
                  {metrics.memory || 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Workflows
              </Typography>
              <Typography variant="h5">
                {activeWorkflows}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total: {workflows.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tokens Used Today
              </Typography>
              <Typography variant="h5">
                {todayTokens.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total: {tokenMetrics.total?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* CPU and memory chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>System Performance</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#8884d8" 
                  name="CPU (%)" 
                  activeDot={{ r: 8 }} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#82ca9d" 
                  name="Memory (%)" 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="disk" 
                  stroke="#ff7300" 
                  name="Disk (%)" 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              System resource utilization over time
            </Typography>
          </Paper>
        </Grid>
        
        {/* Token usage chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Token Usage Over Time</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tokenHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="used" 
                  stroke="#ff7300" 
                  name="Tokens Used" 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="remaining" 
                  stroke="#82ca9d" 
                  name="Tokens Remaining" 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Token usage metrics over time
            </Typography>
          </Paper>
        </Grid>
        
        {/* Token distribution by model */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Usage by Model</Typography>
            {pieData.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toLocaleString()} tokens`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="textSecondary">
                  No model usage data available
                </Typography>
              </Box>
            )}
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Token consumption by model
            </Typography>
          </Paper>
        </Grid>
        
        {/* Benchmark results */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Benchmark Results</Typography>
            {benchmarks.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={benchmarks.slice(-20).map(b => ({
                    time: new Date(b.timestamp).toLocaleTimeString(),
                    duration: b.duration || 0,
                    tokens: b.tokens || 0,
                    model: b.model || 'Unknown'
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="duration" 
                    name="Duration (ms)" 
                    stroke="#8884d8" 
                    yAxisId="left"
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tokens" 
                    name="Tokens" 
                    stroke="#82ca9d" 
                    yAxisId="right"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="textSecondary">
                  No benchmark data available
                </Typography>
              </Box>
            )}
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Performance metrics from recent operations
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Metrics;