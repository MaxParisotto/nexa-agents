import EventEmitter from '../utils/EventEmitter';
import store from '../store';
import { logInfo, logError, logDebug, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';
import { addNotification } from '../store/actions/systemActions';
import messageDeduplicator from '../utils/MessageDeduplicator';

// Simplified agent implementation to eliminate recursion issues
class ProjectManagerAgent extends EventEmitter {
  constructor() {
    super();
    console.log('🚀 Initializing ProjectManagerAgent (simplified version)');
    
    this.initialized = false;
    this.settings = null;
    this.conversationId = null;
    this.history = [];
    this.messageQueue = new Map();
    this.lastProcessedMessageId = null;
    this.initializationInProgress = false;
    this.isProcessingStoreUpdate = false; // Add flag to prevent recursion
    
    // Add logging configuration with sensible defaults
    this.loggingConfig = {
      logLevel: 'info',         // 'debug', 'info', 'warning', 'error'
      verboseModelChecks: false, // Don't log detailed model check information
      connectionCheckInterval: 60000, // 1 minute between connection checks
      lastConnectionCheck: 0,
      lastDetailedLog: {},       // Timestamp for last detailed log by category
      detailedLogThrottle: 300000, // 5 minutes between detailed logs of the same type
      logFullResponses: true,    // Whether to log full LLM responses
      maxResponseLogLength: 1000 // Max length for logged responses if not full
    };
    
    // Try to load logging preferences from localStorage
    try {
      const savedLoggingConfig = localStorage.getItem('projectManagerLoggingConfig');
      if (savedLoggingConfig) {
        this.loggingConfig = { ...this.loggingConfig, ...JSON.parse(savedLoggingConfig) };
      }
    } catch (e) {
      console.error('Error loading logging config:', e);
    }
    
    // Load cached settings
    try {
      const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
      if (cachedSettings) {
        this.settings = cachedSettings;
        this.log('debug', 'Loaded cached settings');
      }
    } catch (e) {
      console.error('Error loading cached settings:', e);
    }

    // Create default settings if needed
    if (!this.settings) {
      this.settings = {
        apiUrl: 'http://localhost:1234',
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
      };
      this.log('debug', 'Using default settings');
    }
    
    // Safe subscription to Redux store
    // We add throttling to prevent infinite recursion
    let lastStoreUpdateTime = 0;
    const THROTTLE_TIME = 200; // Minimum ms between updates
    
    store.subscribe(() => {
      const now = Date.now();
      // Skip if another store update is being processed or if updating too frequently
      if (this.isProcessingStoreUpdate || (now - lastStoreUpdateTime < THROTTLE_TIME)) {
        return;
      }
      
      try {
        this.isProcessingStoreUpdate = true;
        lastStoreUpdateTime = now;
        
        const state = store.getState();
        const newSettings = state.settings?.projectManager;
        
        // Only process if we have settings and we're not initializing
        if (newSettings && !this.initializationInProgress) {
          // Simple check to avoid unnecessary updates
          const currentApiUrl = this.settings?.apiUrl;
          const currentModel = this.settings?.model;
          const currentServerType = this.settings?.serverType;
          
          const newApiUrl = newSettings.apiUrl;
          const newModel = newSettings.model;
          const newServerType = newSettings.serverType;
          
          // Only update if something meaningful changed
          if (currentApiUrl !== newApiUrl || 
              currentModel !== newModel || 
              currentServerType !== newServerType) {
            
            this.log('debug', 'Updating settings from Redux store');
            
            // Update settings in a safe way
            this.settings = {
              apiUrl: newApiUrl || 'http://localhost:1234',
              model: newModel || 'qwen2.5-7b-instruct-1m',
              serverType: newServerType || 'lmStudio',
              parameters: {
                ...this.settings?.parameters,
                ...newSettings.parameters
              }
            };
            
            // Cache the new settings
            try {
              sessionStorage.setItem('projectManagerSettings', JSON.stringify(this.settings));
            } catch (e) {
              console.error('Error caching settings:', e);
            }
          }
        }
      } finally {
        this.isProcessingStoreUpdate = false;
      }
    });
    
    // Load history once at initialization
    try {
      const savedHistory = localStorage.getItem('projectManagerHistory');
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
        this.log('debug', `Loaded conversation history, entries: ${this.history.length}`);
      }
    } catch (error) {
      console.error('Failed to parse saved project manager history:', error);
      this.history = [];
    }
    
    this.log('info', 'ProjectManagerAgent initialized successfully');
  }
  
  /**
   * Controlled logging with throttling for repetitive messages
   * @param {string} level - Log level (debug, info, warning, error)
   * @param {string} message - Message to log
   * @param {object} data - Optional data to include
   * @param {string} category - Optional category for throttling
   */
  log(level, message, data = null, category = null) {
    // Skip logging based on configured level
    if (!this.shouldLog(level)) {
      return;
    }
    
    // Auto-categorize common message types if no category was provided
    if (!category) {
      // Model availability and connection messages
      if (message.includes('Model') && message.includes('available in LM Studio')) {
        category = 'model-available';
      } else if (message.includes('LM Studio connection successful')) {
        category = 'connection-success';
      } 
      // Settings and configuration messages
      else if (message.includes('Current settings to check')) {
        category = 'settings-check';
      } else if (message.includes('Checking LLM configuration')) {
        category = 'llm-config-check';
      } else if (message.includes('Settings changed, rechecking')) {
        category = 'llm-config-check';
      } else if (message.includes('Testing connection to')) {
        category = 'connection-test';
      } else if (message.includes('Cached validated') || message.includes('validated settings')) {
        category = 'cached-settings';
      }
      // API interaction messages
      else if (message.includes('Making API request')) {
        category = 'api-request';
      } else if (message.includes('Models endpoint working')) {
        category = 'model-list';
      } else if (message.includes('Sending request to')) {
        category = 'api-request';
      }
    }
    
    // Check for duplicate/spammy messages with the determined category
    if (category && !messageDeduplicator.shouldLog(category, message, data)) {
      return; // Skip duplicate messages
    }
    
    // Process data for specific message categories
    if (category === 'connection-success' && data && typeof data === 'object' && data.models) {
      // For connection success, only log a summary of the data
      if (Array.isArray(data.models)) {
        data = { 
          success: data.success,
          modelCount: data.models.length,
          models: data.models.length > 5 ? 
            [...data.models.slice(0, 5), `...and ${data.models.length - 5} more`] : 
            data.models
        };
      }
    } else if (category === 'settings-check' && data && typeof data === 'object') {
      // For settings checks, only log essential info
      data = {
        lmStudio: {
          apiUrl: data.lmStudio?.apiUrl,
          defaultModel: data.lmStudio?.defaultModel,
          modelCount: Array.isArray(data.lmStudio?.models) ? data.lmStudio.models.length : 0
        },
        ollama: {
          apiUrl: data.ollama?.apiUrl,
          defaultModel: data.ollama?.defaultModel,
          modelCount: Array.isArray(data.ollama?.models) ? data.ollama.models.length : 0
        },
        projectManager: {
          serverType: data.projectManager?.serverType,
          model: data.projectManager?.model,
          apiUrl: data.projectManager?.apiUrl
        }
      };
    }
    
    // For categorized logs, implement throttling
    if (category) {
      const now = Date.now();
      const lastLog = this.loggingConfig.lastDetailedLog[category] || 0;
      const throttleTime = this.loggingConfig.detailedLogThrottle;
      
      // Skip if we've logged this category recently
      if (now - lastLog < throttleTime) {
        return;
      }
      
      // Update the timestamp for this category
      this.loggingConfig.lastDetailedLog[category] = now;
    }
    
    // If data is too large, truncate it
    let logData = data;
    if (data && typeof data === 'object') {
      try {
        const jsonString = JSON.stringify(data);
        if (jsonString.length > 200) {
          // Create a simplified version with fewer details
          if (Array.isArray(data)) {
            logData = `Array with ${data.length} items`;
          } else {
            logData = `${Object.keys(data).length} properties`;
          }
        }
      } catch (e) {
        logData = "[Object cannot be stringified]";
      }
    }
    
    // Log to Redux store based on level
    switch (level) {
      case 'debug':
        store.dispatch(logDebug(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, logData));
        break;
      case 'info':
        store.dispatch(logInfo(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, logData));
        break;
      case 'warning':
        store.dispatch(logWarning(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, logData));
        break;
      case 'error':
        store.dispatch(logError(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, logData));
        break;
    }
  }
  
  /**
   * Check if a message at the given log level should be logged
   */
  shouldLog(level) {
    const levels = {
      'debug': 0,
      'info': 1,
      'warning': 2,
      'error': 3
    };
    
    const configuredLevel = levels[this.loggingConfig.logLevel] || 1;
    const messageLevel = levels[level] || 1;
    
    return messageLevel >= configuredLevel;
  }
  
  /**
   * Check connection only if enough time has passed since last check
   */
  shouldCheckConnection() {
    const now = Date.now();
    if (now - this.loggingConfig.lastConnectionCheck >= this.loggingConfig.connectionCheckInterval) {
      this.loggingConfig.lastConnectionCheck = now;
      return true;
    }
    return false;
  }
  
  /**
   * Initialize the agent with settings and restore state
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }
    
    if (this.initializationInProgress) {
      return false;
    }
    
    this.initializationInProgress = true;
    
    try {
      this.log('info', 'Initializing ProjectManagerAgent');
      
      // Simple validation check
      if (this.settings && this.settings.apiUrl && this.settings.model) {
        this.initialized = true;
        this.log('info', 'ProjectManagerAgent initialized successfully');
        return true;
      } else {
        this.log('error', 'Invalid settings for ProjectManagerAgent');
        return false;
      }
    } catch (error) {
      this.log('error', 'Error initializing ProjectManagerAgent', error);
      return false;
    } finally {
      this.initializationInProgress = false;
    }
  }
  
  // Minimal implementation of required methods to prevent errors
  async handleMessage(event) {
    console.log('📱 Message received:', event);
    
    if (!event.detail?.message) {
      return;
    }
    
    // Simplified message handling
    if (event.detail.message === '__initialize__') {
      const success = await this.initialize();
      this.emitMessage(
        success ? 'Initialization successful' : 'Initialization failed',
        { 
          messageId: event.detail.messageId,
          isError: !success
        }
      );
    } else {
      // Echo message back for now
      this.emitMessage(
        `I received: ${event.detail.message.substring(0, 100)}...`,
        {
          messageId: event.detail.messageId
        }
      );
    }
  }
  
  /**
   * Process and log LLM response, ensuring we capture the full content
   * @param {Object} response - The LLM response object
   * @param {String} source - Source of the response (e.g., 'lmStudio', 'ollama')
   */
  logLLMResponse(response, source = 'LLM') {
    // Skip if we're not logging at info level
    if (!this.shouldLog('info')) {
      return;
    }
    
    try {
      let content = null;
      let contentPreview = null;
      
      // Extract content based on different response formats
      if (response?.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content;
      } else if (response?.content) {
        content = response.content;
      } else if (typeof response === 'string') {
        content = response;
      } else if (response?.message) {
        content = response.message;
      }
      
      if (!content) {
        this.log('warning', `Received ${source} response with no extractable content`, response);
        return;
      }
      
      // Create a safe preview for the console
      contentPreview = content.length > 50 ? 
        content.substring(0, 50) + '...' : 
        content;
      
      // Log the response
      if (this.loggingConfig.logFullResponses) {
        // Log full response
        this.log('info', `${source} response received`, { 
          content, 
          contentPreview,
          timestamp: new Date().toISOString()
        });
      } else {
        // Log just a preview to save space
        const maxLength = this.loggingConfig.maxResponseLogLength;
        const truncatedContent = content.length > maxLength ? 
          content.substring(0, maxLength) + `... [truncated, full length: ${content.length}]` : 
          content;
          
        this.log('info', `${source} response received`, { 
          contentPreview: truncatedContent,
          fullLength: content.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      this.log('error', `Error logging ${source} response`, error);
    }
  }
  
  /**
   * Handle response from LLM API
   * @param {Object} response - The raw API response
   * @param {String} serverType - 'lmStudio' or 'ollama'
   */
  handleLLMResponse(response, serverType) {
    try {
      this.log('info', `Received response from ${serverType} API, status: ${response.status || 'unknown'}`);
      
      // Log the full response content
      this.logLLMResponse(response.data, serverType);
      
      // Extract content for emitting a message
      let content = null;
      if (response?.data?.choices?.[0]?.message?.content) {
        content = response.data.choices[0].message.content;
      } else if (response?.data?.content) {
        content = response.data.content;
      } else if (typeof response.data === 'string') {
        content = response.data;
      }
      
      if (content) {
        // Emit the message to be displayed in the UI
        this.emitMessage(content);
      } else {
        this.log('warning', `Couldn't extract content from ${serverType} response`, response.data);
        // Fix: Escape the apostrophe in the string
        this.emitMessage('Received a response but couldn\'t extract content.');
      }
    } catch (error) {
      this.log('error', `Error handling ${serverType} response`, error);
      this.emitMessage('Error processing response from AI model.');
    }
  }
  
  emitMessage(content, options = {}) {
    const messageId = options.messageId || `msg-${Date.now()}`;
    const timestamp = options.timestamp || new Date().toISOString();
    
    // Log the emitted message with full content
    this.log('info', 'Sending message to chat', { 
      content, 
      contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      messageId,
      timestamp
    });
    
    const event = new CustomEvent('project-manager-message', {
      detail: {
        content: content,
        messageId: messageId,
        timestamp: timestamp,
        isError: !!options.isError
      }
    });
    
    window.dispatchEvent(event);
  }
  
  destroy() {
    // Cleanup logic
  }
}

// Create and export singleton instance
const projectManagerAgent = new ProjectManagerAgent();
export default projectManagerAgent;
