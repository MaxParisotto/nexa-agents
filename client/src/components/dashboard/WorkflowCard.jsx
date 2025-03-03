import React from 'react';
import { Card, CardContent, Typography, Box, Chip, LinearProgress, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatDate } from '../../shared/utils';

/**
 * WorkflowCard Component - Displays workflow summary in a card format
 * 
 * @param {Object} props - Component props
 * @param {Object} props.workflow - Workflow data
 * @param {Function} props.onClick - Click handler
 */
export default function WorkflowCard({ workflow, onClick }) {
  // Calculate workflow progress
  const calculateProgress = () => {
    const total = workflow.steps.length;
    if (!total) return 0;
    
    const completed = workflow.steps.filter(s => s.status === 'completed').length;
    const inProgress = workflow.steps.filter(s => s.status === 'in_progress').length;
    
    return ((completed + inProgress * 0.5) / total) * 100;
  };
  
  // Get appropriate status color
  const getStatusColor = () => {
    switch (workflow.status) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  // Format status label
  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h6" noWrap sx={{ maxWidth: 220 }}>
              {workflow.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Updated {formatDate(workflow.updatedAt)}
            </Typography>
          </Box>
          
          <Chip 
            size="small" 
            label={formatStatus(workflow.status)} 
            color={getStatusColor()}
          />
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            height: 40,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {workflow.description || 'No description provided'}
        </Typography>
        
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              Progress
            </Typography>
            <Typography variant="body2">
              {workflow.steps.filter(s => s.status === 'completed').length}/{workflow.steps.length} steps
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={calculateProgress()} 
            sx={{ height: 6, borderRadius: 1 }}
            color={getStatusColor()}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          {workflow.status === 'active' ? (
            <IconButton size="small" color="warning">
              <PauseIcon fontSize="small" />
            </IconButton>
          ) : (
            <IconButton size="small" color="primary" disabled={workflow.status === 'completed'}>
              <PlayArrowIcon fontSize="small" />
            </IconButton>
          )}
          
          <IconButton 
            size="small" 
            color="primary" 
            sx={{ ml: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}
