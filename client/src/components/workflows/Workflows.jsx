import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Grid, 
  Paper, CircularProgress, Alert,
  TextField, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';

// Import components
import WorkflowCard from '../dashboard/WorkflowCard';

/**
 * Workflows Component - Lists and manages workflows
 */
export default function Workflows() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch workflows on component mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      try {
        // In a real app, this would be an API call using apiService.getWorkflows()
        // For now, let's use the mock data
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock data
        const mockWorkflows = [
          {
            id: '1',
            name: 'Content Generation Pipeline',
            description: 'An end-to-end workflow for generating website content',
            status: 'active',
            steps: [
              { id: 'step1', name: 'Research Topics', status: 'completed' },
              { id: 'step2', name: 'Generate Outline', status: 'completed' },
              { id: 'step3', name: 'Write Draft', status: 'in_progress' },
              { id: 'step4', name: 'Edit & Refine', status: 'pending' },
              { id: 'step5', name: 'Publish', status: 'pending' }
            ],
            createdAt: '2023-05-10T10:30:00Z',
            updatedAt: '2023-05-10T14:22:00Z'
          },
          {
            id: '2',
            name: 'Customer Support Assistant',
            description: 'Workflow for handling customer support requests',
            status: 'completed',
            steps: [
              { id: 'step1', name: 'Ticket Analysis', status: 'completed' },
              { id: 'step2', name: 'Response Generation', status: 'completed' },
              { id: 'step3', name: 'Human Review', status: 'completed' },
              { id: 'step4', name: 'Send Response', status: 'completed' }
            ],
            createdAt: '2023-05-08T09:15:00Z',
            updatedAt: '2023-05-09T16:40:00Z'
          },
          {
            id: '3',
            name: 'Data Analysis Pipeline',
            description: 'Process and analyze customer data',
            status: 'draft',
            steps: [
              { id: 'step1', name: 'Data Collection', status: 'pending' },
              { id: 'step2', name: 'Data Cleaning', status: 'pending' },
              { id: 'step3', name: 'Analysis', status: 'pending' },
              { id: 'step4', name: 'Report Generation', status: 'pending' }
            ],
            createdAt: '2023-05-12T11:20:00Z',
            updatedAt: '2023-05-12T11:20:00Z'
          },
          {
            id: '4',
            name: 'Email Marketing Campaign',
            description: 'Create and send targeted email campaigns',
            status: 'paused',
            steps: [
              { id: 'step1', name: 'Audience Segmentation', status: 'completed' },
              { id: 'step2', name: 'Content Creation', status: 'completed' },
              { id: 'step3', name: 'Email Design', status: 'in_progress' },
              { id: 'step4', name: 'Testing', status: 'pending' },
              { id: 'step5', name: 'Scheduling', status: 'pending' },
              { id: 'step6', name: 'Sending', status: 'pending' }
            ],
            createdAt: '2023-05-05T15:30:00Z',
            updatedAt: '2023-05-07T09:45:00Z'
          }
        ];
        
        setWorkflows(mockWorkflows);
        setError(null);
      } catch (err) {
        console.error('Error fetching workflows:', err);
        setError('Failed to load workflows. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkflows();
  }, []);
  
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
