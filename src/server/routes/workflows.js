import express from 'express';
import workflowModel from '../models/Workflow.js';

const router = express.Router();

/**
 * Get all workflows
 * GET /api/workflows
 */
router.get('/', async (req, res) => {
  try {
    const workflows = await workflowModel.getAll();
    res.json({ workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      error: 'Failed to fetch workflows',
      message: error.message
    });
  }
});

/**
 * Get a specific workflow by ID
 * GET /api/workflows/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const workflow = await workflowModel.getById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `No workflow with ID ${req.params.id}`
      });
    }
    
    res.json({ workflow });
  } catch (error) {
    console.error(`Error fetching workflow ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to fetch workflow',
      message: error.message
    });
  }
});

/**
 * Create a new workflow
 * POST /api/workflows
 */
router.post('/', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name) {
      return res.status(400).json({
        error: 'Invalid workflow data',
        message: 'Workflow name is required'
      });
    }
    
    const workflow = await workflowModel.create(req.body);
    res.status(201).json({ workflow, success: true });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      error: 'Failed to create workflow',
      message: error.message
    });
  }
});

/**
 * Update an existing workflow
 * PUT /api/workflows/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const workflow = await workflowModel.update(req.params.id, req.body);
    res.json({ workflow, success: true });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: error.message
      });
    }
    
    console.error(`Error updating workflow ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to update workflow',
      message: error.message
    });
  }
});

/**
 * Delete a workflow
 * DELETE /api/workflows/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await workflowModel.delete(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: error.message
      });
    }
    
    console.error(`Error deleting workflow ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to delete workflow',
      message: error.message
    });
  }
});

/**
 * Execute a workflow
 * POST /api/workflows/:id/run
 */
router.post('/:id/run', async (req, res) => {
  try {
    const workflow = await workflowModel.getById(req.params.id);
    
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `No workflow with ID ${req.params.id}`
      });
    }
    
    // In a real implementation, this would execute the workflow
    // For now, we'll just return a mock response
    res.json({
      success: true,
      message: `Workflow ${workflow.name} execution started`,
      executionId: `exec-${Date.now()}`,
      workflow: workflow
    });
  } catch (error) {
    console.error(`Error running workflow ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Failed to run workflow',
      message: error.message
    });
  }
});

export default router;
