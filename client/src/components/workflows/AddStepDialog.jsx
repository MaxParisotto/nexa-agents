import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Typography, Grid, Chip, Box, FormHelperText
} from '@mui/material';

/**
 * Add Step Dialog Component for adding new steps to a workflow
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Handler for dialog close
 * @param {Function} props.onAddStep - Handler for adding a new step
 * @param {Array} props.existingSteps - Existing steps in the workflow
 * @param {Array} props.agents - Available agents for assignment
 */
export default function AddStepDialog({ open, onClose, onAddStep, existingSteps = [], agents = [] }) {
  const [step, setStep] = useState({
    name: '',
    description: '',
    status: 'pending',
    dependencies: [],
    agentId: ''
  });
  const [errors, setErrors] = useState({});
  
  // Reset form state when dialog is opened
  React.useEffect(() => {
    if (open) {
      setStep({
        name: '',
        description: '',
        status: 'pending',
        dependencies: [],
        agentId: ''
      });
      setErrors({});
    }
  }, [open]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setStep(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Handle adding/removing dependencies
  const handleDependencyChange = (e) => {
    setStep(prev => ({
      ...prev,
      dependencies: e.target.value
    }));
  };
  
  // Submit handler
  const handleSubmit = () => {
    // Validate form
    const newErrors = {};
    
    if (!step.name.trim()) {
      newErrors.name = 'Step name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Add step
    onAddStep({
      ...step,
      id: `step-${Date.now()}` // Temporary ID for client-side usage
    });
    
    // Close dialog
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Add Workflow Step</DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Step Name"
              value={step.name}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
              autoFocus
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Description"
              value={step.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={step.status}
                label="Status"
                onChange={handleChange}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="agent-label">Assign Agent (Optional)</InputLabel>
              <Select
                labelId="agent-label"
                name="agentId"
                value={step.agentId}
                label="Assign Agent (Optional)"
                onChange={handleChange}
              >
                <MenuItem value="">None</MenuItem>
                {agents.map(agent => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {existingSteps.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="dependencies-label">Dependencies (Optional)</InputLabel>
                <Select
                  labelId="dependencies-label"
                  name="dependencies"
                  multiple
                  value={step.dependencies}
                  onChange={handleDependencyChange}
                  label="Dependencies (Optional)"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const dependentStep = existingSteps.find(s => s.id === value);
                        return (
                          <Chip 
                            key={value} 
                            label={dependentStep ? dependentStep.name : value} 
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {existingSteps.map((existingStep) => (
                    <MenuItem 
                      key={existingStep.id} 
                      value={existingStep.id}
                      disabled={existingStep.status === 'failed'}
                    >
                      {existingStep.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  This step will start after selected steps are completed
                </FormHelperText>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="textSecondary" sx={{ flexGrow: 1 }}>
          *Required fields
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSubmit}
        >
          Add Step
        </Button>
      </DialogActions>
    </Dialog>
  );
}
