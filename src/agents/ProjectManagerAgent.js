import EventEmitter from '../utils/EventEmitter';
import store from '../store';
import { logInfo, logError, LOG_CATEGORIES } from '../store/actions/logActions';
import { addNotification } from '../store/actions/systemActions';

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
    
    // Load cached settings
    try {
      const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
      if (cachedSettings) {
        this.settings = cachedSettings;
        console.log('📱 Loaded cached settings:', this.settings);
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
      console.log('📱 Using default settings:', this.settings);
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
            
            console.log('📱 Updating settings from Redux store:', {
              oldSettings: {
                apiUrl: currentApiUrl,
                model: currentModel,
                serverType: currentServerType
              },
              newSettings: {
                apiUrl: newApiUrl,
                model: newModel,
                serverType: newServerType
              }
            });
            
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
        console.log('📱 Loaded conversation history, entries:', this.history.length);
      }
    } catch (error) {
      console.error('Failed to parse saved project manager history:', error);
      this.history = [];
    }
    
    console.log('📱 ProjectManagerAgent initialized successfully');
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
      console.log('📱 Initializing ProjectManagerAgent with settings:', this.settings);
      
      // Simple validation check
      if (this.settings && this.settings.apiUrl && this.settings.model) {
        this.initialized = true;
        console.log('📱 ProjectManagerAgent initialized successfully');
        return true;
      } else {
        console.error('📱 Invalid settings for ProjectManagerAgent:', this.settings);
        return false;
      }
    } catch (error) {
      console.error('📱 Error initializing ProjectManagerAgent:', error);
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
  
  emitMessage(content, options = {}) {
    const messageId = options.messageId || `msg-${Date.now()}`;
    const timestamp = options.timestamp || new Date().toISOString();
    
    const event = new CustomEvent('project-manager-message', {
      detail: {
        content: content,
        messageId: messageId,
        timestamp: timestamp,
        isError: !!options.isError
      }
    });
    
    console.log('📱 Emitting message:', {
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      messageId
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
