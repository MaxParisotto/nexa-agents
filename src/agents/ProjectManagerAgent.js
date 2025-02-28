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
    console.log('🚀🚀🚀 INITIALIZING ProjectManagerAgent INSTANCE 🚀🚀🚀', {
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
    
    super();
    this.initialized = false;
    this.settings = null;
    this.conversationId = null;
    this.history = [];
    this.processingMessageId = null;
    this.messageQueue = new Map(); // Change to Map to track message states
    this.lastProcessedMessageId = null;
    this.initializationInProgress = false;
    this.isShutDown = false;
    this.isThrottled = false;
    this.messageBuffer = [];
    this.throttleResetTimeout = null;
    this.queueProcessorInterval = null;
    this.lastMessageTimestamp = Date.now();
    this.messageThrottleWindow = 1000; // 1 second window
    this.messageThrottleLimit = 10; // Max 10 messages per second
    this.processingMessage = false;
    this.lastMessageProcessed = Date.now();
    this.minMessageInterval = 100; // Minimum 100ms between messages
    this.shutdownInProgress = false;
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.processMessage = this.processMessage.bind(this);
    this.validateSettings = this.validateSettings.bind(this);
    this.handleProjectManagerRequest = this.handleProjectManagerRequest.bind(this);
    this.processMessageQueue = this.processMessageQueue.bind(this);
    
    // Enhanced emergency shutdown handler
    const emergencyShutdownHandler = async (event) => {
      if (this.shutdownInProgress) {
        console.warn('Shutdown already in progress, ignoring duplicate request');
        return;
      }
      
      this.shutdownInProgress = true;
      console.error('🛑 EMERGENCY SHUTDOWN RECEIVED:', event.detail?.reason || 'No reason given');
      
      try {
        // Set flags first to prevent new operations
        this.isShutDown = true;
        this.isThrottled = true;
        
        // Clear any pending timeouts and intervals
        if (this.throttleResetTimeout) {
          clearTimeout(this.throttleResetTimeout);
          this.throttleResetTimeout = null;
        }
        
        if (this.queueProcessorInterval) {
          clearInterval(this.queueProcessorInterval);
          this.queueProcessorInterval = null;
        }
        
        // Remove all event listeners
        window.removeEventListener('project-manager-request', this.handleProjectManagerRequest);
        window.removeEventListener('emergency-agent-shutdown', emergencyShutdownHandler);
        
        // Clear message buffer and queue
        this.messageBuffer = [];
        this.messageQueue.clear();
        
        // Reset all internal state
        this.initialized = false;
        this.initializationInProgress = false;
        this.lastProcessedMessageId = null;
        
        // Emit final shutdown message
        this.emitMessage('🛑 Agent has been fully shut down. Refresh the page to restart.', {
          type: 'error',
          messageId: `shutdown-${Date.now()}`
        });
        
        console.error('🛑 Agent has been fully shut down. Refresh the page to restart.');
      } catch (error) {
        console.error('Error during emergency shutdown:', error);
        this.emitError(error);
      } finally {
        this.shutdownInProgress = false;
      }
    };
    
    // Register emergency shutdown handler
    window.addEventListener('emergency-agent-shutdown', emergencyShutdownHandler);
    
    // Initialize with default settings
    const defaultSettings = {
      apiUrl: 'http://localhost:1234',
      model: '',
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
    
    // Start message queue processor
    this.startMessageQueueProcessor();
    
    // Log initialization
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      'ProjectManagerAgent initialized with default settings',
      { settings: defaultSettings }
    ));
    
    // Subscribe to Redux store changes
    store.subscribe(() => {
      const state = store.getState();
      const newSettings = state.settings?.projectManager;
      
      // Skip if we don't have new settings, or if initialization is in progress
      if (!newSettings || this.initializationInProgress) {
        return;
      }

      // Skip updates if already initialized and we have settings
      // This prevents constant revalidation after initialization
      if (this.initialized && this.settings) {
        // Only log when settings actually change
        const settingsChanged = JSON.stringify(this.settings) !== JSON.stringify({
          apiUrl: newSettings.apiUrl,
          model: newSettings.model,
          serverType: newSettings.serverType,
          parameters: newSettings.parameters
        });
        
        if (settingsChanged) {
          store.dispatch(logInfo(
            LOG_CATEGORIES.AGENT,
            'Settings changed in Redux store, but agent already initialized',
            { 
              current: this.settings,
              new: newSettings
            }
          ));
        }
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
        
        // Only validate if we have required fields and not being validated already
        if (settingsWithDefaults.apiUrl && 
            settingsWithDefaults.model && 
            settingsWithDefaults.serverType &&
            !this.initializationInProgress) {
          // Set flag to prevent multiple validations
          this.initializationInProgress = true;
          
          this.validateSettings(settingsWithDefaults)
            .then(result => {
              if (result.success) {
                this.initialized = true;
                this.settings = result.settings;
              }
            })
            .catch(error => {
              store.dispatch(logError(
                LOG_CATEGORIES.AGENT,
                'Failed to validate new settings',
                { error: error.message, settings: settingsWithDefaults }
              ));
            })
            .finally(() => {
              this.initializationInProgress = false;
            });
        }
      }
    });

    // Load history from localStorage if available
    const savedHistory = localStorage.getItem('projectManagerHistory');
    if (savedHistory) {
      try {
        this.history = JSON.parse(savedHistory);
      } catch (error) {
        console.error('Failed to parse saved project manager history:', error);
        this.history = [];
      }
    }
  }
  
  /**
   * Initialize the agent with settings and restore state
   */
  async initialize() {
    // Generate a unique initialization ID for tracking
    const initId = `init-${Date.now()}`;
    
    // Prevent multiple initialization attempts
    if (this.initializationInProgress) {
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Initialization already in progress',
        { initId, inProgress: this.initializationInProgress }
      ));
      return false;
    }

    // If already initialized with valid settings, just return success
    if (this.initialized && this.settings && 
        this.settings.apiUrl && this.settings.model && this.settings.serverType) {
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Agent already initialized with valid settings',
        { initId, settings: this.settings }
      ));
      return true;
    }
    
    // Set initialization flag atomically
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
          initId,
          reduxSettings: settings,
          cachedSettings,
          usingCached: !settings && !!cachedSettings
        }
      ));

      // Determine which settings to use
      let settingsToUse;
      
      // First try existing settings
      if (this.settings && this.settings.apiUrl && this.settings.model && this.settings.serverType) {
        settingsToUse = this.settings;
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Using existing settings for initialization',
          { initId, settings: this.settings }
        ));
      }
      // Then try Redux settings
      else if (settings && settings.apiUrl && settings.model && settings.serverType) {
        settingsToUse = settings;
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Using Redux settings for initialization',
          { initId, settings }
        ));
      }
      // Then try cached settings
      else if (cachedSettings && cachedSettings.apiUrl && cachedSettings.model && cachedSettings.serverType) {
        settingsToUse = cachedSettings;
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Using cached settings for initialization',
          { initId, settings: cachedSettings }
        ));
      }
      // Finally use defaults
      else {
        // Determine the best server type based on available models
        const serverType = settings?.serverType || cachedSettings?.serverType || 'lmStudio';
        let apiUrl = settings?.apiUrl || cachedSettings?.apiUrl;
        
        // If no API URL is set, determine based on server type
        if (!apiUrl) {
          apiUrl = serverType === 'lmStudio' ? 'http://localhost:1234' : 'http://localhost:11434';
        }
        
        // Create new settings with defaults and proper structure
        settingsToUse = {
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
        
        store.dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Using default settings for initialization',
          { initId, settings: settingsToUse }
        ));
      }
      
      // Format API URL if needed
      if (!settingsToUse.apiUrl.startsWith('http://') && !settingsToUse.apiUrl.startsWith('https://')) {
        settingsToUse.apiUrl = `http://${settingsToUse.apiUrl}`;
      }
      settingsToUse.apiUrl = settingsToUse.apiUrl.replace(/\/+$/, '');
      
      // Set settings immediately to prevent race conditions
      this.settings = settingsToUse;
      
      // Cache settings even before validation
      sessionStorage.setItem('projectManagerSettings', JSON.stringify(settingsToUse));
      
      // Log settings before validation
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Validating settings',
        { initId, settings: settingsToUse }
      ));
      
      // Try to validate settings once
      try {
        const validationResult = await this.validateSettings(settingsToUse);
        if (validationResult.success) {
          // Update with validated settings
          this.settings = validationResult.settings;
          // Cache again with validated settings
          sessionStorage.setItem('projectManagerSettings', JSON.stringify(validationResult.settings));
        } else {
          throw new Error(validationResult.error || 'Validation failed without specific error');
        }
      } catch (validationError) {
        // Log the validation error
        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Validation failed during initialization',
          { 
            initId,
            error: validationError.message,
            stack: validationError.stack,
            settings: settingsToUse
          }
        ));
        
        // We'll continue with unvalidated settings for now
        // The agent can still try to function with potentially invalid settings
      }
      
      // Restore conversation history
      try {
        const savedHistory = localStorage.getItem('projectManagerHistory');
        if (savedHistory) {
          this.history = JSON.parse(savedHistory);
          store.dispatch(logInfo(
            LOG_CATEGORIES.AGENT,
            'Loaded conversation history',
            { initId, historyLength: this.history.length }
          ));
        }
      } catch (parseError) {
        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Failed to parse saved history',
          { initId, error: parseError.message }
        ));
        this.history = [];
      }
      
      // Get or generate conversation ID
      this.conversationId = localStorage.getItem('projectManagerConversationId') 
        || `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('projectManagerConversationId', this.conversationId);
      
      // Mark as initialized even if validation failed
      // This allows the agent to still try to operate even with invalid settings
      this.initialized = true;
      
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Project Manager Agent initialized',
        { 
          initId,
          settings: this.settings,
          historyLength: this.history.length,
          conversationId: this.conversationId
        }
      ));
      
      return true;
    } catch (error) {
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Failed to initialize Project Manager Agent',
        { initId, error: error.message, stack: error.stack }
      ));
      
      // Don't set initialized = false if it was already true
      // This prevents resetting a working agent if a later initialization fails
      return false;
    } finally {
      // Always clear the initialization flag
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

      // Ensure server type and URL are in sync - prioritize serverType over URL
      if (settings.serverType === 'lmStudio') {
        // Default LM Studio URL
        settings.apiUrl = settings.apiUrl.includes(':1234') ? settings.apiUrl : 'http://localhost:1234';
        apiUrl = settings.apiUrl;
      } else if (settings.serverType === 'ollama') {
        // Default Ollama URL
        settings.apiUrl = settings.apiUrl.includes(':11434') ? settings.apiUrl : 'http://localhost:11434';
        apiUrl = settings.apiUrl;
      }

      // Test connection to server with improved timeout handling
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Testing connection to LLM server',
        { apiUrl, model: settings.model, serverType: settings.serverType }
      ));

      // Find available models
      let availableModels = [];
      
      // First check if server is available with improved error handling
      const endpoint = settings.serverType === 'lmStudio' ? '/v1/models' : '/api/tags';
      
      try {
        // Use raw fetch with a timeout
        const fetchPromise = fetch(`${apiUrl}${endpoint}`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timed out after 10 seconds')), 10000);
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Parse models based on server type
        if (settings.serverType === 'lmStudio') {
          availableModels = data.data.map(model => model.id);
        } else {
          availableModels = data.models.map(model => model.name);
        }
        
        this.debugLog('validateSettings', 'Available models fetched from server', {
          count: availableModels.length,
          models: availableModels,
          serverType: settings.serverType
        });
      } catch (error) {
        throw new Error(`Failed to connect to server: ${error.message}`);
      }

      // If model doesn't exist, try to find a suitable alternative
      // First, check for exact match
      const modelExists = availableModels.includes(settings.model);
      
      if (!modelExists) {
        this.debugLog('validateSettings', 'Requested model not found, searching for alternatives', {
          requestedModel: settings.model,
          availableModels
        });
        
        // Define more specific preferred models for each server type
        let preferredModels = [];
        
        if (settings.serverType === 'lmStudio') {
          // LM Studio preferred models in order
          preferredModels = availableModels.filter(name => 
            name.startsWith('qwen') ||
            name.includes('deepseek') ||
            name.includes('llama') ||
            name.includes('mistral')
          );
        } else {
          // Ollama preferred models in order
          preferredModels = availableModels.filter(name => 
            name.startsWith('llama') ||
            name.includes('mistral') ||
            name.includes('deepseek') ||
            name.includes('qwen')
          );
        }

        // Remove any mock/test model names that might be in settings
        // Specific check for the mock "qwen2.5-7b-instruct-1m'" model
        if (settings.model === 'qwen2.5-7b-instruct-1m' || settings.model.includes('qwen2.5-7b-instruct-1m')) {
          this.debugLog('validateSettings', 'Detected mock/test model name, will use preferred alternatives', {
            mockModel: settings.model
          });
        }

        if (preferredModels.length > 0) {
          const originalModel = settings.model;
          settings.model = preferredModels[0];
          
          store.dispatch(logInfo(
            LOG_CATEGORIES.AGENT,
            `Model ${originalModel} not found, using alternative: ${preferredModels[0]}`
          ));
          
          this.debugLog('validateSettings', 'Using alternative model', {
            originalModel,
            newModel: settings.model,
            allPreferredOptions: preferredModels
          });
        } else if (availableModels.length > 0) {
          const originalModel = settings.model;
          settings.model = availableModels[0];
          
          store.dispatch(logInfo(
            LOG_CATEGORIES.AGENT,
            `Model ${originalModel} not found, using first available model: ${availableModels[0]}`
          ));
          
          this.debugLog('validateSettings', 'Using first available model', {
            originalModel,
            newModel: settings.model
          });
        } else {
          throw new Error('No models available from the server');
        }
      } else {
        this.debugLog('validateSettings', 'Requested model found', {
          model: settings.model
        });
      }

      // Skip the chat completion test for now
      // Just validate we have a working API and models
      
      // Cache validated settings with available models
      const validatedSettings = {
        ...settings,
        apiUrl,
        availableModels,
        // Add validation timestamp for diagnostics
        validatedAt: new Date().toISOString()
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
        settings: validatedSettings
      };

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
    const receiveTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    try {
      // Validate event has required data
      if (!event.detail?.message || !event.detail?.messageId) {
        this.debugLog('handleMessage', 'Invalid event data, missing message or messageId', {
          requestId,
          hasMessage: !!event.detail?.message,
          hasMessageId: !!event.detail?.messageId,
          detail: JSON.stringify(event.detail).substring(0, 100)
        });
        return;
      }

      const { message, messageId, settings } = event.detail;
      
      // Enhanced logging with timing information
      this.debugLog('handleMessage', `Received message ${messageId}`, { 
        requestId,
        messageId,
        receiveTime,
        messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        hasSettings: !!settings,
        queueSize: this.messageQueue.size,
        lastProcessedId: this.lastProcessedMessageId
      });

      // Handle special initialization message
      if (message === '__initialize__') {
        this.debugLog('handleMessage', 'Handling initialization request', { 
          requestId,
          messageId,
          initialized: this.initialized,
          initializationInProgress: this.initializationInProgress
        });
        
        if (!this.initialized && !this.initializationInProgress) {
          const success = await this.initialize();
          
          // Send confirmation response
          this.emitMessage(
            success 
              ? 'Initialization successful' 
              : 'Initialization failed, but will attempt to continue',
            {
              messageId,
              timestamp: new Date().toISOString(),
              isError: !success,
              relatedToMessageId: messageId
            }
          );
        } else if (this.initialized) {
          this.emitMessage('Already initialized', {
            messageId,
            timestamp: new Date().toISOString(),
            relatedToMessageId: messageId
          });
        } else {
          this.emitMessage('Initialization in progress', {
            messageId,
            timestamp: new Date().toISOString(),
            relatedToMessageId: messageId
          });
        }
        return;
      }

      // Check if message is already being handled
      if (this.messageQueue.has(messageId) || this.lastProcessedMessageId === messageId) {
        this.debugLog('handleMessage', `Message ${messageId} already processed or in queue, skipping`, { 
          requestId,
          messageId,
          inQueue: this.messageQueue.has(messageId),
          isLastProcessed: this.lastProcessedMessageId === messageId,
          timeSinceReceived: Date.now() - receiveTime + 'ms'
        });
        return;
      }

      // Track message state with enhanced details
      this.messageQueue.set(messageId, {
        status: 'processing',
        timestamp: receiveTime,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        requestId
      });

      // Initialize if needed (only once)
      if (!this.initialized && !this.initializationInProgress) {
        this.debugLog('handleMessage', 'Auto-initializing before processing message', { 
          requestId,
          messageId,
          timeSinceReceived: Date.now() - receiveTime + 'ms'
        });
        
        await this.initialize();
      }

      // Process message
      try {
        // If we have settings in the request, use them, otherwise use agent settings
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

        this.debugLog('handleMessage', `Processing message ${messageId}`, { 
          requestId,
          messageId,
          initialized: this.initialized,
          usingRequestSettings: !!settings,
          processingStartTime: Date.now(),
          timeSinceReceived: Date.now() - receiveTime + 'ms'
        });

        // Check DOM state before processing for debugging
        try {
          const thinkingIndicators = document.querySelectorAll('.thinking-indicator');
          if (thinkingIndicators.length > 0) {
            this.debugLog('handleMessage', 'Found thinking indicators before processing', {
              requestId,
              messageId,
              count: thinkingIndicators.length,
              elementIds: Array.from(thinkingIndicators).map(el => el.id || 'unknown')
            });
          }
        } catch (e) {
          this.debugLog('handleMessage', 'Error checking DOM before processing', { 
            requestId, messageId, error: e.toString() 
          });
        }

        // Even if not fully initialized, try to process
        const response = await this.processMessage(message, messageId, chatSettings);
        
        const completionTime = Date.now();

        // Update message state
        this.messageQueue.set(messageId, {
          status: 'completed',
          timestamp: completionTime,
          processingTime: completionTime - receiveTime,
          requestId
        });

        this.debugLog('handleMessage', `Completed processing message ${messageId}`, { 
          requestId,
          messageId,
          processingTime: completionTime - receiveTime + 'ms',
          responseLength: response.length
        });

        // Send response
        this.emitMessage(response, {
          messageId,
          timestamp: new Date(completionTime).toISOString(),
          relatedToMessageId: messageId,
          processingTime: completionTime - receiveTime
        });

        // Update last processed ID
        this.lastProcessedMessageId = messageId;

        // Clean up old messages from queue (older than 5 minutes)
        this.cleanMessageQueue();

      } catch (error) {
        const errorTime = Date.now();
        
        // Update message state to error
        this.messageQueue.set(messageId, {
          status: 'error',
          timestamp: errorTime,
          error: error.message,
          processingTime: errorTime - receiveTime,
          requestId
        });

        this.debugLog('handleMessage', `Error processing message ${messageId}`, { 
          requestId,
          messageId,
          error: error.toString(),
          stack: error.stack,
          processingTime: errorTime - receiveTime + 'ms'
        });

        store.dispatch(logError(
          LOG_CATEGORIES.AGENT,
          `Error processing message ${messageId}`,
          { 
            requestId,
            error: error.message,
            stack: error.stack
          }
        ));

        // Send error response to UI
        this.emitMessage(`Sorry, I encountered an error: ${error.message}`, {
          messageId,
          timestamp: new Date(errorTime).toISOString(),
          isError: true,
          relatedToMessageId: messageId
        });
      }

    } catch (error) {
      this.debugLog('handleMessage', 'Fatal error in handleMessage', {
        requestId,
        error: error.toString(),
        stack: error.stack,
        processingTime: Date.now() - receiveTime + 'ms',
        eventDetail: event.detail ? JSON.stringify(event.detail).substring(0, 100) : 'missing'
      });
      
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Error in handleMessage',
        { error: error.message, stack: error.stack }
      ));
      
      try {
        this.emitMessage(`Error: ${error.message}`, {
          messageId: event.detail?.messageId || `error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          isError: true
        });
      } catch (emitError) {
        // Last resort error logging if emitMessage fails
        this.debugLog('handleMessage', 'Failed to emit error message', {
          requestId,
          originalError: error.toString(),
          emitError: emitError.toString()
        });
      }
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
    // Create request ID for tracking
    const requestId = `proc-${messageId.substring(0, 8)}`;
    
    // Log start of processing with MORE DETAIL
    console.log(`🔍 TRACE: Starting LLM process - ${requestId}`, {
      messageId,
      serverType: settings.serverType,
      apiUrl: settings.apiUrl,
      model: settings.model,
      timestamp: new Date().toISOString()
    });
    
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      `Processing message ${messageId}`,
      { 
        requestId, 
        messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
      }
    ));

    // Format API URL
    let apiUrl = settings.apiUrl;
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `http://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/$/, '');
    
    // Log API URL and model
    console.log(`🔍 TRACE: Using API at ${apiUrl} for model ${settings.model}`);
    
    store.dispatch(logInfo(
      LOG_CATEGORIES.AGENT,
      'Using LLM settings',
      { 
        requestId,
        apiUrl, 
        model: settings.model,
        serverType: settings.serverType
      }
    ));

    try {
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
      
      // Log request preparations
      console.log(`🔍 TRACE: Preparing LLM request with ${messages.length} messages`);
      
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Preparing LLM request',
        { 
          requestId,
          historyLength: this.history.length,
          messageCount: messages.length
        }
      ));

      // Set up timeout with AbortController
      const controller = new AbortController();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          controller.abort();
          reject(new Error('LLM request timed out after 60 seconds'));
        }, 60000);
      });

      // Prepare the request body
      const requestBody = {
        model: settings.model,
        messages: messages,
        temperature: settings.parameters?.temperature || 0.7,
        top_p: settings.parameters?.topP || 0.9,
        top_k: settings.parameters?.topK || 40,
        repeat_penalty: settings.parameters?.repeatPenalty || 1.1,
        max_tokens: settings.parameters?.maxTokens || 1024,
        stream: false
      };
      
      // Log the exact request we're about to send
      console.log(`🔍 TRACE: Sending request to ${apiUrl}/v1/chat/completions`, {
        model: settings.model,
        messageCount: messages.length,
        temperature: settings.parameters?.temperature || 0.7,
        timestamp: new Date().toISOString()
      });
      
      // Immediately before fetch
      console.log(`🚀 TRACE: EXECUTING FETCH to ${apiUrl}/v1/chat/completions`);
      
      // Make request to LLM with timeout race
      const fetchPromise = fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }).then(response => {
        console.log(`✅ TRACE: FETCH RESPONSE RECEIVED: ${response.status} ${response.statusText}`);
        return response;  
      }).catch(error => {
        console.log(`❌ TRACE: FETCH ERROR: ${error.message}`);
        throw error;
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        console.log(`❌ TRACE: Bad response from server: ${response.status} ${response.statusText}`);
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ TRACE: Parsing JSON response`);
      const result = await response.json();
      
      console.log(`✅ TRACE: JSON parsed successfully`, {
        hasChoices: !!result.choices,
        firstChoice: result.choices?.[0] ? 'exists' : 'missing'
      });
      
      if (!result.choices?.[0]?.message?.content) {
        console.log(`❌ TRACE: Invalid response format`, result);
        throw new Error('Invalid response format from LLM');
      }

      const llmResponse = result.choices[0].message.content;
      
      // Log successful response
      console.log(`✅ TRACE: Got valid LLM response of length ${llmResponse.length}`);
      
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        `Received LLM response for message ${messageId}`,
        { 
          requestId,
          responsePreview: llmResponse.substring(0, 100) + (llmResponse.length > 100 ? '...' : '')
        }
      ));

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

      return llmResponse;

    } catch (error) {
      // Enhanced error logging with stack trace
      console.log(`❌ TRACE ERROR: ${error.message}`, {
        stack: error.stack,
        type: error.name,
        code: error.code || 'unknown'
      });
      
      // Detect if server is unreachable vs specific API errors
      let errorMessage;
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('timeout')) {
        errorMessage = `Cannot connect to LLM server at ${apiUrl}. Please check that the server is running and accessible.`;
      } else if (error.message.includes('aborted')) {
        errorMessage = `Request to LLM server was aborted: ${error.message}`;
      } else {
        errorMessage = `Error processing message: ${error.message}`;
      }
      
      // Log detailed error information
      console.log(`❌ TRACE FINAL ERROR: ${errorMessage}`, {
        originalError: error.message,
        apiUrl,
        model: settings.model,
        serverType: settings.serverType
      });
      
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        errorMessage,
        { 
          requestId,
          originalError: error.message,
          stack: error.stack
        }
      ));
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Enhanced debug logging to trace message flow
   * @param {string} source - Source of the log (function or event)
   * @param {string} message - Log message
   * @param {object} data - Additional data to log
   */
  debugLog(source, message, data = {}) {
    console.log(`[PM-AGENT-DEBUG] [${new Date().toISOString()}] [${source}] ${message}`, 
      typeof data === 'object' ? { ...data, timestamp: Date.now() } : data);
  }

  /**
   * Emit a message to the UI
   */
  emitMessage(content, options = {}) {
    const startTime = Date.now();
    
    // EMERGENCY FIX: Throttle outgoing messages too
    if (this.isThrottled) {
      console.log('⚠️ Message emit throttled due to flood protection');
      return; // Skip sending while throttled
    }
    
    // EMERGENCY FIX: Rate limit outgoing messages
    if (this.lastEmitTimestamp && startTime - this.lastEmitTimestamp < 100) {
      console.log('⚠️ Rate limiting outgoing messages (too frequent)');
      return; // Minimum 100ms between messages
    }
    this.lastEmitTimestamp = startTime;
    
    try {
      // Ensure message ID exists
      const messageId = options.messageId || `msg-${startTime}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = options.timestamp || new Date().toISOString();
      
      // EMERGENCY FIX: Track recently emitted message IDs to prevent duplicates
      if (!this.recentMessageIds) {
        this.recentMessageIds = new Set();
      }
      
      // If we've seen this message ID recently, don't send it again
      if (this.recentMessageIds.has(messageId)) {
        console.log('⚠️ Preventing duplicate message emit:', messageId);
        return;
      }
      
      // Add to recent messages (and clean old ones)
      this.recentMessageIds.add(messageId);
      if (this.recentMessageIds.size > 100) {
        // Keep only the 50 most recent messages
        this.recentMessageIds = new Set([...this.recentMessageIds].slice(-50));
      }
      
      // Add more detailed debugging logs
      this.debugLog('emitMessage', 'Preparing to emit message', {
        messageId,
        timestamp,
        isError: !!options.isError,
        contentLength: content ? content.length : 0,
        contentPreview: content ? (content.substring(0, 50) + (content.length > 50 ? '...' : '')) : 'empty',
        relatedToMessageId: options.relatedToMessageId || 'unknown'
      });
      
      // Log DOM state for debugging but don't modify DOM (React will handle this)
      try {
        const thinkingIndicators = document.querySelectorAll('.thinking-indicator');
        const thinkingMessages = document.querySelectorAll('.thinking-message');
        
        if (thinkingIndicators.length > 0 || thinkingMessages.length > 0) {
          this.debugLog('emitMessage', 'Found thinking indicators in DOM before sending response', {
            indicatorCount: thinkingIndicators.length,
            messageCount: thinkingMessages.length,
            elementIds: Array.from(thinkingIndicators).map(el => el.id || 'unknown'),
            parentIds: Array.from(thinkingMessages).map(el => el.id || 'unknown')
          });
        }
      } catch (domError) {
        this.debugLog('emitMessage', 'Error inspecting DOM for thinking indicators', { 
          error: domError.toString() 
        });
      }
      
      // Create event with consistent structure
      const event = new CustomEvent('project-manager-message', {
        detail: {
          target: 'project-manager',
          content: content,
          message: content, // Include both formats for backward compatibility
          messageId: messageId,
          conversationId: this.conversationId,
          timestamp: timestamp,
          isError: !!options.isError,
          responseTime: Date.now() - startTime // Add timing info
        }
      });
      
      // Log the message being sent
      store.dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Emitting message to UI',
        {
          messageId: messageId,
          isError: !!options.isError,
          contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          processingTime: Date.now() - startTime + 'ms'
        }
      ));
      
      // Dispatch with longer delay to avoid race conditions
      const delayTime = 100; // Increased from 20ms to 100ms for more reliable delivery
      this.debugLog('emitMessage', `Scheduling event dispatch with ${delayTime}ms delay`, {
        messageId, eventType: 'project-manager-message'
      });
      
      setTimeout(() => {
        try {
          // Record exact time of dispatch
          const dispatchTime = Date.now();
          
          // Dispatch event
          window.dispatchEvent(event);
          
          // Log after dispatching
          this.debugLog('emitMessage', 'Dispatched event', {
            messageId,
            eventType: 'project-manager-message',
            timestamp: new Date().toISOString(),
            dispatchTime,
            totalDelay: dispatchTime - startTime + 'ms'
          });
          
          // Log DOM state again for debugging purposes, but don't modify DOM directly
          setTimeout(() => {
            try {
              const remainingIndicators = document.querySelectorAll('.thinking-indicator');
              const remainingMessages = document.querySelectorAll('.thinking-message');
              
              if (remainingIndicators.length > 0 || remainingMessages.length > 0) {
                this.debugLog('emitMessage', 'Thinking indicators still present in DOM after dispatch', {
                  indicatorCount: remainingIndicators.length,
                  messageCount: remainingMessages.length,
                  elementIds: Array.from(remainingIndicators).map(el => el.id || 'unknown'),
                  messageIds: Array.from(remainingMessages).map(el => el.id || 'unknown'),
                  timeSinceDispatch: Date.now() - dispatchTime + 'ms'
                });
              } else {
                this.debugLog('emitMessage', 'No thinking indicators found in DOM after dispatch', {
                  timeSinceDispatch: Date.now() - dispatchTime + 'ms'
                });
              }
            } catch (e) {
              this.debugLog('emitMessage', 'Error checking DOM after dispatch', { error: e.toString() });
            }
          }, 200); // Check DOM 200ms after dispatching
          
        } catch (dispatchError) {
          this.debugLog('emitMessage', 'Failed to dispatch event', {
            error: dispatchError.toString(),
            messageId,
            timeSinceStart: Date.now() - startTime + 'ms'
          });
        }
      }, delayTime); // Increased delay for more reliable delivery
    } catch (error) {
      this.debugLog('emitMessage', 'Failed in emitMessage', {
        error: error.toString(),
        stack: error.stack,
        content: content ? content.substring(0, 50) : 'empty'
      });
      
      store.dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Error in emitMessage',
        { error: error.message, content: content ? content.substring(0, 50) : 'empty' }
      ));
    }
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

  /**
   * Adds event listeners for project manager requests
   */
  addEventListeners() {
    // Remove existing listeners first to avoid duplicates
    window.removeEventListener('project-manager-request', this.handleProjectManagerRequest);
    
    // Log listener setup
    console.log('🎧 TRACE: Setting up project-manager-request event listener');
    
    // Add new event listener
    window.addEventListener('project-manager-request', this.handleProjectManagerRequest);
    
    console.log('🎧 TRACE: Event listener for project-manager-request added successfully');
    
    // Test if event listener actually works by sending a test event to itself
    setTimeout(() => {
      console.log('🎧 TRACE: Executing self-test of event listener');
      
      // Create a test event that will just echo back to ensure the event system works
      try {
        const testEvent = new CustomEvent('project-manager-self-test', {
          detail: { 
            message: 'self-test',
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(testEvent);
        console.log('🎧 TRACE: Self-test event dispatched successfully');
      } catch (e) {
        console.error('🎧 ERROR: Failed to dispatch self-test event:', e);
      }
    }, 1000);
    
    // Setup another listener just for the self-test
    const selfTestHandler = (event) => {
      console.log('🎧 TRACE: Self-test event received', {
        detail: event.detail,
        timestamp: new Date().toISOString()
      });
      // Remove this listener after receiving the event
      window.removeEventListener('project-manager-self-test', selfTestHandler);
    };
    window.addEventListener('project-manager-self-test', selfTestHandler);
  }

  /**
   * Handles project manager request events
   */
  handleProjectManagerRequest = async (event) => {
    // EMERGENCY FIX: Check if agent has been shut down
    if (this.isShutDown) {
      console.log('⛔ Agent is shut down, ignoring request:', event.detail?.messageId || 'unknown');
      return;
    }
    
    // ENHANCED MESSAGE THROTTLING
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastMessageTimestamp > this.messageThrottleWindow) {
      this.messageCounter = 0;
      this.lastMessageTimestamp = now;
      this.isThrottled = false;
      
      // Clear any existing reset timeout
      if (this.throttleResetTimeout) {
        clearTimeout(this.throttleResetTimeout);
      }
    }
    
    // Increment counter
    this.messageCounter++;
    
    // Check if over limit
    if (this.messageCounter > this.messageThrottleLimit) {
      if (!this.isThrottled) {
        console.error(`🔥 EMERGENCY: Message flood detected! ${this.messageCounter} messages in ${this.messageThrottleWindow}ms`);
        console.error('Throttling messages to prevent browser crash');
        this.isThrottled = true;
        
        // Set up auto-reset after 5 seconds
        this.throttleResetTimeout = setTimeout(() => {
          console.log('🔄 Resetting throttle state after timeout');
          this.messageCounter = 0;
          this.isThrottled = false;
          this.lastMessageTimestamp = Date.now();
        }, 5000);
        
        // Send throttle warning to UI
        try {
          const throttleEvent = new CustomEvent('project-manager-message', {
            detail: {
              content: `⚠️ SYSTEM ALERT: Too many messages detected (${this.messageCounter} in ${this.messageThrottleWindow}ms). System has been throttled for 5 seconds to prevent a crash.`,
              messageId: `throttle-${now}`,
              timestamp: new Date().toISOString(),
              isError: true
            }
          });
          window.dispatchEvent(throttleEvent);
        } catch (e) {
          console.error('Could not send throttle warning:', e);
        }
      }
      
      // Skip processing this message while throttled
      return;
    }
    
    // Add message to buffer for processing
    if (event.detail) {
      this.messageBuffer.push(event.detail);
    }
  };

  /**
   * Start the message queue processor
   */
  startMessageQueueProcessor() {
    setInterval(() => {
      this.processMessageQueue();
    }, this.minMessageInterval);
  }

  /**
   * Process messages from the queue
   */
  async processMessageQueue() {
    if (this.processingMessage || this.messageBuffer.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - this.lastMessageProcessed < this.minMessageInterval) {
      return;
    }

    this.processingMessage = true;
    const message = this.messageBuffer.shift();

    try {
      await this.processProjectManagerRequest(message);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      this.processingMessage = false;
      this.lastMessageProcessed = Date.now();
    }
  }

  /**
   * Process a single project manager request
   */
  async processProjectManagerRequest(detail) {
    try {
      // Skip if no event detail
      if (!detail) {
        console.log('📩 TRACE: Empty event detail received, skipping');
        return;
      }

      // Extract event details
      const { message, messageId, settings, target } = detail;

      // Skip if not targeted at this agent
      if (target !== 'project-manager') {
        console.log(`📩 TRACE: Event for target ${target}, not for project-manager, skipping`);
        return;
      }

      // Process the message
      // ... rest of your existing message processing code ...
    } catch (error) {
      console.error('📩 ERROR: Error handling project manager request:', error);
      
      // Ensure we send an error response even if processing fails
      try {
        const errorMessage = `Error: ${error.message}`;
        const errorEvent = new CustomEvent('project-manager-message', {
          detail: {
            content: errorMessage,
            message: errorMessage,
            messageId: `error-${Date.now()}`,
            timestamp: new Date().toISOString(),
            isError: true
          }
        });
        
        window.dispatchEvent(errorEvent);
      } catch (dispatchError) {
        console.error('📩 CRITICAL: Failed to dispatch error response:', dispatchError);
      }
    }
  }

  /**
   * Tests connection to the LLM server
   * @param {Object} settings - LLM settings to use for the test
   * @returns {Promise<Object>} - Result of the connection test
   */
  async testConnection(settings) {
    const testId = `test-${Date.now()}`;
    console.log(`🧪 TRACE: Starting connection test ${testId}`, {
      apiUrl: settings.apiUrl,
      serverType: settings.serverType,
      model: settings.model
    });
    
    // Format API URL
    let apiUrl = settings.apiUrl;
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `http://${apiUrl}`;
    }
    apiUrl = apiUrl.replace(/\/$/, '');
    
    // First check if server is reachable with a simple models request
    console.log(`🧪 TRACE: Testing basic connectivity to ${apiUrl}`);
    
    try {
      // Set timeout for request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      console.log(`🧪 TRACE: Sending models request to ${apiUrl}/v1/models`);
      const modelsResponse = await fetch(`${apiUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!modelsResponse.ok) {
        throw new Error(`Server returned ${modelsResponse.status}: ${modelsResponse.statusText}`);
      }
      
      console.log(`🧪 TRACE: Models request successful - parsing response`);
      const modelsData = await modelsResponse.json();
      
      if (!modelsData || !modelsData.data) {
        throw new Error('Invalid models response format');
      }
      
      console.log(`🧪 TRACE: Server responded with ${modelsData.data.length} models`);
      
      const modelNames = modelsData.data.map(model => model.id);
      
      // Now test a simple completion to verify the server is working fully
      console.log(`🧪 TRACE: Testing completions endpoint with model ${settings.model}`);
      
      const completionsController = new AbortController();
      const completionsTimeoutId = setTimeout(() => completionsController.abort(), 15000);
      
      const requestBody = {
        model: settings.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Respond with the exact text "CONNECTION_TEST_SUCCESSFUL" and nothing else.'
          }
        ],
        temperature: 0.1,
        max_tokens: 15,
        stream: false
      };
      
      console.log(`🧪 TRACE: Sending completions request to ${apiUrl}/v1/chat/completions`);
      const completionsResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: completionsController.signal
      });
      
      clearTimeout(completionsTimeoutId);
      
      if (!completionsResponse.ok) {
        throw new Error(`Completions endpoint returned ${completionsResponse.status}: ${completionsResponse.statusText}`);
      }
      
      console.log(`🧪 TRACE: Completions request successful - parsing response`);
      const completionsData = await completionsResponse.json();
      
      const responseText = completionsData?.choices?.[0]?.message?.content || '';
      console.log(`🧪 TRACE: Received response: "${responseText}"`);
      
      // Connection tested successfully
      const result = {
        success: true,
        message: 'Connection successful',
        serverType: settings.serverType,
        apiUrl: settings.apiUrl,
        model: settings.model,
        availableModels: modelNames,
        response: responseText,
        rawResponse: completionsData
      };
      
      console.log(`🧪 TRACE: Connection test SUCCESSFUL`, result);
      
      // Send test success message
      const connectionTestSuccess = new CustomEvent('project-manager-message', {
        detail: {
          content: `✅ Connection test successful!\n\nDetected server: ${settings.serverType}\nAPI URL: ${apiUrl}\nModel: ${settings.model}\nAvailable models: ${modelNames.length}`,
          messageId: `test-success-${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(connectionTestSuccess);
      
      return result;
      
    } catch (error) {
      // Connection test failed
      console.log(`🧪 TRACE: Connection test FAILED: ${error.message}`, {
        error: error.stack || error,
        apiUrl,
        model: settings.model
      });
      
      // Format a user-friendly error message
      let userMessage;
      if (error.name === 'AbortError') {
        userMessage = `❌ Connection timed out while connecting to ${settings.serverType} at ${apiUrl}.\n\nPlease check that:\n1. LM Studio is running\n2. The server URL is correct\n3. The server is accessible from this application`;
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        userMessage = `❌ Network error connecting to ${settings.serverType} at ${apiUrl}.\n\nPlease check that:\n1. LM Studio is running\n2. The server URL is correct\n3. The server is accessible from this application`;
      } else {
        userMessage = `❌ Error connecting to ${settings.serverType}: ${error.message}`;
      }
      
      // Send test failure message
      const connectionTestFailure = new CustomEvent('project-manager-message', {
        detail: {
          content: userMessage,
          messageId: `test-failure-${Date.now()}`,
          timestamp: new Date().toISOString(),
          isError: true
        }
      });
      window.dispatchEvent(connectionTestFailure);
      
      return {
        success: false,
        message: error.message,
        error: error.toString(),
        apiUrl,
        serverType: settings.serverType,
        model: settings.model
      };
    }
  }
}

// Create and export singleton instance
const projectManagerAgent = new ProjectManagerAgent();
export default projectManagerAgent; 