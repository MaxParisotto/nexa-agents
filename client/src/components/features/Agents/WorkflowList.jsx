import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Divider,
  Paper,
  Chip,
  ListItemIcon,
  CircularProgress,
  Stack
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  PlayArrow as RunIcon,
  Stop as StopIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Add as AddIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { 
  listWorkflowsThunk, 
  deleteWorkflowThunk, 
  runWorkflowThunk,
  saveWorkflowThunk
} from '../../store/actions/systemActions';

/**
 * WorkflowList component for displaying and managing saved workflows
 */
const WorkflowList = ({ onWorkflowSelect, currentWorkflowId }) => {
  const dispatch = useDispatch();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newWorkflowDialogOpen, setNewWorkflowDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [importJson, setImportJson] = useState('');
  const [runningWorkflows, setRunningWorkflows] = useState({});
  
  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, []);
  
  // Load workflows from storage
  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const workflowList = await dispatch(listWorkflowsThunk());
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle workflow deletion
  const handleDeleteWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      await dispatch(deleteWorkflowThunk(selectedWorkflow.id));
      setSelectedWorkflow(null);
      loadWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
    } finally {
      setDeleteDialogOpen(false);
    }
  };
  
  // Handle workflow selection
  const handleWorkflowSelect = (workflow) => {
    if (onWorkflowSelect) {
      onWorkflowSelect(workflow);
    }
  };
  
  // Handle workflow run
  const handleRunWorkflow = async (workflow) => {
    try {
      setRunningWorkflows(prev => ({ ...prev, [workflow.id]: true }));
      await dispatch(runWorkflowThunk(workflow));
    } catch (error) {
      console.error('Error running workflow:', error);
    } finally {
      // Remove from running status after a delay to show completion
      setTimeout(() => {
        setRunningWorkflows(prev => {
          const newState = { ...prev };
          delete newState[workflow.id];
          return newState;
        });
      }, 5000);
    }
  };
  
  // Create a new empty workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName) return;
    
    const newWorkflow = {
      id: `workflow-${Date.now()}`,
      name: newWorkflowName,
      description: newWorkflowDescription,
      nodes: [],
      edges: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    
    try {
      await dispatch(saveWorkflowThunk(newWorkflow));
      loadWorkflows();
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      setNewWorkflowDialogOpen(false);
      
      // Select the new workflow
      handleWorkflowSelect(newWorkflow);
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };
  
  // Export workflow to JSON
  const handleExportWorkflow = () => {
    if (!selectedWorkflow) return;
    
    const dataStr = JSON.stringify(selectedWorkflow, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `${selectedWorkflow.name.replace(/\s+/g, '_')}_workflow.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setExportDialogOpen(false);
  };
  
  // Import workflow from JSON
  const handleImportWorkflow = async () => {
    if (!importJson) return;
    
    try {
      const workflowData = JSON.parse(importJson);
      
      // Ensure required fields
      if (!workflowData.name) {
        workflowData.name = `Imported Workflow ${new Date().toLocaleDateString()}`;
      }
      
      // Generate a new ID to avoid conflicts
      workflowData.id = `workflow-import-${Date.now()}`;
      workflowData.imported = true;
      workflowData.importDate = new Date().toISOString();
      
      await dispatch(saveWorkflowThunk(workflowData));
      loadWorkflows();
      setImportJson('');
      setImportDialogOpen(false);
      
      // Select the imported workflow
      handleWorkflowSelect(workflowData);
    } catch (error) {
      console.error('Error importing workflow:', error);
      alert('Invalid workflow JSON. Please check the format and try again.');
    }
  };
  
  // Custom component for workflow item content that avoids invalid nesting
  const WorkflowItemContent = ({ workflow }) => (
    <>
      <ListItemText 
        primary={workflow.name}
        secondary={workflow.description || 'No description'}
      />
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip 
          label={`${workflow.nodes?.length || 0} nodes`} 
          size="small" 
        />
        <Chip 
          label={`${workflow.edges?.length || 0} connections`} 
          size="small" 
        />
        {workflow.imported && (
          <Chip 
            label="Imported" 
            size="small"
            color="info"
          />
        )}
      </Box>
    </>
  );
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Saved Workflows</Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
            size="small"
            sx={{ mr: 1 }}
          >
            Import
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setNewWorkflowDialogOpen(true)}
            size="small"
            color="primary"
          >
            New
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : workflows.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No workflows saved yet. Create a new one or import an existing workflow.
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {workflows.map((workflow, index) => (
              <React.Fragment key={workflow.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem 
                  selected={currentWorkflowId === workflow.id}
                  onClick={() => handleWorkflowSelect(workflow)}
                  sx={{ 
                    cursor: 'pointer',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1.5
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    width: '100%', 
                    alignItems: 'center'
                  }}>
                    <ListItemIcon>
                      {currentWorkflowId === workflow.id ? (
                        <CheckIcon color="primary" />
                      ) : (
                        <></>
                      )}
                    </ListItemIcon>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {workflow.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {workflow.description || 'No description'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (runningWorkflows[workflow.id]) {
                            console.log('Stopping workflow:', workflow.id);
                          } else {
                            handleRunWorkflow(workflow);
                          }
                        }}
                        disabled={!workflow.nodes?.length}
                      >
                        {runningWorkflows[workflow.id] ? <StopIcon /> : <RunIcon />}
                      </IconButton>
                      
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkflow(workflow);
                          setExportDialogOpen(true);
                        }}
                      >
                        <ExportIcon />
                      </IconButton>
                      
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkflow(workflow);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 0.5, 
                    ml: 7, 
                    mt: 0.5 
                  }}>
                    <Chip 
                      label={`${workflow.nodes?.length || 0} nodes`} 
                      size="small" 
                    />
                    <Chip 
                      label={`${workflow.edges?.length || 0} connections`} 
                      size="small" 
                    />
                    {workflow.imported && (
                      <Chip 
                        label="Imported" 
                        size="small"
                        color="info"
                      />
                    )}
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedWorkflow?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteWorkflow} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
      
      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      >
        <DialogTitle>Export Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Export "{selectedWorkflow?.name}" as a JSON file?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExportWorkflow} color="primary">Export</Button>
        </DialogActions>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Import Workflow</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Paste a workflow JSON to import it:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"name": "My Workflow", "nodes": [], "edges": []}'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleImportWorkflow} 
            color="primary"
            disabled={!importJson}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* New Workflow Dialog */}
      <Dialog
        open={newWorkflowDialogOpen}
        onClose={() => setNewWorkflowDialogOpen(false)}
      >
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Workflow Name"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            margin="normal"
            autoFocus
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={newWorkflowDescription}
            onChange={(e) => setNewWorkflowDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewWorkflowDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateWorkflow} 
            color="primary"
            disabled={!newWorkflowName}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowList; 