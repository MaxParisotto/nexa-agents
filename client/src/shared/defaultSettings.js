/**
 * Default application settings
 * This file contains the default settings used when no settings are available
 * from the backend or local storage.
 */

export const DEFAULT_SETTINGS = {
  theme: {
    darkMode: true, // Default to dark mode
    primaryColor: '#4a76a8', // Primary blue color
    secondaryColor: '#ffc107', // Secondary amber color
    fontSize: 'medium', // Default font size
    fontFamily: 'Roboto, sans-serif', // Default font family
    borderRadius: 4, // Default border radius in pixels
    transition: '0.3s', // Default transition speed
    density: 'normal' // UI density
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: {
      enabled: false,
      frequency: 'daily',
      types: ['important', 'mentions', 'updates']
    },
    pushNotifications: {
      enabled: false,
      topics: ['critical', 'workflow-completed']
    }
  },
  llmProviders: [
    {
      id: 'provider-ollama',
      name: 'Ollama',
      type: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      models: [],
      defaultModel: '', // Added default model property
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7,
      maxTokens: 2048,
      topK: 40,
      topP: 0.9
    },
    {
      id: 'provider-lmstudio',
      name: 'LM Studio',
      type: 'lmstudio',
      apiKey: '',
      baseUrl: 'http://localhost:1234/v1',
      models: [],
      defaultModel: '', // Added default model property
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7,
      maxTokens: 2048
    }
  ],
  system: {
    loggingLevel: 'info',
    metrics: true,
    autoUpdate: true,
    concurrency: 3,
    experimental: false,
    developerMode: false,
    backendUrl: 'http://localhost:3001',
    analyticsSampling: 0.1, // Sample 10% of events for analytics
    caching: {
      enabled: true,
      ttl: 3600, // 1 hour
      maxSize: 100 // Max 100MB
    },
    insights: {
      enabled: true,
      shareTelemetry: false
    }
  },
  editor: {
    autosave: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: true,
    highlightCurrentLine: true,
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'monospace',
    rulers: [80, 120],
    formatOnPaste: true,
    formatOnSave: true
  },
  workflows: {
    autosave: true,
    showNodeIds: false,
    snapToGrid: true,
    gridSize: 20,
    historySize: 50, // Number of undo steps to keep
    executionDefaults: {
      timeout: 300, // 5 minutes timeout for workflow execution
      retryCount: 3,
      retryDelay: 5 // 5 seconds between retries
    }
  },
  ui: {
    animations: true,
    sidebar: {
      expanded: true,
      width: 240
    },
    lists: {
      compact: false,
      showDescriptions: true
    }
  },
  privacy: {
    allowErrorReporting: true,
    allowUsageStatistics: true
  },
  advanced: {
    debugMode: false,
    experimentalFeatures: false,
    customScripts: false
  }
};

export default DEFAULT_SETTINGS;
