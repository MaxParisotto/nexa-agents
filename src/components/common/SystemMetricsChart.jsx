import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useTheme } from '@mui/material/styles';

/**
 * SystemMetricsChart - A reusable component for displaying system metrics
 */
export default function SystemMetricsChart({ data = [] }) {
  const theme = useTheme();

  // Format time for display in tooltips and axes
  const formatTime = (time) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  // Format CPU percentage without decimal places
  const formatCPU = (value) => `${Math.round(value)}%`;
  
  // Format memory from bytes to a human-readable format
  const formatMemory = (bytes) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: theme.palette.background.paper,
          padding: theme.spacing(1),
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[2],
          borderRadius: theme.shape.borderRadius
        }}>
          <p style={{ margin: 0, color: theme.palette.text.primary }}>
            {formatTime(label)}
          </p>
          
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ 
              margin: '8px 0 0 0',
              color: entry.color 
            }}>
              {entry.name}: {
                entry.name === 'CPU' 
                  ? formatCPU(entry.value) 
                  : formatMemory(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  // If there's no data, show a placeholder or empty container
  if (!data || data.length === 0) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          color: theme.palette.text.secondary
        }}>
          No metrics data available
        </div>
      </ResponsiveContainer>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis 
          dataKey="timestamp" 
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          tickFormatter={formatTime}
          stroke={theme.palette.divider}
        />
        <YAxis 
          yAxisId="cpu"
          name="CPU" 
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          tickFormatter={formatCPU}
          domain={[0, 100]}
          stroke={theme.palette.primary.main}
        />
        <YAxis 
          yAxisId="memory"
          orientation="right"
          name="Memory"
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          tickFormatter={formatMemory}
          stroke={theme.palette.secondary.main}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          yAxisId="cpu"
          type="monotone" 
          dataKey="cpu_usage" 
          name="CPU"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
        <Line 
          yAxisId="memory"
          type="monotone" 
          dataKey="memory_used" 
          name="Memory"
          stroke={theme.palette.secondary.main} 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
