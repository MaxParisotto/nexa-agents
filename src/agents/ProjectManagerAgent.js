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
    this.processingMessage = false;
    this.messageQueue = new Set(); // Use Set for automatic deduplication
    this.lastProcessedMessageId = null;
    this.initializationInProgress = false;
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.processMessage = this.processMessage.bind(this);
    this.validateSettings = this.validateSettings.bind(this);
    
    // Set up event listeners with bound method
    window.removeEventListener('project-manager-request', this.handleMessage); // Remove any existing listeners
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
      
      // Only update settings if they've changed
      if (newSettings && JSON.stringify(newSettings) !== JSON.stringify(this.settings)) {
        this.settings = newSettings;
        this.validateSettings(newSettings).catch(error => {
          store.dispatch(logError(
            LOG_CATEGORIES.AGENT,
            'Failed to validate new settings',
            { error: error.message }
          ));
        });
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
            'Initialization already in progress'
        ));
        return this.initialized;
    }
    
    this.initializationInProgress = true;
    
    try {
        // Get settings from Redux store
        const state = store.getState();
        const settings = state.settings?.projectManager;
        
        // Try to get cached settings from sessionStorage as fallback
        const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
        
        // Use Redux settings, cached settings, or defaults
        this.settings = settings || cachedSettings || {
            apiUrl: state.settings?.lmStudio?.apiUrl || 'http://localhost:1234',
            model: state.settings?.lmStudio?.defaultModel || 'qwen2.5-7b-instruct-1m',
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

        // Format API URL
        if (!this.settings.apiUrl.startsWith('http://') && !this.settings.apiUrl.startsWith('https://')) {
            this.settings.apiUrl = `http://${this.settings.apiUrl}`;
        }
        this.settings.apiUrl = this.settings.apiUrl.replace(/\/+$/, '');
        
        // Validate settings
        const validationResult = await this.validateSettings(this.settings);
        if (!validationResult.success) {
            throw new Error(`Settings validation failed: ${validationResult.error}`);
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
            { 
                error: error.message,
                settings: this.settings || 'No settings available'
            }
        ));
        
        // Try to recover using cached settings
        const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
        if (cachedSettings) {
            store.dispatch(logInfo(
                LOG_CATEGORIES.AGENT,
                'Attempting recovery using cached settings',
                { settings: cachedSettings }
            ));
            this.settings = cachedSettings;
            return this.validateSettings(cachedSettings).success;
        }
        
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
        return {
            success: false,
            error: 'No settings provided'
        };
    }

    if (!settings.serverType || !settings.model || !settings.apiUrl) {
        return {
            success: false,
            error: `Missing required settings: ${[
                !settings.serverType && 'serverType',
                !settings.model && 'model',
                !settings.apiUrl && 'apiUrl'
            ].filter(Boolean).join(', ')}`
        };
    }

    try {
        // Format API URL
        let apiUrl = settings.apiUrl;
        if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
            apiUrl = `http://${apiUrl}`;
        }
        apiUrl = apiUrl.replace(/\/+$/, '');

        // Test connection with timeout and proper error handling
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            store.dispatch(logInfo(
                LOG_CATEGORIES.AGENT,
                'Testing connection to LLM server',
                { apiUrl, model: settings.model }
            ));

            const response = await fetch(`${apiUrl}/v1/models`, {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to connect to LLM server: ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json();
            
            if (!data?.data || !Array.isArray(data.data)) {
                return {
                    success: false,
                    error: 'Invalid response format from LLM server'
                };
            }

            const availableModels = data.data.map(m => m.id);
            if (!availableModels.includes(settings.model)) {
                return {
                    success: false,
                    error: `Model ${settings.model} not found. Available models: ${availableModels.join(', ')}`
                };
            }

            // Test chat completion with timeout
            const completionController = new AbortController();
            const completionTimeout = setTimeout(() => completionController.abort(), 10000);

            try {
                store.dispatch(logInfo(
                    LOG_CATEGORIES.AGENT,
                    'Testing chat completion',
                    { model: settings.model }
                ));

                const testResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: settings.model,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a helpful assistant.'
                            },
                            {
                                role: 'user',
                                content: 'Test message'
                            }
                        ],
                        max_tokens: 5
                    }),
                    signal: completionController.signal
                });

                clearTimeout(completionTimeout);

                if (!testResponse.ok) {
                    return {
                        success: false,
                        error: `Chat completion test failed: ${testResponse.status} ${testResponse.statusText}`
                    };
                }

                const testResult = await testResponse.json();
                if (!testResult?.choices?.[0]?.message?.content) {
                    return {
                        success: false,
                        error: 'Invalid response format from chat completion test'
                    };
                }

                // Cache validated settings with formatted URL
                const validatedSettings = {
                    ...settings,
                    apiUrl,
                    availableModels
                };
                sessionStorage.setItem('projectManagerSettings', JSON.stringify(validatedSettings));

                store.dispatch(logInfo(
                    LOG_CATEGORIES.AGENT,
                    'Project Manager connection test successful',
                    { settings: validatedSettings }
                ));

                return {
                    success: true,
                    models: availableModels
                };

            } catch (completionError) {
                clearTimeout(completionTimeout);
                if (completionError.name === 'AbortError') {
                    return {
                        success: false,
                        error: 'Chat completion test timed out after 10 seconds'
                    };
                }
                throw completionError;
            }

        } catch (connectionError) {
            clearTimeout(timeout);
            if (connectionError.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Connection test timed out after 5 seconds'
                };
            }
            throw connectionError;
        }

    } catch (error) {
        return {
            success: false,
            error: `Validation failed: ${error.message}`
        };
    }
  }
  
  /**
   * Handle incoming messages from the UI
   */
  async handleMessage(event) {
    try {
        // Log receipt of message
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'ProjectManagerAgent received message event',
          {
            type: event.type,
            detail: event.detail ? {
                message: event.detail.message,
                messageId: event.detail.messageId,
                settings: event.detail.settings
            } : 'No detail'
          }
        ));

        // Validate event has required data
        if (!event.detail || !event.detail.message) {
            throw new Error('Invalid message event: missing detail or message');
        }

        const { message, messageId, settings } = event.detail;

        // Check if message is already being processed
        if (this.processingMessageId === messageId) {
            store.dispatch(logInfo(
              LOG_CATEGORIES.AGENT,
              `Message ${messageId} is already being processed`
            ));
            return;
        }

        // Set processing state
        this.processingMessageId = messageId;

        // Initialize agent if needed
        if (!this.initialized) {
            await this.initialize();
        }

        // Process message using provided settings or default settings
        const chatSettings = settings || this.settings;
        const response = await this.processMessage(message, messageId, chatSettings);

        // Emit response back to chat using the correct event name
        this.emitMessage(response, {
            messageId,
            timestamp: new Date().toISOString()
        });

        // Clear processing state
        this.processingMessageId = null;

    } catch (error) {
        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Error handling message in ProjectManagerAgent',
          { error: error.message }
        ));
        
        // Emit error back to chat using the correct event name
        this.emitMessage(`Error: ${error.message}`, {
            messageId: event.detail?.messageId,
            timestamp: new Date().toISOString(),
            isError: true
        });

        // Clear processing state
        this.processingMessageId = null;
    }
  }
  
  /**
   * Process a message using the LLM
   */
  async processMessage(message, messageId, settings) {
    // Log start of processing
    store.dispatch(logInfo(`Processing message ${messageId}`));

    // Format API URL
    let apiUrl = settings.apiUrl;
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/$/, '');

    try {
        // Test connection before proceeding
        const testResponse = await fetch(`${apiUrl}/v1/models`);
        if (!testResponse.ok) {
            throw new Error(`Failed to connect to LLM server: ${testResponse.statusText}`);
        }

        // Prepare request with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        // Make request to LLM
        const response = await fetch(`${apiUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [{
                    role: 'user',
                    content: message
                }],
                temperature: settings.parameters?.temperature || 0.7,
                top_p: settings.parameters?.topP || 0.9,
                top_k: settings.parameters?.topK || 40,
                repeat_penalty: settings.parameters?.repeatPenalty || 1.1,
                max_tokens: settings.parameters?.maxTokens || 1024
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`LLM request failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.choices || !result.choices[0] || !result.choices[0].message) {
            throw new Error('Invalid response format from LLM');
        }

        const llmResponse = result.choices[0].message.content;

        // Log successful processing
        store.dispatch(logInfo(`Successfully processed message ${messageId}`));

        return llmResponse;

    } catch (error) {
        store.dispatch(logError(`Error processing message: ${error.message}`));
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
        messageId: options.messageId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationId: this.conversationId,
        timestamp: options.timestamp || new Date().toISOString(),
        isThinking: options.isThinking || false,
        temporary: options.temporary || false,
        replaces: options.replaces || null,
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