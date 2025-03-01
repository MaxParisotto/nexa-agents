import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Speed as SpeedIcon, 
  Memory as MemoryIcon, 
  Assessment as AssessmentIcon,
  Token as TokenIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { startSystemMonitoring, addBenchmarkResult } from '../store/actions/systemActions';

// Styled components
const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(3),
  color: theme.palette.text.secondary,
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
}));

const MetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
}));

const MetricValue = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(1)
}));

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

/**
 * Metrics component that displays system performance metrics and charts
 * including detailed token metrics with graphs for tokens/s, total tokens, etc.
 */
const Metrics = () => {
  const dispatch = useDispatch();
  const metrics = useSelector((state) => state.system.metrics);
  const metricsHistory = useSelector((state) => state.system.metricsHistory || []);
  const tokenMetrics = useSelector((state) => state.system.tokenMetrics);
  const benchmarkResults = useSelector((state) => state.system.tokenMetrics.benchmarkResults || []);
  const websocketStatus = useSelector((state) => state.system.websocketStatus);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const metricsInterval = dispatch(startSystemMonitoring());
    
    // Import any benchmark results from localStorage if they exist
    const storedBenchmarks = localStorage.getItem('benchmarkResults');
    if (storedBenchmarks) {
      try {
        const benchmarks = JSON.parse(storedBenchmarks);
        if (Array.isArray(benchmarks) && benchmarks.length > 0) {
          benchmarks.forEach(benchmark => {
            dispatch(addBenchmarkResult(benchmark));
          });
        }
      } catch (error) {
        console.error('Error parsing stored benchmarks:', error);
      }
    }
    
    return () => {
      if (metricsInterval) {
        clearInterval(metricsInterval);
      }
    };
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Format timestamp for chart display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  // Format large numbers with commas
  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0';
  };

  // Refresh metrics
  const handleRefresh = () => {
    setRefreshing(true);
    dispatch(startSystemMonitoring());
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Prepare system metrics chart data
  const systemChartData = metricsHistory.map((item) => ({
    timestamp: formatTimestamp(item.timestamp),
    cpuUsage: item.cpuUsage,
    memoryUsage: item.memoryUsage,
    activeAgents: item.activeAgents,
    pendingTasks: item.pendingTasks
  }));

  // Prepare token metrics chart data
  const tokenChartData = tokenMetrics.tokenHistory.map((item) => ({
    timestamp: formatTimestamp(item.timestamp),
    tokensPerSecond: item.averageTokensPerSecond,
    recentTokensGenerated: item.recentTokensGenerated,
    recentTokensProcessed: item.recentTokensProcessed
  }));

  // Prepare model usage data for pie chart
  const modelUsageData = Object.entries(tokenMetrics.modelUsage || {}).map(([model, data]) => ({
    name: model,
    value: data.totalTokens || 0
  })).sort((a, b) => b.value - a.value);

  // Prepare benchmark results data
  const benchmarkChartData = benchmarkResults.map((result, index) => ({
    name: result.model || `Benchmark ${index + 1}`,
    score: result.averageScore || 0,
    tokensPerSecond: result.averageTokensPerSecond || 0,
    latency: result.averageLatency || 0
  }));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          System Metrics
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </Button>
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Total Tokens Generated
                </Typography>
                <TokenIcon color="primary" />
              </Box>
              <MetricValue color="primary">
                {formatNumber(tokenMetrics.totalTokensGenerated)}
              </MetricValue>
              <Typography variant="body2" color="text.secondary">
                Tokens generated across all models
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Tokens/Second
                </Typography>
                <SpeedIcon color="secondary" />
              </Box>
              <MetricValue color="secondary">
                {tokenMetrics.averageTokensPerSecond?.toFixed(1) || '0.0'}
              </MetricValue>
              <Typography variant="body2" color="text.secondary">
                Current generation speed
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  CPU Usage
                </Typography>
                <MemoryIcon color="info" />
              </Box>
              <MetricValue color="info">
                {Math.round(metrics.cpuUsage || 0)}%
              </MetricValue>
              <Typography variant="body2" color="text.secondary">
                Current CPU utilization
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="text.secondary">
                  Memory Usage
                </Typography>
                <AssessmentIcon color="warning" />
              </Box>
              <MetricValue color="warning">
                {Math.round(metrics.memoryUsage || 0)}%
              </MetricValue>
              <Typography variant="body2" color="text.secondary">
                Current memory utilization
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
      </Grid>
      
      {/* Tabs for different metric categories */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="metrics tabs">
          <Tab label="Token Metrics" />
          <Tab label="System Performance" />
          <Tab label="Benchmark Results" />
        </Tabs>
      </Box>
      
      {/* Token Metrics Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                Token Generation Rate
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={tokenChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tokensPerSecond" 
                    name="Tokens/Second" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Item>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                Model Usage Distribution
              </Typography>
              {modelUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {modelUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body1" color="text.secondary">
                    No model usage data available
                  </Typography>
                </Box>
              )}
            </Item>
          </Grid>
          
          <Grid item xs={12}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                Token Generation Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={tokenChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="recentTokensGenerated" 
                    name="Tokens Generated" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="recentTokensProcessed" 
                    name="Tokens Processed" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Item>
          </Grid>
          
          <Grid item xs={12}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                Token Metrics Summary
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Tokens Generated</TableCell>
                      <TableCell align="right">{formatNumber(tokenMetrics.totalTokensGenerated)}</TableCell>
                      <TableCell>Total number of tokens generated across all models</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Tokens Processed</TableCell>
                      <TableCell align="right">{formatNumber(tokenMetrics.totalTokensProcessed)}</TableCell>
                      <TableCell>Total number of tokens processed (input + output)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Tokens/Second</TableCell>
                      <TableCell align="right">{tokenMetrics.averageTokensPerSecond?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>Average token generation speed</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Models Used</TableCell>
                      <TableCell align="right">{Object.keys(tokenMetrics.modelUsage || {}).length}</TableCell>
                      <TableCell>Number of different models used</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Item>
          </Grid>
        </Grid>
      )}
      
      {/* System Performance Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                CPU Usage
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={systemChartData}
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
                  data={systemChartData}
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
                  data={systemChartData}
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
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>WebSocket Connection</TableCell>
                          <TableCell>
                            <Chip 
                              label={websocketStatus} 
                              color={websocketStatus === 'connected' ? 'success' : 'error'} 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>CPU Usage</TableCell>
                          <TableCell>{Math.round(metrics.cpuUsage || 0)}%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Memory Usage</TableCell>
                          <TableCell>{Math.round(metrics.memoryUsage || 0)}%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TableContainer>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Active Agents</TableCell>
                          <TableCell>{metrics.activeAgents || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Pending Tasks</TableCell>
                          <TableCell>{metrics.pendingTasks || 0}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Last Updated</TableCell>
                          <TableCell>{new Date().toLocaleTimeString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Item>
          </Grid>
        </Grid>
      )}
      
      {/* Benchmark Results Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                Benchmark Comparison
              </Typography>
              {benchmarkResults.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={benchmarkChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="score" name="Score (0-10)" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="tokensPerSecond" name="Tokens/Second" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                  <Typography variant="body1" color="text.secondary">
                    No benchmark results available. Run benchmarks in the Settings page.
                  </Typography>
                </Box>
              )}
            </Item>
          </Grid>
          
          {benchmarkResults.length > 0 && (
            <Grid item xs={12}>
              <Item elevation={3}>
                <Typography variant="h6" gutterBottom>
                  Benchmark Results
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Model</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell align="right">Tokens/Second</TableCell>
                        <TableCell align="right">Latency (ms)</TableCell>
                        <TableCell align="right">Total Time</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {benchmarkResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.model || 'Unknown'}</TableCell>
                          <TableCell align="right">{result.averageScore?.toFixed(1) || '0.0'}/10</TableCell>
                          <TableCell align="right">{result.averageTokensPerSecond?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell align="right">{result.averageLatency?.toFixed(0) || '0'}</TableCell>
                          <TableCell align="right">{result.totalTime ? `${(result.totalTime / 1000).toFixed(1)}s` : 'N/A'}</TableCell>
                          <TableCell>{result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Item>
            </Grid>
          )}
          
          {benchmarkResults.length > 0 && (
            <Grid item xs={12}>
              <Item elevation={3}>
                <Typography variant="h6" gutterBottom>
                  Latency Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={benchmarkChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="latency" name="Average Latency (ms)" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              </Item>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default Metrics; 