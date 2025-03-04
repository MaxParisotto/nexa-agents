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
  theme: {
    darkMode: false,
    accentColor: '#4a76a8'
  },
  api: {
    lmStudio: {
      apiUrl: 'http://localhost:1234',
      apiKey: '',
      defaultModel: 'unknown'
    },
    ollama: {
      apiUrl: 'http://localhost:11434',
      defaultModel: 'llama2'
    },
  },
  notifications: {
    enabled: true,
    sound: true
  },
  system: {
    autoSave: true,
    loggingLevel: 'info',
    metricsEnabled: true
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  features: {
    projectManagerAgent: true,
    workflowAgent: false,
    codeAgent: false
  },
  projectManager: {
    enabled: true,
    systemPrompt: `You are a Project Manager AI assistant. Your role is to help users with:
- Project creation and management
- Task creation, assignment and tracking
- Workflow setup and optimization
- Team coordination and communication
- Progress monitoring and reporting

When responding:
- Be professional but friendly
- Ask clarifying questions when needed
- Provide actionable next steps
- Reference specific projects/tasks when possible
- Suggest improvements and best practices

Keep track of:
- Active projects and their status
- Outstanding tasks and priorities
- Team member assignments
- Important deadlines
- Project dependencies

Your goal is to help users effectively manage their projects while maintaining clear communication and organization.`,
    model: 'default',
    temperature: 0.7,
    maxTokens: 1000
  },
  llm: {
    provider: 'lmstudio', // or 'ollama'
    lmstudio: {
      endpoint: 'http://localhost:1234/v1',
      apiKey: ''
    },
    ollama: {
      endpoint: 'http://localhost:11434',
      model: 'llama2'
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