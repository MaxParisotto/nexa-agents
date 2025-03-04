const express = require('express');
const router = express.Router();
const workflowsService = require('../../services/workflowsService');

// Get all workflows
router.get('/', async (req, res) => {
  try {
    const workflows = workflowsService.getAllWorkflows();
    res.json(workflows);
  } catch (error) {
    console.error('Error retrieving workflows:', error);
    res.status(500).json({ error: 'Failed to retrieve workflows' });
  }
});

// Get workflow by ID
router.get('/:id', async (req, res) => {
  try {
    const workflow = workflowsService.getWorkflowById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    console.error(`Error retrieving workflow ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve workflow' });
  }
});

// Create new workflow
router.post('/', async (req, res) => {
  try {
    const newWorkflow = workflowsService.createWorkflow(req.body);
    res.status(201).json(newWorkflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update workflow
router.put('/:id', async (req, res) => {
  try {
    const updatedWorkflow = workflowsService.updateWorkflow(req.params.id, req.body);
    res.json(updatedWorkflow);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error(`Error updating workflow ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    const deletedWorkflow = workflowsService.deleteWorkflow(req.params.id);
    res.json(deletedWorkflow);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error(`Error deleting workflow ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Add step to workflow
router.post('/:id/steps', async (req, res) => {
  try {
    const newStep = workflowsService.addWorkflowStep(req.params.id, req.body);
    res.status(201).json(newStep);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error(`Error adding step to workflow ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to add workflow step' });
  }
});

// Update workflow step
router.put('/:id/steps/:stepId', async (req, res) => {
  try {
    const updatedStep = workflowsService.updateWorkflowStep(req.params.id, req.params.stepId, req.body);
    res.json(updatedStep);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error(`Error updating step ${req.params.stepId} in workflow ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
});

module.exports = router;