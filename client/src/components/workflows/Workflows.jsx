import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Grid, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import WorkflowCard from '../dashboard/WorkflowCard';
import { useWorkflows } from '../../hooks/useWorkflows';

/**
 * Workflows listing page
 */
export default function Workflows() {
  const navigate = useNavigate();
  const { workflows, loading, error, createWorkflow } = useWorkflows();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    status: 'draft'
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter and search workflows
  const filteredWorkflows = workflows.filter(workflow => {
    // Apply status filter
    if (filterStatus !== 'all' && workflow.status !== filterStatus) {
      return false;
    }
    
    // Apply search filter (case insensitive)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        workflow.name.toLowerCase().includes(query) ||
        (workflow.description && workflow.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });
  
  // Handle dialog open/close
  const handleOpenCreateDialog = () => setCreateDialogOpen(true);
  const handleCloseCreateDialog = () => setCreateDialogOpen(false);
  
  // Handle create workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) {
      return; // Don't create workflow without a name
    }
    
    try {
      const createdWorkflow = await createWorkflow(newWorkflow);
      handleCloseCreateDialog();
      
      // Reset form
      setNewWorkflow({
        name: '',
        description: '',
        status: 'draft'
      });
      
      // Navigate to the new workflow
      navigate(`/workflows/${createdWorkflow.id}`);
    } catch (err) {
      // Error handling is done in the hook
    }
  };
  
  // Handle workflow click
  const handleWorkflowClick = (id) => {
    navigate(`/workflows/${id}`);
  };
  
  if (loading && workflows.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workflows</Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          New Workflow
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search workflows"
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
                startAdornment={<FilterListIcon fontSize="small" sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={5} sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="textSecondary">
              {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''} found
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Workflows Grid */}
      <Grid container spacing={3}>
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map((workflow) => (
            <Grid item xs={12} md={6} key={workflow.id}>
              <WorkflowCard 
                workflow={workflow} 
                onClick={() => handleWorkflowClick(workflow.id)} 
              />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6">No workflows found</Typography>
              <Typography color="textSecondary" sx={{ mt: 1 }}>
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create a new workflow to get started'}
              </Typography>
              
              <Button 
                variant="outlined" 
                color="primary" 
                sx={{ mt: 2 }}
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
              >
                Create Workflow
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* Create Workflow Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Workflow</DialogTitle>
        
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Workflow Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newWorkflow.name}
            onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <TextField
            margin="dense"
            id="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newWorkflow.description}
            onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateWorkflow} 
            variant="contained" 
            color="primary"
            disabled={!newWorkflow.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
