/**
 * Tool Service - Handles tool management
 */
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

class ToolService {
  constructor() {
    this.logger = logger.createLogger('tool-service');
  }

  /**
   * Create a new tool
   * @param {Object} toolConfig - Tool configuration
   * @returns {Object} Created tool
   */
  async createTool(toolConfig) {
    try {
      this.logger.info('Creating new tool:', toolConfig.name);
      
      // Validate required fields
      if (!toolConfig.name || !toolConfig.description || !toolConfig.category) {
        throw new Error('Missing required fields: name, description, or category');
      }

      // Generate tool ID if not provided
      const toolId = toolConfig.id || `tool-${toolConfig.name.toLowerCase().replace(/\s+/g, '-')}`;

      // Create tool object
      const newTool = {
        id: toolId,
        name: toolConfig.name,
        description: toolConfig.description,
        category: toolConfig.category,
        enabled: toolConfig.enabled !== false,
        parameters: toolConfig.parameters || [],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      // Get current settings
      const settings = settingsService.getSettings();

      // Initialize tools array if it doesn't exist
      if (!settings.tools) {
        settings.tools = { items: [] };
      }

      // Check if tool with same ID already exists
      const existingToolIndex = settings.tools.items.findIndex(t => t.id === toolId);
      if (existingToolIndex >= 0) {
        throw new Error(`Tool with ID ${toolId} already exists`);
      }

      // Add new tool
      settings.tools.items.push(newTool);

      // Save settings
      await settingsService.updateSettings(settings);

      this.logger.info('Tool created successfully:', toolId);
      return newTool;
    } catch (error) {
      this.logger.error('Error creating tool:', error);
      throw error;
    }
  }

  /**
   * Update an existing tool
   * @param {string} toolId - Tool ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated tool
   */
  async updateTool(toolId, updates) {
    try {
      this.logger.info('Updating tool:', toolId);
      
      // Get current settings
      const settings = settingsService.getSettings();

      // Find tool index
      const toolIndex = settings.tools.items.findIndex(t => t.id === toolId);
      if (toolIndex === -1) {
        throw new Error(`Tool with ID ${toolId} not found`);
      }

      // Update tool
      settings.tools.items[toolIndex] = {
        ...settings.tools.items[toolIndex],
        ...updates,
        updated: new Date().toISOString()
      };

      // Save settings
      await settingsService.updateSettings(settings);

      this.logger.info('Tool updated successfully:', toolId);
      return settings.tools.items[toolIndex];
    } catch (error) {
      this.logger.error('Error updating tool:', error);
      throw error;
    }
  }

  /**
   * Delete a tool
   * @param {string} toolId - Tool ID to delete
   * @returns {boolean} Success status
   */
  async deleteTool(toolId) {
    try {
      this.logger.info('Deleting tool:', toolId);
      
      // Get current settings
      const settings = settingsService.getSettings();

      // Find tool index
      const toolIndex = settings.tools.items.findIndex(t => t.id === toolId);
      if (toolIndex === -1) {
        throw new Error(`Tool with ID ${toolId} not found`);
      }

      // Remove tool
      settings.tools.items.splice(toolIndex, 1);

      // Save settings
      await settingsService.updateSettings(settings);

      this.logger.info('Tool deleted successfully:', toolId);
      return true;
    } catch (error) {
      this.logger.error('Error deleting tool:', error);
      throw error;
    }
  }

  /**
   * Get all tools
   * @returns {Array} List of tools
   */
  getTools() {
    const settings = settingsService.getSettings();
    return settings.tools?.items || [];
  }

  /**
   * Get tool by ID
   * @param {string} toolId - Tool ID to find
   * @returns {Object|null} Tool if found, null otherwise
   */
  getTool(toolId) {
    const settings = settingsService.getSettings();
    return settings.tools?.items.find(t => t.id === toolId) || null;
  }
}

// Export singleton instance
module.exports = new ToolService(); 