/**
 * Tool management routes
 */
const express = require('express');
const router = express.Router();
const toolService = require('../../services/toolService');
const logger = require('../../utils/logger');

// Get all tools
router.get('/', (req, res) => {
  try {
    const tools = toolService.getTools();
    res.json(tools);
  } catch (error) {
    logger.error('Error getting tools:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new tool
router.post('/', async (req, res) => {
  try {
    const tool = await toolService.createTool(req.body);
    res.status(201).json(tool);
  } catch (error) {
    logger.error('Error creating tool:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update a tool
router.put('/:id', async (req, res) => {
  try {
    const tool = await toolService.updateTool(req.params.id, req.body);
    res.json(tool);
  } catch (error) {
    logger.error('Error updating tool:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete a tool
router.delete('/:id', async (req, res) => {
  try {
    await toolService.deleteTool(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting tool:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get tool by ID
router.get('/:id', (req, res) => {
  try {
    const tool = toolService.getTool(req.params.id);
    if (!tool) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    res.json(tool);
  } catch (error) {
    logger.error('Error getting tool:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
