import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MetricsCard from './MetricsCard';

/**
 * Metrics Overview Component - Shows a summary of system metrics
 * 
 * @param {Object} props - Component props
 * @param {Object} props.metrics - System metrics data
 */
export default function MetricsOverview({ metrics }) {
  if (!metrics) {
    return null;
  }
  
  // Format memory as GB
  const formatMemory = (bytes) => {
    const GB = 1024 * 1024 * 1024;
    return (bytes / GB).toFixed(2) + ' GB';
  };
  
  // Format uptime
  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  const memoryUsagePercent = (metrics.memory_used / metrics.memory_total) * 100;
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="CPU Usage"
          value={`${metrics.cpu_usage.toFixed(1)}%`}
          progress={metrics.cpu_usage}
          icon={<MemoryIcon fontSize="large" color="primary" />}
          color="primary"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Memory Usage"
          value={formatMemory(metrics.memory_used)}
          progress={memoryUsagePercent}
          icon={<StorageIcon fontSize="large" color="secondary" />}
          color="secondary"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Uptime"
          value={formatUptime(metrics.uptime)}
          icon={<AccessTimeIcon fontSize="large" color="info" />}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Processes"
          value={metrics.processes || 'N/A'}
          icon={<ListAltIcon fontSize="large" color="success" />}
        />
      </Grid>
    </Grid>
  );
}
