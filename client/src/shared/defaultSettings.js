/**
 * Default application settings
 * This file contains the default settings used when no settings are available
 * from the backend or local storage.
 */

export const DEFAULT_SETTINGS = {
  agents: {
    items: [
      {
        id: 'agent-project-manager',
        name: 'Project Manager',
        description: 'Advanced agent that can help create and manage other agents, tools, and the environment',
        providerId: 'provider-ollama',
        model: 'llama3:8b',
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
        tools: ['web-search', 'calculator', 'weather'],
        systemPrompt: 'You are the Project Manager, an advanced AI agent with the ability to help users create and manage other agents, configure tools, and optimize the environment. You have deep knowledge of the system architecture and can respond to natural language requests for system management.',
        temperature: 0.5,
        maxTokens: 4096,
        isProjectManager: true
      },
      {
        id: 'agent-default',
        name: 'Assistant',
        description: 'General purpose assistant that can help with various tasks',
        providerId: 'provider-ollama',
        model: 'llama3:8b',
        enabled: true,
        personality: 'Helpful, friendly, and concise',
        directives: [
          'Answer questions accurately and truthfully',
          'Provide helpful information',
          'Be respectful and professional'
        ],
        hierarchyLevel: 1,
        tools: ['web-search', 'calculator', 'weather'],
        systemPrompt: 'You are a helpful assistant that provides accurate and concise information.',
        temperature: 0.7,
        maxTokens: 2048
      }
    ],
    hierarchyLevels: [
      { id: 1, name: 'Assistant' },
      { id: 2, name: 'Specialist' },
      { id: 3, name: 'Expert' },
      { id: 4, name: 'Manager' }
    ]
  },
  tools: {
    items: [
      {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the web for information',
        enabled: true,
        category: 'information',
        parameters: [
          {
            name: 'query',
            type: 'string',
            required: true,
            description: 'Search query'
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            default: 5,
            description: 'Maximum number of results'
          }
        ]
      },
      {
        id: 'calculator',
        name: 'Calculator',
        description: 'Perform mathematical calculations',
        enabled: true,
        category: 'utility',
        parameters: [
          {
            name: 'expression',
            type: 'string',
            required: true,
            description: 'Mathematical expression to evaluate'
          }
        ]
      },
      {
        id: 'weather',
        name: 'Weather',
        description: 'Get weather information for a location',
        enabled: true,
        category: 'information',
        parameters: [
          {
            name: 'location',
            type: 'string',
            required: true,
            description: 'Location (city, country, etc.)'
          },
          {
            name: 'units',
            type: 'string',
            required: false,
            default: 'metric',
            description: 'Units (metric or imperial)'
          }
        ]
      }
    ],
    categories: [
      { id: 'information', name: 'Information Retrieval' },
      { id: 'utility', name: 'Utility' },
      { id: 'communication', name: 'Communication' },
      { id: 'productivity', name: 'Productivity' },
      { id: 'development', name: 'Development' }
    ]
  },
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
      models: ['llama3:8b', 'mixtral:8x7b', 'phi3:mini'],
      defaultModel: 'llama3:8b',
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
      models: ['llama3-8b-11', 'phi-3-mini-4k-instruct'],
      defaultModel: 'llama3-8b-11',
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7,
      maxTokens: 2048
    }
  ],
  uplink: {
    enabled: false,
    port: 3003,
    host: '0.0.0.0',
    requireApiKey: true,
    apiKey: '',
    allowedOrigins: ['*'],
    corsEnabled: true,
    rateLimit: 100,
    logLevel: 'info',
    schema: {
      name: 'Nexa LLM API',
      description: 'Access to local LLM models via WebSocket API',
      version: '1.0.0',
      exposeLlmModels: true,
      exposeMetadata: true,
    },
    availableProviders: []
  },
  benchmark: {
    saveResults: true,
    repetitions: 3,
    categories: ['reasoning', 'factual', 'coding', 'creativity', 'math'],
    defaultModels: []
  },
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
