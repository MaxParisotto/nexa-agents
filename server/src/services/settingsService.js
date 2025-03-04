/**
 * Settings Service - Handles application settings
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Config files
const DATA_DIR = path.join(__dirname, '../../../data');
const CONFIG_DIR = path.join(__dirname, '../../../config');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  llmProviders: [
    {
      id: 'provider-lmstudio',
      name: 'LM Studio',
      type: 'lmstudio',
      apiKey: '',
      baseUrl: 'http://localhost:1234/v1',
      models: ['qwen2.5-7b-instruct-1m'],
      defaultModel: 'qwen2.5-7b-instruct-1m',
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7
    },
    {
      id: 'provider-ollama',
      name: 'Ollama',
      type: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      models: ['deepseek-r1:1.5b'],
      defaultModel: 'deepseek-r1:1.5b',
      enabled: false,
      contextWindow: 4096,
      temperature: 0.7
    }
  ],
  agents: {
    items: [
      {
        id: 'agent-project-manager',
        name: 'Project Manager',
        description: 'Advanced agent that can help create and manage other agents, tools, and the environment',
        providerId: 'provider-lmstudio',
        model: 'qwen2.5-7b-instruct-1m',
        enabled: true,
        personality: 'Professional, efficient, and proactive',
        directives: [
          'Help users create and manage AI agents',
          'Assist with tool configuration and management',
          'Provide guidance on environment setup and optimization',
          'Respond to natural language requests for system management',
          'Maintain a comprehensive understanding of the system architecture'
        ],
        hierarchyLevel: 4,
        tools: ['web-search', 'calculator', 'weather', 'tool-code-analyzer'],
        systemPrompt: 'You are the Project Manager, an advanced AI agent with the ability to help users create and manage other agents, configure tools, and optimize the environment. You have deep knowledge of the system architecture and can respond to natural language requests for system management.',
        temperature: 0.7,
        maxTokens: 4096,
        isProjectManager: true
      }
    ]
  },
  features: {
    enableFileUploads: false,
    enableVoiceInput: false,
    chatWidget: true,
    projectManagerAgent: true,
    taskManagement: true,
    loggingSystem: true,
    notifications: true,
    metrics: true,
    autoSave: true,
    debugMode: true,
    experimentalFeatures: true
  },
  projectManager: {
    apiUrl: 'http://localhost:1234/v1',
    model: 'qwen2.5-7b-instruct-1m',
    serverType: 'lmStudio',
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      maxTokens: 1024,
      contextLength: 4096
    }
  }
};

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

class SettingsService {
  constructor() {
    this.settings = null;
    this.initializeSettings();
  }

  initializeSettings() {
    try {
      // Create settings file if it doesn't exist
      if (!fs.existsSync(SETTINGS_FILE)) {
        const dirPath = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
        logger.info('Created default settings file');
      }

      // Load settings
      const settingsData = fs.readFileSync(SETTINGS_FILE, 'utf8');
      this.settings = JSON.parse(settingsData);
      logger.info('Settings loaded successfully');
    } catch (error) {
      logger.error('Error initializing settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  getSettings() {
    if (!this.settings) {
      this.initializeSettings();
    }
    return this.settings;
  }

  updateSettings(newSettings) {
    try {
      // Merge with existing settings
      this.settings = {
        ...this.settings,
        ...newSettings
      };

      // Save to file
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      logger.info('Settings updated successfully');
      return this.settings;
    } catch (error) {
      logger.error('Error updating settings:', error);
      throw error;
    }
  }

  getProjectManagerConfig() {
    const settings = this.getSettings();
    return settings.projectManager;
  }

  updateProjectManagerConfig(config) {
    try {
      const settings = this.getSettings();
      settings.projectManager = {
        ...settings.projectManager,
        ...config
      };
      return this.updateSettings(settings);
    } catch (error) {
      logger.error('Error updating Project Manager config:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SettingsService();