import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

/**
 * SystemMetricsChart Component - Renders different chart types for system metrics
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Data points for the chart
 * @param {string} props.type - Chart type ('line' or 'area')
 * @param {Array<string>} props.metrics - Metrics to display ('cpu', 'memory', etc.)
 */
export default function SystemMetricsChart({ data = [], type = 'line', metrics = ['cpu'] }) {
  const theme = useTheme();
  
  // Process data for display
  const processedData = useMemo(() => {
    return data.map(point => {
      const formattedPoint = {
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
      };
      
      if (metrics.includes('cpu')) {
        formattedPoint.cpu = point.cpu_usage;
      }
      
      if (metrics.includes('memory')) {
        const memoryPercent = point.memory_total ? 
          (point.memory_used / point.memory_total) * 100 : 0;
        formattedPoint.memory = parseFloat(memoryPercent.toFixed(1));
      }
      
      if (metrics.includes('disk')) {
        const diskPercent = point.disk_usage?.total ? 
          (point.disk_usage.used / point.disk_usage.total) * 100 : 0;
        formattedPoint.disk = parseFloat(diskPercent.toFixed(1));
      }
      
      return formattedPoint;
    });
  }, [data, metrics]);
  
  // Define chart colors
  const colors = {
    cpu: theme.palette.primary.main,
    memory: theme.palette.secondary.main,
    disk: theme.palette.warning.main,
  };
  
  // Chart configuration
  const chartConfig = {
    cpu: {
      name: 'CPU Usage',
      unit: '%',
      color: colors.cpu,
    },
    memory: {
      name: 'Memory Usage',
      unit: '%',
      color: colors.memory,
    },
    disk: {
      name: 'Disk Usage',
      unit: '%',
      color: colors.disk,
    },
  };
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            {label}
          </Typography>
          
          {payload.map((entry, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  mr: 1,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2" color="textSecondary">
                {`${entry.name}: ${entry.value}${chartConfig[entry.dataKey]?.unit || ''}`}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    
    return null;
  };
  
  // Render either LineChart or AreaChart based on type prop
  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 10, right: 30, left: 0, bottom: 5 },
    };
    
    // Generate chart lines or areas
    const renderChartElements = () => {
      return metrics.map(metric => {
        const config = chartConfig[metric];
        const ChartElement = type === 'area' ? Area : Line;
        
        if (!config) return null;
        
        return (
          <ChartElement
            key={metric}
            type="monotone"
            dataKey={metric}
            name={config.name}
            stroke={config.color}
            fill={type === 'area' ? config.color : undefined}
            fillOpacity={type === 'area' ? 0.2 : undefined}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        );
      });
    };
    
    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis 
            dataKey="timestamp" 
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke={theme.palette.text.secondary}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            align="right" 
            verticalAlign="top" 
            height={36}
          />
          {renderChartElements()}
        </AreaChart>
      );
    }
    
    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis 
          dataKey="timestamp" 
          stroke={theme.palette.text.secondary}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          stroke={theme.palette.text.secondary}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          align="right" 
          verticalAlign="top" 
          height={36}
        />
        {renderChartElements()}
      </LineChart>
    );
  };
  
  if (!data || data.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No data available
        </Typography>
      </Box>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
}
