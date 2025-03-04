import React, { useState } from 'react';
import { 
  Paper, Typography, Box, Stepper, Step, StepLabel, 
  StepContent, StepButton, Button, Chip,
  TextField, IconButton, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

/**
 * Component to display workflow steps in a stepper/timeline layout
 * 
 * @param {Object} props - Component props
 * @param {Array} props.steps - Workflow steps array
 * @param {boolean} props.isEditing - Whether the workflow is in edit mode
 * @param {string} props.workflowId - ID of the parent workflow
 * @param {string} props.workflowStatus - Status of the parent workflow
 */
export default function WorkflowStepsList({ steps, isEditing, workflowId, workflowStatus }) {
  const [editingStepId, setEditingStepId] = useState(null);
  const [editedStep, setEditedStep] = useState({});
  
  if (!steps || steps.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">
          No steps defined for this workflow.
          {workflowStatus === 'draft' && ' Add steps to get started.'}
        </Typography>
      </Paper>
    );
  }
  
  // Get step status icon
  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'in_progress':
        return <PlayArrowIcon color="primary" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };
  
  // Get step status color
  const getStepColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'failed': return 'error';
      default: return 'default';
    }
  };
  
  // Find active step index (first incomplete step)
  const activeStepIndex = steps.findIndex(step => 
    step.status !== 'completed' && step.status !== 'failed'
  );
  
  // Start editing a step
  const handleStartEditing = (step) => {
    setEditingStepId(step.id);
    setEditedStep({ ...step });
  };
  
  // Save edited step
  const handleSaveStep = async (stepId) => {
    // This would typically save to the API
    console.log('Saving step:', editedStep);
    // Reset editing state
    setEditingStepId(null);
    setEditedStep({});
  };
  
  // Cancel editing
  const handleCancelEditing = () => {
    setEditingStepId(null);
    setEditedStep({});
  };
  
  return (
    <Stepper orientation="vertical" nonLinear activeStep={activeStepIndex}>
      {steps.map((step, index) => (
        <Step key={step.id || index} completed={step.status === 'completed'}>
          <StepButton onClick={() => {}} disabled={!isEditing && workflowStatus !== 'draft'}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getStepIcon(step.status)}
                <Typography sx={{ ml: 1 }} variant="subtitle1">
                  {step.name}
                </Typography>
              </Box>
              
              <Box>
                <Chip 
                  label={step.status} 
                  color={getStepColor(step.status)} 
                  size="small"
                  sx={{ mr: 1 }}
                />
                
                {workflowStatus === 'draft' && !isEditing && editingStepId !== step.id && (
                  <IconButton size="small" onClick={() => handleStartEditing(step)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
          </StepButton>
          
          <StepContent>
            {editingStepId === step.id ? (
              // Editing mode
              <Box sx={{ mt: 2, mb: 1 }}>
                <TextField
                  fullWidth
                  label="Step Name"
                  value={editedStep.name || ''}
                  onChange={(e) => setEditedStep({ ...editedStep, name: e.target.value })}
                  margin="normal"
                  size="small"
                />
                
                <TextField
                  fullWidth
                  label="Description"
                  value={editedStep.description || ''}
                  onChange={(e) => setEditedStep({ ...editedStep, description: e.target.value })}
                  margin="normal"
                  size="small"
                  multiline
                  rows={2}
                />
                
                <FormControl fullWidth margin="normal" size="small">
                  <InputLabel id="step-status-label">Status</InputLabel>
                  <Select
                    labelId="step-status-label"
                    value={editedStep.status || 'pending'}
                    label="Status"
                    onChange={(e) => setEditedStep({ ...editedStep, status: e.target.value })}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button onClick={handleCancelEditing} sx={{ mr: 1 }}>Cancel</Button>
                  <Button 
                    variant="contained" 
                    startIcon={<SaveIcon />}
                    onClick={() => handleSaveStep(step.id)}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              // View mode
              <>
                {step.description && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
                    {step.description}
                  </Typography>
                )}
                
                {step.agentId && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Assigned to:</strong> Agent {step.agentId}
                  </Typography>
                )}
                
                {step.dependencies && step.dependencies.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Dependencies:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {step.dependencies.map(depId => {
                        const depStep = steps.find(s => s.id === depId);
                        return (
                          <Chip 
                            key={depId}
                            label={depStep ? depStep.name : `Step ${depId}`}
                            size="small"
                            variant="outlined"
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
                
                {step.output && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Output:</strong>
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: 'background.default' }}>
                      <Typography variant="body2" component="pre" sx={{ 
                        fontFamily: 'monospace', 
                        overflow: 'auto',
                        maxHeight: 200
                      }}>
                        {typeof step.output === 'object' 
                          ? JSON.stringify(step.output, null, 2) 
                          : String(step.output)
                        }
                      </Typography>
                    </Paper>
                  </Box>
                )}
                
                {workflowStatus === 'active' && step.status === 'pending' && (
                  <Box sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      size="small"
                      startIcon={<PlayArrowIcon />}
                    >
                      Start Step
                    </Button>
                  </Box>
                )}
              </>
            )}
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );
}
