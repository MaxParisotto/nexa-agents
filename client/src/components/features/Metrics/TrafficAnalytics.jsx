import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
  Paper
} from '@mui/material';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const TrafficAnalytics = () => {
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/metrics/traffic');
        setTrafficData(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch traffic metrics', err);
        setError('Failed to load traffic analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrafficData();
    const intervalId = setInterval(fetchTrafficData, 10000); // Update every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Prepare data for charts
  const prepareEndpointData = () => {
    if (!trafficData || !trafficData.requests_by_endpoint) return [];
    
    return Object.entries(trafficData.requests_by_endpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 endpoints
  };

  const prepareStatusData = () => {
    if (!trafficData || !trafficData.responses_by_status) return [];
    
    return Object.entries(trafficData.responses_by_status)
      .map(([status, count]) => ({
        status: Number(status),
        count,
        color: getStatusColor(Number(status))
      }));
  };

  const prepareHourlyData = () => {
    if (!trafficData || !trafficData.hourly_requests) return [];
    
    const currentHour = new Date().getHours();
    return trafficData.hourly_requests.map((count, index) => ({
      hour: index,
      count,
      active: index === currentHour
    }));
  };

  const getStatusColor = (status) => {
    if (status < 200) return theme.palette.info.main;
    if (status < 300) return theme.palette.success.main;
    if (status < 400) return theme.palette.info.main;
    if (status < 500) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  if (loading && !trafficData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !trafficData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          API Traffic Analytics
        </Typography>
        
        {trafficData && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="textSecondary">Total Requests</Typography>
                  <Typography variant="h4">{trafficData.total_requests.toLocaleString()}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="textSecondary">Avg Response Time</Typography>
                  <Typography variant="h4">
                    {trafficData.avg_response_time_ms.toFixed(2)} ms
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="textSecondary">Data In</Typography>
                  <Typography variant="h4">
                    {(trafficData.total_bytes_in / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                  <Typography variant="subtitle2" color="textSecondary">Data Out</Typography>
                  <Typography variant="h4">
                    {(trafficData.total_bytes_out / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              <Tab label="Endpoints" />
              <Tab label="Response Codes" />
              <Tab label="Hourly Traffic" />
            </Tabs>
            
            <Box sx={{ height: 300, width: '100%' }}>
              {activeTab === 0 && (
                <ResponsiveContainer>
                  <BarChart data={prepareEndpointData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="endpoint" 
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill={theme.palette.primary.main} name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              
              {activeTab === 1 && (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={prepareStatusData()}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.status}: ${entry.count}`}
                    >
                      {prepareStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, `Status ${name}`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
              
              {activeTab === 2 && (
                <ResponsiveContainer>
                  <LineChart data={prepareHourlyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(hour) => `${hour}:00`}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'Requests']}
                      labelFormatter={(hour) => `Hour: ${hour}:00`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={theme.palette.primary.main} 
                      activeDot={{ r: 8 }} 
                      name="Requests"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrafficAnalytics;
