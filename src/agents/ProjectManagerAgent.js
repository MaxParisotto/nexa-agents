import { EventEmitter } from 'events';
import store from '../store';
import { logInfo, logError, LOG_CATEGORIES } from '../store/actions/logActions';
import { addNotification } from '../store/actions/systemActions';

/**
 * ProjectManagerAgent is a persistent agent that handles project management tasks
 * and maintains its own state and conversation history.
 */
class ProjectManagerAgent extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.settings = null;
    this.conversationId = null;
    this.history = [];
    this.processingMessageId = null;
    this.messageQueue = new Map(); // Change to Map to track message states
    this.lastProcessedMessageId = null;
    this.initializationInProgress = false;
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.processMessage = this.processMessage.bind(this);
    this.validateSettings = this.validateSettings.bind(this);
    
    // Set up event listeners with bound method
    window.removeEventListener('project-manager-request', this.handleMessage);
    window.addEventListener('project-manager-request', this.handleMessage);
    
    // Log that we're setting up the event listener
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      'ProjectManagerAgent initialized and listening for messages'
    ));
    
    // Subscribe to Redux store changes
    store.subscribe(() => {
      const state = store.getState();
      const newSettings = state.settings?.projectManager;
      
      // Skip if we don't have new settings, initialization is in progress, or we're already initialized
      if (!newSettings || this.initializationInProgress || this.initialized) {
        return;
      }

      // Create settings object for comparison
      const newSettingsObj = {
        apiUrl: newSettings.apiUrl,
        model: newSettings.model,
        serverType: newSettings.serverType,
        parameters: newSettings.parameters
      };

      // Create current settings object for comparison
      const currentSettingsObj = this.settings ? {
        apiUrl: this.settings.apiUrl,
        model: this.settings.model,
        serverType: this.settings.serverType,
        parameters: this.settings.parameters
      } : null;

      // Get cached settings for comparison
      const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
      const cachedSettingsObj = cachedSettings ? {
        apiUrl: cachedSettings.apiUrl,
        model: cachedSettings.model,
        serverType: cachedSettings.serverType,
        parameters: cachedSettings.parameters
      } : null;

      // Only update if settings have actually changed from both current and cached
      const currentSettingsMatch = JSON.stringify(newSettingsObj) === JSON.stringify(currentSettingsObj);
      const cachedSettingsMatch = JSON.stringify(newSettingsObj) === JSON.stringify(cachedSettingsObj);
      
      if (!currentSettingsMatch && !cachedSettingsMatch) {
        // Create settings with defaults
        const settingsWithDefaults = {
          apiUrl: (newSettings.apiUrl || 'http://localhost:1234').replace(/\/+$/, ''),
          model: newSettings.model || 'qwen2.5-7b-instruct-1m',
          serverType: newSettings.serverType || 'lmStudio',
          parameters: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            repeatPenalty: 1.1,
            maxTokens: 1024,
            contextLength: 4096,
            ...(newSettings.parameters || {})
          }
        };
        
        // Log the settings being applied
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Updating Project Manager settings',
          { 
            oldSettings: this.settings,
            newSettings: settingsWithDefaults,
            source: 'redux'
          }
        ));
        
        // Update settings
        this.settings = settingsWithDefaults;
        
        // Cache settings immediately
        sessionStorage.setItem('projectManagerSettings', JSON.stringify(settingsWithDefaults));
        
        // Only validate if not initialized and we have required fields
        if (!this.initialized && 
            settingsWithDefaults.apiUrl && 
            settingsWithDefaults.model && 
            settingsWithDefaults.serverType) {
          this.validateSettings(settingsWithDefaults).catch(error => {
            store.dispatch(logError(
              LOG_CATEGORIES.AGENT,
              'Failed to validate new settings',
              { error: error.message, settings: settingsWithDefaults }
            ));
          });
        }
      }
    });
  }
  
  /**
   * Initialize the agent with settings and restore state
   */
  async initialize() {
    // Prevent multiple initialization attempts
    if (this.initializationInProgress) {
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Initialization already in progress',
        { inProgress: this.initializationInProgress }
      ));
      return false;
    }

    // If already initialized, just return success
    if (this.initialized) {
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Agent already initialized',
        { settings: this.settings }
      ));
      return true;
    }
    
    this.initializationInProgress = true;
    
    try {
      // Get settings from Redux store
      const state = store.getState();
      const settings = state.settings?.projectManager;
      
      // Try to get cached settings from sessionStorage as fallback
      const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
      
      // Log the settings we're trying to use
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Attempting to initialize with settings',
        { 
          reduxSettings: settings,
          cachedSettings,
          usingCached: !settings && !!cachedSettings
        }
      ));

      // Use existing settings if we have them
      if (this.settings && this.settings.apiUrl && this.settings.model && this.settings.serverType) {
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Using existing settings for initialization',
          { settings: this.settings }
        ));
      } else {
        // Determine the best server type based on available models
        let serverType = settings?.serverType || cachedSettings?.serverType || 'lmStudio';
        let apiUrl = settings?.apiUrl || cachedSettings?.apiUrl;
        
        // If no API URL is set, determine based on server type
        if (!apiUrl) {
          apiUrl = serverType === 'lmStudio' ? 'http://localhost:1234' : 'http://localhost:11434';
        }
        
        // Use Redux settings, cached settings, or defaults with proper structure
        this.settings = {
          apiUrl,
          model: settings?.model || cachedSettings?.model || 'qwen2.5-7b-instruct-1m',
          serverType,
          parameters: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            repeatPenalty: 1.1,
            maxTokens: 1024,
            contextLength: 4096,
            ...(settings?.parameters || cachedSettings?.parameters || {})
          }
        };
      }

      // Format API URL if needed
      if (!this.settings.apiUrl.startsWith('http://') && !this.settings.apiUrl.startsWith('https://')) {
        this.settings.apiUrl = `http://${this.settings.apiUrl}`;
      }
      
      // Log settings before validation
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Validating settings with serverType',
        { settings: this.settings }
      ));
      
      // Validate settings
      const validationResult = await this.validateSettings(this.settings);
      if (!validationResult.success) {
        // If validation fails, try the other server type
        const originalServerType = this.settings.serverType;
        this.settings.serverType = this.settings.serverType === 'lmStudio' ? 'ollama' : 'lmStudio';
        this.settings.apiUrl = this.settings.serverType === 'lmStudio' ? 'http://localhost:1234' : 'http://localhost:11434';
        
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          `First validation failed, trying ${this.settings.serverType}`,
          { originalServerType, newServerType: this.settings.serverType }
        ));
        
        const retryResult = await this.validateSettings(this.settings);
        if (!retryResult.success) {
          throw new Error(retryResult.error || 'Settings validation failed without specific error');
        }
        
        // Update with validated settings
        this.settings = retryResult.settings;
      } else {
        // Update with validated settings
        this.settings = validationResult.settings;
      }
      
      // Cache validated settings
      sessionStorage.setItem('projectManagerSettings', JSON.stringify(this.settings));
      
      // Restore conversation history
      try {
        const savedHistory = localStorage.getItem('projectManagerHistory');
        if (savedHistory) {
          this.history = JSON.parse(savedHistory);
        }
      } catch (parseError) {
        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Failed to parse saved history',
          { error: parseError.message }
        ));
        this.history = [];
      }
      
      // Get or generate conversation ID
      this.conversationId = localStorage.getItem('projectManagerConversationId') 
        || `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('projectManagerConversationId', this.conversationId);
      
      this.initialized = true;
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Project Manager Agent initialized successfully',
        { 
          settings: this.settings,
          validationResult,
          historyLength: this.history.length,
          conversationId: this.conversationId
        }
      ));
      
      return true;
    } catch (error) {
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Failed to initialize Project Manager Agent',
        { error: error.message }
      ));
      
      this.initialized = false;
      return false;
    } finally {
      this.initializationInProgress = false;
    }
  }
  
  /**
   * Validate agent settings
   */
  async validateSettings(settings) {
    // Basic validation
    if (!settings) {
      const error = 'No settings provided';
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Settings validation failed',
        { error }
      ));
      return { success: false, error };
    }

    // Log the settings being validated
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      'Validating settings',
      { settings }
    ));

    // Check required fields with detailed error messages
    const requiredFields = {
      serverType: 'Server type is required (e.g., "lmStudio")',
      model: 'Model name is required',
      apiUrl: 'API URL is required'
    };

    for (const [field, message] of Object.entries(requiredFields)) {
      if (!settings[field]) {
        const error = message;
        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Settings validation failed',
          { error, settings }
        ));
        return { success: false, error };
      }
    }

    try {
      // Format API URL
      let apiUrl = settings.apiUrl;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
      }
      apiUrl = apiUrl.replace(/\/+$/, '');

      // Ensure server type and URL are in sync
      if (settings.serverType === 'lmStudio' && !apiUrl.includes(':1234')) {
        settings.apiUrl = 'http://localhost:1234';
        apiUrl = settings.apiUrl;
      } else if (settings.serverType === 'ollama' && !apiUrl.includes(':11434')) {
        settings.apiUrl = 'http://localhost:11434';
        apiUrl = settings.apiUrl;
      }

      // Test connection to server with timeout
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Testing connection to LLM server',
        { apiUrl, model: settings.model }
      ));

      // Create AbortController for the entire validation process
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increase timeout to 15 seconds

      try {
        // First check if server is available
        const endpoint = settings.serverType === 'lmStudio' ? '/v1/models' : '/api/tags';
        const response = await fetch(`${apiUrl}${endpoint}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let availableModels = [];

        // Parse models based on server type
        if (settings.serverType === 'lmStudio') {
          availableModels = data.data.map(model => model.id);
        } else {
          availableModels = data.models.map(model => model.name);
        }

        // If model doesn't exist, try to find a suitable alternative
        if (!availableModels.includes(settings.model)) {
          const preferredModels = availableModels.filter(name => 
            name.toLowerCase().includes('qwen') ||
            name.toLowerCase().includes('deepseek') ||
            name.toLowerCase().includes('mistral') ||
            name.toLowerCase().includes('llama')
          );

          if (preferredModels.length > 0) {
            settings.model = preferredModels[0];
            store.dispatch(logInfo(
              LOG_CATEGORIES.AGENT,
              `Model ${settings.model} not found, using alternative: ${preferredModels[0]}`
            ));
          } else {
            settings.model = availableModels[0];
            store.dispatch(logInfo(
              LOG_CATEGORIES.AGENT,
              `Model ${settings.model} not found, using first available model: ${availableModels[0]}`
            ));
          }
        }

        // Test chat completion with a simple prompt
        const testResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful Project Manager assistant.'
              },
              {
                role: 'user',
                content: 'Hi! Please respond with a short greeting.'
              }
            ],
            temperature: 0.7,
            max_tokens: 50,
            stream: false
          }),
          signal: controller.signal
        });

        if (!testResponse.ok) {
          throw new Error(`Chat completion test failed: ${testResponse.statusText}`);
        }

        const testResult = await testResponse.json();
        if (!testResult.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from chat completion test');
        }

        // Clear the timeout since validation succeeded
        clearTimeout(timeoutId);

        // Cache validated settings with available models
        const validatedSettings = {
          ...settings,
          apiUrl,
          availableModels
        };

        // Cache the validated settings
        sessionStorage.setItem('projectManagerSettings', JSON.stringify(validatedSettings));

        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Settings validation successful',
          { settings: validatedSettings }
        ));

        return {
          success: true,
          settings: validatedSettings,
          testResponse: testResult.choices[0].message.content
        };

      } catch (error) {
        clearTimeout(timeoutId);
        throw new Error(`Connection test failed: ${error.message}`);
      }

    } catch (error) {
      const errorMessage = `Validation failed: ${error.message}`;
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        errorMessage,
        { 
          error,
          settings,
          stack: error.stack
        }
      ));
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Handle incoming messages from the UI
   */
  async handleMessage(event) {
    try {
      // Validate event has required data
      if (!event.detail?.message || !event.detail?.messageId) {
        return;
      }

      const { message, messageId, settings } = event.detail;

      // Check if message is already being handled
      if (this.messageQueue.has(messageId) || this.lastProcessedMessageId === messageId) {
        return;
      }

      // Track message state
      this.messageQueue.set(messageId, {
        status: 'processing',
        timestamp: Date.now()
      });

      // Initialize if needed (only once)
      if (!this.initialized && !this.initializationInProgress) {
        await this.initialize();
      }

      // Process message
      try {
        const chatSettings = settings ? {
          ...settings,
          serverType: settings.serverType || 'lmStudio',
          parameters: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            repeatPenalty: 1.1,
            maxTokens: 1024,
            contextLength: 4096,
            ...(settings.parameters || {})
          }
        } : this.settings;

        const response = await this.processMessage(message, messageId, chatSettings);

        // Update message state
        this.messageQueue.set(messageId, {
          status: 'completed',
          timestamp: Date.now()
        });

        // Send response
        this.emitMessage(response, {
          messageId,
          timestamp: new Date().toISOString()
        });

        // Update last processed ID
        this.lastProcessedMessageId = messageId;

        // Clean up old messages from queue (older than 5 minutes)
        this.cleanMessageQueue();

      } catch (error) {
        // Update message state to error
        this.messageQueue.set(messageId, {
          status: 'error',
          timestamp: Date.now(),
          error: error.message
        });

        throw error;
      }

    } catch (error) {
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Error handling message',
        { error: error.message }
      ));
      
      this.emitMessage(`Error: ${error.message}`, {
        messageId: event.detail?.messageId,
        timestamp: new Date().toISOString(),
        isError: true
      });
    }
  }
  
  /**
   * Clean up old messages from the queue
   */
  cleanMessageQueue() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [messageId, state] of this.messageQueue.entries()) {
      if (now - state.timestamp > maxAge) {
        this.messageQueue.delete(messageId);
      }
    }
  }
  
  /**
   * Process a message using the LLM
   */
  async processMessage(message, messageId, settings) {
    // Log start of processing
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      `Processing message ${messageId}`,
      { message: message.substring(0, 100) }
    ));

    // Format API URL
    let apiUrl = settings.apiUrl;
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `http://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/$/, '');

    try {
      // Prepare request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Message processing timed out',
          { messageId }
        ));
      }, 60000); // 60 second timeout for message processing

      // Prepare messages array with system prompt
      const messages = [
        {
          role: 'system',
          content: `You are a helpful Project Manager assistant that helps users manage their projects and workflows. 
You can help with:
- Creating and managing tasks
- Organizing workflows
- Providing project guidance
- Answering questions about the system

Please be concise and direct in your responses.`
        }
      ];

      // Add conversation history for context
      if (this.history.length > 0) {
        // Add last few messages for context
        const contextMessages = this.history.slice(-5);
        messages.push(...contextMessages);
      }

      // Add current message
      messages.push({
        role: 'user',
        content: message
      });

      try {
        // Make request to LLM
        const response = await fetch(`${apiUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: settings.model,
            messages: messages,
            temperature: settings.parameters?.temperature || 0.7,
            top_p: settings.parameters?.topP || 0.9,
            top_k: settings.parameters?.topK || 40,
            repeat_penalty: settings.parameters?.repeatPenalty || 1.1,
            max_tokens: settings.parameters?.maxTokens || 1024,
            stream: false
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`LLM request failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from LLM');
        }

        // Clear timeout since we got a response
        clearTimeout(timeoutId);

        const llmResponse = result.choices[0].message.content;

        // Add message to history
        this.history.push({
          role: 'user',
          content: message
        }, {
          role: 'assistant',
          content: llmResponse
        });

        // Save history to localStorage
        localStorage.setItem('projectManagerHistory', JSON.stringify(this.history));

        // Log successful processing
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          `Successfully processed message ${messageId}`,
          { responsePreview: llmResponse.substring(0, 100) }
        ));

        return llmResponse;

      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        `Error processing message: ${error.message}`,
        { error }
      ));
      
      // If validation failed, try to reinitialize
      if (error.message.includes('validation failed')) {
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Attempting to reinitialize after validation failure'
        ));
        await this.initialize();
      }
      
      throw error;
    }
  }
  
  /**
   * Emit a message to the UI
   */
  emitMessage(content, options = {}) {
    const event = new CustomEvent('project-manager-message', {
      detail: {
        target: 'project-manager',
        content,
        messageId: options.messageId,
        conversationId: this.conversationId,
        timestamp: options.timestamp || new Date().toISOString(),
        isError: options.isError || false
      }
    });
    
    // Log the message being sent
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      'Emitting message to UI',
      {
        messageId: event.detail.messageId,
        isError: event.detail.isError,
        contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      }
    ));
    
    window.dispatchEvent(event);
  }
  
  /**
   * Emit an error message
   */
  emitError(error) {
    store.dispatch(logError(
      LOG_CATEGORIES.AGENT,
      'Project Manager Agent error',
      { error }
    ));
    
    store.dispatch(addNotification({
      type: 'error',
      message: 'Project Manager Error',
      description: error
    }));
    
    this.emitMessage(`Error: ${error}`);
  }
  
  /**
   * Clean up agent resources
   */
  destroy() {
    window.removeEventListener('project-manager-request', this.handleMessage);
  }
}

// Create and export singleton instance
const projectManagerAgent = new ProjectManagerAgent();
export default projectManagerAgent; 