import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Chip, 
  Stepper, Step, StepLabel, StepContent,
  Divider, CircularProgress, Alert, Grid,
  IconButton, Card, CardContent, List, ListItem,
  ListItemText, ListItemIcon
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StopIcon from '@mui/icons-material/Stop';

// Import utilities
import { formatDate } from '../../shared/utils';

/**
 * WorkflowDetail Component - Displays detail view of a workflow
 */
export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch workflow details on component mount
  useEffect(() => {
    const fetchWorkflow = async () => {
      setLoading(true);
      try {
        // In a real app, this would be an API call using apiService.getWorkflow(id)
        // For now, let's use the mock data
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data - normally you would filter this from an API
        const mockWorkflow = {
          id: id,
          name: 'Content Generation Pipeline',
          description: 'An end-to-end workflow for generating website content with AI assistance.',
          status: 'active',
          steps: [
            { 
              id: 'step1', 
              name: 'Research Topics', 
              status: 'completed',
              description: 'Analyze trending topics and SEO data to determine content focus',
              completedAt: '2023-05-10T11:30:00Z',
              agent: 'Research Assistant'
            },
            { 
              id: 'step2', 
              name: 'Generate Outline', 
              status: 'completed',
              description: 'Create content structure with headings and key points',
              completedAt: '2023-05-10T12:45:00Z',
              agent: 'Content Planner'
            },
            { 
              id: 'step3', 
              name: 'Write Draft', 
              status: 'in_progress',
              description: 'Write full article draft based on the outline',
              startedAt: '2023-05-10T13:00:00Z',
              agent: 'Content Writer'
            },
            { 
              id: 'step4', 
              name: 'Edit & Refine', 
              status: 'pending',
              description: 'Improve writing quality, check facts, and optimize readability',
              agent: 'Editor Bot'
            },
            { 
              id: 'step5', 
              name: 'Publish', 
              status: 'pending',
              description: 'Format and publish to the website with proper metadata',
              agent: 'Publishing Agent'
            }
          ],
          createdAt: '2023-05-10T10:30:00Z',
          updatedAt: '2023-05-10T14:22:00Z',
          createdBy: 'John Doe',
          lastRunAt: '2023-05-10T10:45:00Z',
          nextRunAt: null
        };
        
        setWorkflow(mockWorkflow);
        setError(null);
      } catch (err) {
        console.error(`Error fetching workflow ${id}:`, err);
        setError('Failed to load workflow details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkflow();
  }, [id]);
  
  // Get step status icon
  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'in_progress':
        return <AccessTimeIcon color="primary" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };
  
  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
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
  
  // Handle back button click
  const handleBack = () => {
    navigate('/workflows');
  };
  
  // Handle edit workflow button click
  const handleEdit = () => {
    navigate(`/workflows/${id}/edit`);
  };
  
  // Handle run/pause workflow
  const handleRunPause = () => {
    // In a real app, this would call an API
    console.log('Run/Pause workflow:', id);
  };
  
  // Handle stop workflow
  const handleStop = () => {
    // In a real app, this would call an API
    console.log('Stop workflow:', id);
  };
  
  // Handle delete workflow
  const handleDelete = () => {
    // In a real app, this would call an API and show confirmation dialog
    console.log('Delete workflow:', id);
    navigate('/workflows');
  };
  
  // Calculate workflow progress
  const calculateProgress = () => {
    if (!workflow?.steps?.length) return 0;
    
    const total = workflow.steps.length;
    const completed = workflow.steps.filter(s => s.status === 'completed').length;
    
    return Math.round((completed / total) * 100);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Workflows
        </Button>
        
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (!workflow) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Workflows
        </Button>
        
        <Alert severity="warning">Workflow not found.</Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* Header with navigation and actions */}
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Workflows
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4">{workflow.name}</Typography>
            <Typography variant="body2" color="textSecondary">
              Created {formatDate(workflow.createdAt)} by {workflow.createdBy}
            </Typography>
          </Box>
          
          <Box>
            <Chip 
              label={workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
              color={getStatusColor(workflow.status)}
              sx={{ mr: 1 }}
            />
            
            <Box sx={{ display: 'inline-flex', gap: 1 }}>
              {workflow.status === 'active' ? (
                <Button 
                  variant="outlined" 
                  color="warning"
                  startIcon={<PauseIcon />}
                  onClick={handleRunPause}
                >
                  Pause
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleRunPause}
                  disabled={workflow.status === 'completed'}
                >
                  Run
                </Button>
              )}
              
              <IconButton color="primary" onClick={handleEdit}>
                <EditIcon />
              </IconButton>
              
              <IconButton color="error" onClick={handleDelete}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Workflow information */}
      <Grid container spacing={3}>
        {/* Main content - Workflow steps */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Steps
            </Typography>
            
            <Stepper orientation="vertical" activeStep={-1}>
              {workflow.steps.map((step, index) => (
                <Step key={step.id} completed={step.status === 'completed'} active={step.status === 'in_progress'}>
                  <StepLabel 
                    optional={
                      step.completedAt ? (
                        <Typography variant="caption">
                          Completed {formatDate(step.completedAt)}
                        </Typography>
                      ) : step.startedAt ? (
                        <Typography variant="caption">
                          Started {formatDate(step.startedAt)}
                        </Typography>
                      ) : null
                    }
                    icon={getStepIcon(step.status)}
                  >
                    <Typography variant="subtitle1">
                      {step.name}
                    </Typography>
                  </StepLabel>
                  
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      {step.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="textSecondary">
                        Assigned to: {step.agent}
                      </Typography>
                      
                      {step.status === 'in_progress' && (
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="warning"
                          startIcon={<StopIcon />}
                          onClick={handleStop}
                        >
                          Stop
                        </Button>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>
        
        {/* Sidebar - Workflow details and stats */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Workflow Details</Typography>
              
              <Typography variant="body2" color="textSecondary" paragraph>
                {workflow.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <List dense disablePadding>
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Progress" 
                    secondary={`${calculateProgress()}% complete`}
                  />
                </ListItem>
                
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Last Run" 
                    secondary={workflow.lastRunAt ? formatDate(workflow.lastRunAt) : 'Never'}
                  />
                </ListItem>
                
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Created" 
                    secondary={formatDate(workflow.createdAt)}
                  />
                </ListItem>
                
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary="Last Updated" 
                    secondary={formatDate(workflow.updatedAt)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Actions</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  disabled={workflow.status === 'completed'}
                  fullWidth
                >
                  Run Workflow
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  disabled={workflow.status === 'completed'}
                  fullWidth
                >
                  Reset Workflow
                </Button>
                
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<EditIcon />}
                  fullWidth
                  onClick={handleEdit}
                >
                  Edit Workflow
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  fullWidth
                  onClick={handleDelete}
                >
                  Delete Workflow
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
