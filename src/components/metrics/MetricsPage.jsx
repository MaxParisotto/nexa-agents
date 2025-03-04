import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, ButtonGroup, 
  Card, CardContent, Divider, CircularProgress, Alert,
  FormControlLabel, Switch
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';

import SystemMetricsChart from './SystemMetricsChart';
import MetricsOverview from './MetricsOverview';
import { useMetrics } from '../../hooks/useMetrics';

/**
 * Metrics Page Component - Display system performance metrics
 */
export default function MetricsPage() {
  const { metrics, historicalMetrics, loading, error, fetchMetrics, fetchHistoricalMetrics } = useMetrics();
  const [timeRange, setTimeRange] = useState('1d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchMetrics();
  };
  
  // Handle time range selection
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    
    let days = 1;
    switch (range) {
      case '1h':
        // Just use recent data for 1h since we're mocking
        return;
      case '6h':
        // Just use recent data for 6h since we're mocking
        return;
      case '1d':
        days = 1;
        break;
      case '1w':
        days = 7;
        break;
      case '1m':
        days = 30;
        break;
      default:
        days = 1;
    }
    
    fetchHistoricalMetrics(days);
  };
  
  // Format memory usage for display
  const formatMemory = (bytes) => {
    const GB = 1024 * 1024 * 1024;
    return {
      used: (bytes / GB).toFixed(2) + ' GB',
      percent: ((bytes / (metrics?.memory_total || 1)) * 100).toFixed(1) + '%'
    };
  };
  
  // Format disk usage for display
  const formatDisk = (usage) => {
    const GB = 1024 * 1024 * 1024;
    return {
      used: (usage.used / GB).toFixed(1) + ' GB',
      total: (usage.total / GB).toFixed(1) + ' GB',
      percent: ((usage.used / usage.total) * 100).toFixed(1) + '%'
    };
  };
  
  // Format uptime for display
  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    result += `${minutes}m`;
    
    return result;
  };
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">System Metrics</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label="Auto-refresh"
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!metrics || loading}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* System Metrics Overview */}
      {loading && !metrics ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <MetricsOverview metrics={metrics} />
      )}
      
      {/* Time Range Selection */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 3 }}>
        <Typography variant="h5">Performance Over Time</Typography>
        
        <ButtonGroup color="primary" size="small">
          <Button 
            variant={timeRange === '1h' ? 'contained' : 'outlined'} 
            onClick={() => handleTimeRangeChange('1h')}
          >
            1h
          </Button>
          <Button 
            variant={timeRange === '6h' ? 'contained' : 'outlined'} 
            onClick={() => handleTimeRangeChange('6h')}
          >
            6h
          </Button>
          <Button 
            variant={timeRange === '1d' ? 'contained' : 'outlined'} 
            onClick={() => handleTimeRangeChange('1d')}
          >
            1d
          </Button>
          <Button 
            variant={timeRange === '1w' ? 'contained' : 'outlined'} 
            onClick={() => handleTimeRangeChange('1w')}
          >
            1w
          </Button>
          <Button 
            variant={timeRange === '1m' ? 'contained' : 'outlined'} 
            onClick={() => handleTimeRangeChange('1m')}
          >
            1m
          </Button>
        </ButtonGroup>
      </Box>
      
      {/* Performance Charts */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>CPU & Memory Usage</Typography>
        
        {loading && !historicalMetrics.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : historicalMetrics.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">No historical data available</Typography>
          </Box>
        ) : (
          <Box sx={{ height: 400, width: '100%' }}>
            <SystemMetricsChart 
              data={historicalMetrics} 
              type="area"
              metrics={['cpu', 'memory']} 
            />
          </Box>
        )}
      </Paper>
      
      {/* System Details */}
      <Typography variant="h5" gutterBottom>System Details</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                System Uptime & Performance
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Uptime</Typography>
                    <Typography variant="h6">{formatUptime(metrics?.uptime)}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">Active Processes</Typography>
                    <Typography variant="h6">{metrics?.processes || 'N/A'}</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">CPU Temperature</Typography>
                    <Typography variant="h6">{metrics?.temperature ? `${metrics.temperature.toFixed(1)}°C` : 'N/A'}</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                <StorageIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                Storage
              </Typography>
              
              {metrics?.disk_usage ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      {formatDisk(metrics.disk_usage).used} / {formatDisk(metrics.disk_usage).total}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatDisk(metrics.disk_usage).percent}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ width: '100%', bgcolor: 'background.paper', height: 8, borderRadius: 1 }}>
                    <Box 
                      sx={{ 
                        width: formatDisk(metrics.disk_usage).percent, 
                        bgcolor: 'primary.main', 
                        height: '100%',
                        borderRadius: 1
                      }}
                    />
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Storage information not available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SpeedIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                Resource Allocation
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">CPU Usage</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metrics?.cpu_usage ? `${metrics.cpu_usage.toFixed(1)}%` : 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ width: '100%', bgcolor: 'background.paper', height: 8, borderRadius: 1 }}>
                      <Box 
                        sx={{ 
                          width: `${metrics?.cpu_usage || 0}%`, 
                          bgcolor: 'secondary.main', 
                          height: '100%',
                          borderRadius: 1
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Memory Usage</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {metrics?.memory_used ? formatMemory(metrics.memory_used).percent : 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ width: '100%', bgcolor: 'background.paper', height: 8, borderRadius: 1 }}>
                      <Box 
                        sx={{ 
                          width: metrics?.memory_used ? formatMemory(metrics.memory_used).percent : '0%', 
                          bgcolor: 'primary.main', 
                          height: '100%',
                          borderRadius: 1
                        }}
                      />
                    </Box>
                    
                    <Typography variant="caption" color="textSecondary">
                      {metrics?.memory_used ? `${formatMemory(metrics.memory_used).used} of ${formatMemory(metrics.memory_total).used} used` : ''}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}