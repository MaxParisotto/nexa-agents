import React from 'react';
import { Grid } from '@mui/material';
import MetricsCard from './MetricsCard';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { formatFileSize } from '../../shared/utils';

/**
 * MetricsOverview Component - Displays system metrics overview cards
 * 
 * @param {Object} props - Component props
 * @param {Object} props.metrics - Metrics data
 */
export default function MetricsOverview({ metrics }) {
  if (!metrics) return null;
  
  // Format memory as percentage
  const memoryPercent = metrics.memory_total ? 
    ((metrics.memory_used / metrics.memory_total) * 100).toFixed(1) : 0;
  
  // Format disk usage as percentage
  const diskPercent = metrics.disk_usage?.total ? 
    ((metrics.disk_usage.used / metrics.disk_usage.total) * 100).toFixed(1) : 0;
  
  // Format uptime
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
    <Grid container spacing={3}>
      {/* CPU Metrics */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="CPU Usage"
          value={`${metrics.cpu_usage?.toFixed(1)}%`}
          progress={metrics.cpu_usage}
          icon={<MemoryIcon color="primary" />}
          color="primary"
        />
      </Grid>
      
      {/* Memory Metrics */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Memory Usage"
          value={`${formatFileSize(metrics.memory_used || 0)}`}
          progress={parseFloat(memoryPercent)}
          icon={<ShowChartIcon color="secondary" />}
          color="secondary"
        />
      </Grid>
      
      {/* Disk Metrics */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="Disk Usage"
          value={metrics.disk_usage ? 
            `${formatFileSize(metrics.disk_usage.used)}` : 'N/A'}
          progress={parseFloat(diskPercent)}
          icon={<StorageIcon color="warning" />}
          color="warning"
        />
      </Grid>
      
      {/* Uptime Metrics */}
      <Grid item xs={12} sm={6} md={3}>
        <MetricsCard
          title="System Uptime"
          value={formatUptime(metrics.uptime)}
          icon={<AccessTimeIcon color="info" />}
        />
      </Grid>
    </Grid>
  );
}
