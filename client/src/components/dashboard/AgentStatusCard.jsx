import React from 'react';
import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Agent Status Card Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.agent - Agent data object
 * @param {Function} props.onStatusChange - Optional callback for status change
 */
export default function AgentStatusCard({ agent, onStatusChange }) {
  // Status color mapping
  const statusColors = {
    idle: 'success',
    busy: 'warning',
    offline: 'error'
  };
  
  // Handle status toggle
  const handleStatusToggle = () => {
    if (onStatusChange) {
      const newStatus = agent.status === 'idle' ? 'busy' : 'idle';
      onStatusChange(agent.id, newStatus);
    }
  };
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <Typography variant="h6" component="h2">
            {agent.name}
          </Typography>
          
          <Chip 
            label={agent.status} 
            color={statusColors[agent.status] || 'default'}
            size="small"
          />
        </Box>
        
        {agent.capabilities && (
          <Box sx={{ mt: 2 }}>
            {agent.capabilities.map(capability => (
              <Chip 
                key={capability} 
                label={capability}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>
        )}
        
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            mt: 2 
          }}
        >
          <IconButton 
            size="small"
            onClick={handleStatusToggle}
            disabled={agent.status === 'offline'}
          >
            {agent.status === 'busy' ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton size="small">
            <SettingsIcon />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}
