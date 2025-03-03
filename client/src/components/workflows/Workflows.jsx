import React, { useState } from 'react';
import { 
  Box, Typography, Button, Grid, 
  Paper, CircularProgress, Alert,
  TextField, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';

// Import components and hooks
import WorkflowCard from '../dashboard/WorkflowCard';
import { useWorkflows } from '../../hooks/useWorkflows';

/**
 * Workflows Component - Lists and manages workflows
 */
export default function Workflows() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { workflows, loading, error } = useWorkflows();
  
  // Handle workflow click
  const handleWorkflowClick = (id) => {
    navigate(`/workflows/${id}`);
  };
  
  // Handle create workflow button click
  const handleCreateWorkflow = () => {
    navigate('/workflows/new');
  };
  
  // Filter workflows by search term
  const filteredWorkflows = workflows.filter(workflow => 
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workflows</Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkflow}
        >
          New Workflow
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button 
                  startIcon={<FilterListIcon />} 
                  color="inherit"
                  size="small"
                >
                  Filters
                </Button>
              </InputAdornment>
            )
          }}
          sx={{ bgcolor: 'background.paper' }}
        />
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredWorkflows.length > 0 ? (
        <Grid container spacing={3}>
          {filteredWorkflows.map((workflow) => (
            <Grid item xs={12} sm={6} md={4} key={workflow.id}>
              <WorkflowCard 
                workflow={workflow}
                onClick={() => handleWorkflowClick(workflow.id)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>No workflows found</Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {searchTerm ? 
              `No workflows match your search for "${searchTerm}".` : 
              'No workflows have been created yet.'}
          </Typography>
          
          {searchTerm ? (
            <Button 
              variant="outlined" 
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />} 
              onClick={handleCreateWorkflow}
            >
              Create Your First Workflow
            </Button>
          )}
        </Paper>
      )}
    </Box>
  );
}
