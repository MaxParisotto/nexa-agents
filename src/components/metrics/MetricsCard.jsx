import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';

/**
 * MetricsCard Component - Card displaying a single metric with optional progress bar
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Value to display
 * @param {number} [props.progress] - Optional progress value (0-100)
 * @param {React.ReactNode} [props.icon] - Optional icon to display
 * @param {'primary'|'secondary'|'error'|'warning'|'info'|'success'} [props.color='primary'] - Color theme
 */
export default function MetricsCard({ title, value, progress, icon, color = 'primary' }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          
          {icon && (
            <Box sx={{ ml: 1 }}>
              {icon}
            </Box>
          )}
        </Box>
        
        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
          {value}
        </Typography>
        
        {progress !== undefined && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              color={color}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
