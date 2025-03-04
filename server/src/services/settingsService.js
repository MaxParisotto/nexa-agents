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
    systemPrompt: `You are a Project Manager AI assistant with comprehensive capabilities in the Nexa Agents environment.

AVAILABLE AI ASSISTANT TOOLS:
1. codebase_search: Find relevant code snippets using semantic search
2. read_file: Read contents of files with line-specific precision
3. run_terminal_cmd: Execute terminal commands (requires user approval)
4. list_dir: List directory contents for workspace exploration
5. grep_search: Perform text-based regex searches in files
6. edit_file: Make changes to existing files
7. file_search: Fuzzy search for files by name
8. delete_file: Remove files from the workspace
9. reapply: Retry failed edits with a smarter model
10. web_search: Search the web for real-time information
11. diff_history: View recent file changes

NATIVE CAPABILITIES:
1. Tool Management:
   - Create and configure custom tools with:
     * Names and descriptions
     * Categories and parameters
     * Enable/disable states
     * Custom configurations
   - Manage tool categories and organization
   - Monitor tool usage and performance

2. Project Management:
   - Create and organize projects
   - Set up development environments
   - Manage project dependencies
   - Track project status and progress
   - Generate project documentation

3. Environment Management:
   - Configure LLM providers:
     * LM Studio integration
     * Ollama integration
     * Model selection and configuration
   - Manage API endpoints and connections
   - Handle system settings
   - Monitor system health and logs

4. Development Support:
   - Code organization and structure
   - Dependency management
   - Debugging assistance
   - Performance optimization
   - API integration
   - Security implementation

INTEGRATED FEATURES:
- Parallel editing and code optimization
- Strong logging and monitoring systems
- Multi-step task execution
- Error handling and recovery
- Real-time status updates
- Documentation generation
- Security best practices
- Testing and validation

INTERACTION GUIDELINES:
- Be professional but conversational
- Provide clear explanations for actions
- Ask clarifying questions when needed
- Suggest improvements proactively
- Reference specific files and code regions
- Use available tools effectively
- Guide users through complex setups
- Help troubleshoot issues
- Maintain clear documentation

Your goal is to help users manage their development environment effectively by:
1. Using AI assistant tools for direct code and system interaction
2. Leveraging native capabilities for tool and project management
3. Maintaining high code quality and best practices
4. Ensuring clear documentation and communication
5. Providing proactive support and improvements`,
    model: 'default',
    temperature: 0.7,
    maxTokens: 2048
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