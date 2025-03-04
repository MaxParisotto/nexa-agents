const express = require('express');
const router = express.Router();
const settingsService = require('../../services/settingsService');

// Get all tools
router.get('/', async (req, res) => {
  try {
    const settings = settingsService.getSettings();
    // Return tools from settings if available, otherwise return empty array
    res.json(settings.tools?.items || []);
  } catch (error) {
    console.error('Error retrieving tools:', error);
    res.status(500).json({ error: 'Failed to retrieve tools' });
  }
});

// Create a new tool
router.post('/', async (req, res) => {
  try {
    const settings = settingsService.getSettings();
    const newTool = {
      id: `tool-${Date.now()}`,
      ...req.body
    };
    
    // Add tool to settings
    const updatedSettings = {
      ...settings,
      tools: {
        ...settings.tools,
        items: [...(settings.tools?.items || []), newTool]
      }
    };
    
    settingsService.updateSettings(updatedSettings);
    res.status(201).json(newTool);
  } catch (error) {
    console.error('Error creating tool:', error);
    res.status(500).json({ error: 'Failed to create tool' });
  }
});

// Update a tool
router.put('/:id', async (req, res) => {
  try {
    const toolId = req.params.id;
    const settings = settingsService.getSettings();
    
    // Find the tool
    const toolIndex = (settings.tools?.items || []).findIndex(tool => tool.id === toolId);
    if (toolIndex === -1) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    // Update the tool
    const updatedTool = {
      ...settings.tools.items[toolIndex],
      ...req.body,
      id: toolId // Ensure ID doesn't change
    };
    
    const updatedItems = [...settings.tools.items];
    updatedItems[toolIndex] = updatedTool;
    
    const updatedSettings = {
      ...settings,
      tools: {
        ...settings.tools,
        items: updatedItems
      }
    };
    
    settingsService.updateSettings(updatedSettings);
    res.json(updatedTool);
  } catch (error) {
    console.error('Error updating tool:', error);
    res.status(500).json({ error: 'Failed to update tool' });
  }
});

// Delete a tool
router.delete('/:id', async (req, res) => {
  try {
    const toolId = req.params.id;
    const settings = settingsService.getSettings();
    
    // Filter out the tool to delete
    const updatedItems = (settings.tools?.items || []).filter(tool => tool.id !== toolId);
    
    const updatedSettings = {
      ...settings,
      tools: {
        ...settings.tools,
        items: updatedItems
      }
    };
    
    settingsService.updateSettings(updatedSettings);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({ error: 'Failed to delete tool' });
  }
});

module.exports = router;
