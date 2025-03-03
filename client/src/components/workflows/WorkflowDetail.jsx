import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Button, CircularProgress, Alert, 
  Grid, Chip, Divider, LinearProgress, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField,
  Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import WorkflowStepsList from './WorkflowStepsList';
import { useWorkflows } from '../../hooks/useWorkflows';

/**
 * Workflow Detail Page - Shows detailed view of a single workflow
 */
export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentWorkflow: workflow, 
    loading, 
    error, 
    fetchWorkflow,
    updateWorkflow,
    deleteWorkflow
  } = useWorkflows();
  
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editedWorkflow, setEditedWorkflow] = useState(null);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);
  
  // Fetch workflow data
  useEffect(() => {
    fetchWorkflow(id);
  }, [id, fetchWorkflow]);
  
  // Update editedWorkflow when workflow changes
  useEffect(() => {
    if (workflow) {
      setEditedWorkflow({ ...workflow });
    }
  }, [workflow]);
  
  // Calculate progress
  const calculateProgress = () => {
    if (!workflow?.steps?.length) return 0;
    
    const completedSteps = workflow.steps.filter(step => step.status === 'completed').length;
    return (completedSteps / workflow.steps.length) * 100;
  };
  
  // Handle workflow update
  const handleSaveChanges = async () => {
    try {
      await updateWorkflow(id, editedWorkflow);
      setEditing(false);
    } catch (err) {
      // Error is handled in hook
    }
  };
  
  // Handle workflow deletion
  const handleDeleteWorkflow = async () => {
    try {
      await deleteWorkflow(id);
      // Navigate back to workflows list
      navigate('/workflows');
    } catch (err) {
      // Error is handled in hook
      setDeleteDialogOpen(false);
    }
  };
  
  // Handle workflow status change
  const handleChangeStatus = async (newStatus) => {
    if (!workflow) return;
    
    try {
      await updateWorkflow(id, { ...workflow, status: newStatus });
    } catch (err) {
      // Error is handled in hook
    }
  };
  
  // Handle menu open/close
  const handleMenuOpen = (event) => setMenuAnchorEl(event.currentTarget);
  const handleMenuClose = () => setMenuAnchorEl(null);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !workflow) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/workflows')}
          sx={{ mb: 2 }}
        >
          Back to Workflows
        </Button>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!workflow) {
    return (
      <Box>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/workflows')}
          sx={{ mb: 2 }}
        >
          Back to Workflows
        </Button>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          Workflow not found
        </Alert>
      </Box>
    );
  }
  
  // Status color map
  const statusColors = {
    draft: 'default',
    active: 'primary',
    completed: 'success',
    failed: 'error'
  };
  
  return (
    <Box>
      {/* Header navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/workflows')}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ ml: 2, flexGrow: 1 }}>
          {editing ? 'Edit Workflow' : workflow?.name}
        </Typography>
        
        {!editing && (
          <>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => setEditing(true)}
              sx={{ mr: 1 }}
            >
              Edit
            </Button>
            
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            
            {/* Workflow actions menu */}
            <Menu
              anchorEl={menuAnchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
            >
              {workflow?.status === 'draft' && (
                <MenuItem 
                  onClick={() => {
                    handleChangeStatus('active');
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <PlayArrowIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Start Workflow</ListItemText>
                </MenuItem>
              )}
              
              {workflow?.status === 'active' && (
                <MenuItem 
                  onClick={() => {
                    handleChangeStatus('completed');
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <StopIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Complete Workflow</ListItemText>
                </MenuItem>
              )}
              
              <MenuItem 
                onClick={() => {
                  setDeleteDialogOpen(true);
                  handleMenuClose();
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Delete Workflow</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
        
        {editing && (
          <>
            <Button 
              onClick={() => {
                setEditedWorkflow({ ...workflow });
                setEditing(false);
              }}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSaveChanges}
            >
              Save
            </Button>
          </>
        )}
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Main content */}
      {editing ? (
        // Edit form
        <Paper sx={{ p: 3, mb: 3 }}>
          <TextField
            fullWidth
            label="Workflow Name"
            value={editedWorkflow?.name || ''}
            onChange={(e) => setEditedWorkflow({ ...editedWorkflow, name: e.target.value })}
            margin="normal"
            variant="outlined"
          />
          
          <TextField
            fullWidth
            label="Description"
            value={editedWorkflow?.description || ''}
            onChange={(e) => setEditedWorkflow({ ...editedWorkflow, description: e.target.value })}
            margin="normal"
            variant="outlined"
            multiline
            rows={3}
          />
        </Paper>
      ) : (
        // Details view
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip 
                  label={workflow?.status} 
                  color={statusColors[workflow?.status] || 'default'} 
                  size="small" 
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Created: {formatDate(workflow?.createdAt)}
                </Typography>
                {workflow?.updatedAt && workflow?.updatedAt !== workflow?.createdAt && (
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                    Updated: {formatDate(workflow?.updatedAt)}
                  </Typography>
                )}
              </Box>
              
              {workflow?.description && (
                <Typography sx={{ mt: 2, mb: 3 }}>
                  {workflow.description}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} sm={4}>
              {workflow?.status === 'active' && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Progress</Typography>
                    <Typography variant="body2">{Math.round(calculateProgress())}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculateProgress()} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Workflow Steps */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Workflow Steps</Typography>
          
          {!editing && workflow?.status === 'draft' && (
            <Button 
              startIcon={<AddIcon />} 
              variant="outlined"
              color="primary"
              size="small"
            >
              Add Step
            </Button>
          )}
        </Box>
        
        <WorkflowStepsList 
          steps={workflow?.steps || []} 
          isEditing={editing}
          workflowId={id}
          workflowStatus={workflow?.status}
        />
      </Box>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{workflow?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteWorkflow} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
