import React, { useCallback } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';

/**
 * System Metrics Chart Component - Displays metrics data in a time-series chart
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of metrics data points with timestamps
 * @param {string} [props.type='line'] - Chart type ('line' or 'area')
 * @param {Array} [props.metrics=['cpu', 'memory']] - Metrics to display
 */
export default function SystemMetricsChart({ 
  data, 
  type = 'line',
  metrics = ['cpu', 'memory']
}) {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="textSecondary">No metrics data available for charting</Typography>
      </Box>
    );
  }

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  // Format value for tooltip
  const formatTooltipValue = useCallback((value, name) => {
    if (name === 'cpu_usage') return [`${value.toFixed(2)}%`, 'CPU'];
    if (name === 'memory_used') return [`${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`, 'Memory'];
    return [value];
  }, []);

  const chartColors = {
    cpu: theme.palette.primary.main,
    memory: theme.palette.secondary.main,
    processes: theme.palette.success.main,
    uptime: theme.palette.info.main
  };

  // Configure chart based on type
  if (type === 'area') {
    return (
      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.cpu} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartColors.cpu} stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.memory} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartColors.memory} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTimestamp}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="cpu"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'CPU %', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 12 }  
              }}
            />
            <YAxis 
              yAxisId="memory"
              orientation="right"
              domain={[0, data[0]?.memory_total ? data[0].memory_total / (1024 * 1024 * 1024) * 1.1 : 16]}
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Memory (GB)', 
                angle: 90, 
                position: 'insideRight',
                style: { fontSize: 12 }
              }}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={formatTimestamp}
            />
            <Legend />
            {metrics.includes('cpu') && (
              <Area
                yAxisId="cpu"
                type="monotone"
                dataKey="cpu_usage"
                name="CPU Usage"
                stroke={chartColors.cpu}
                fill="url(#colorCpu)"
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            )}
            {metrics.includes('memory') && (
              <Area
                yAxisId="memory"
                type="monotone"
                dataKey="memory_used"
                name="Memory Used"
                stroke={chartColors.memory}
                fill="url(#colorMemory)"
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    );
  }

  // Default line chart
  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatTimestamp}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="cpu"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'CPU %', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }  
            }}
          />
          <YAxis 
            yAxisId="memory"
            orientation="right"
            domain={[0, data[0]?.memory_total ? data[0].memory_total / (1024 * 1024 * 1024) * 1.1 : 16]}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Memory (GB)', 
              angle: 90, 
              position: 'insideRight',
              style: { fontSize: 12 }
            }}
          />
          <Tooltip 
            formatter={formatTooltipValue}
            labelFormatter={formatTimestamp}
          />
          <Legend />
          {metrics.includes('cpu') && (
            <Line
              yAxisId="cpu"
              type="monotone"
              dataKey="cpu_usage"
              name="CPU Usage"
              stroke={chartColors.cpu}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
              dot={false}
            />
          )}
          {metrics.includes('memory') && (
            <Line
              yAxisId="memory"
              type="monotone"
              dataKey="memory_used"
              name="Memory Used"
              stroke={chartColors.memory}
              isAnimationActive={false}
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
