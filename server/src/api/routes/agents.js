const express = require('express');
const router = express.Router();
const agentsService = require('../../services/agentsService');
const logger = require('../../utils/logger').createLogger('agents');

// Get all agents
router.get('/', async (req, res) => {
  try {
    const agents = agentsService.getAllAgents();
    res.json(agents);
  } catch (error) {
    logger.error('Error retrieving agents:', error);
    res.status(500).json({ error: 'Failed to retrieve agents' });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const agent = agentsService.getAgentById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    logger.error(`Error retrieving agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve agent' });
  }
});

// Create new agent
router.post('/', async (req, res) => {
  try {
    const newAgent = agentsService.createAgent(req.body);
    res.status(201).json(newAgent);
  } catch (error) {
    logger.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  try {
    const updatedAgent = agentsService.updateAgent(req.params.id, req.body);
    res.json(updatedAgent);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Error updating agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const deletedAgent = agentsService.deleteAgent(req.params.id);
    res.json(deletedAgent);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Error deleting agent ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Update agent status
router.patch('/:id/status', async (req, res) => {
  try {
    if (!req.body.status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const updatedAgent = agentsService.updateAgentStatus(req.params.id, req.body.status);
    res.json(updatedAgent);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Error updating agent status ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update agent status' });
  }
});

module.exports = router;
