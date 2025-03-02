import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  listWorkflowsThunk,
  saveWorkflowThunk,
  runWorkflowThunk,
  deleteWorkflowThunk,
  stopWorkflow,
  addNotification
} from '../store/actions/systemActions';
import { 
  logInfo, 
  logWarning, 
  logError,
  logDebug,
  LOG_CATEGORIES
} from '../store/actions/logActions';
import axios from 'axios';
import LlmDebugUtil from '../utils/LlmDebugUtil';
import { debounce } from 'lodash';
import { getModelScore } from '../utils/LlmModelParser';
import lmStudioApi from '../utils/LmStudioApi';
import LmStudioEndpointFinder from '../utils/LmStudioEndpointFinder';

/**
 * ProjectManager component
 * Acts as a background service that processes chat messages using an LLM
 * with tool-calling capabilities to manage workflows
 * Does not have a visible UI, but interacts with the ChatWidget through custom events
 */
const ProjectManager = () => {
  const dispatch = useDispatch();
  const [initialized, setInitialized] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [messageListenerAdded, setMessageListenerAdded] = useState(false);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [llmProvider, setLlmProvider] = useState(null);
  const [logs, setLogs] = useState([]);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const logRef = useRef([]);
  const workflows = useSelector(state => state.system.workflows || []);
  
  // Get LLM settings from Redux store
  const settings = useSelector(state => state.settings);
  const lmStudioSettings = settings?.lmStudio || {};
  const ollamaSettings = settings?.ollama || {};
  
  // Add a new state for the Project Manager chat
  const [projectManagerChatListenerAdded, setProjectManagerChatListenerAdded] = useState(false);
  
  // Add projectManagerSettings state
  const [projectManagerSettings, setProjectManagerSettings] = useState({
    apiUrl: 'http://localhost:1234',
    model: 'qwen2.5-7b-instruct',
    serverType: 'lmStudio',
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1024,
      contextLength: 4096
    }
  });
  
  // Initialize ProjectManagerSettings from Redux or sessionStorage
  useEffect(() => {
    if (settings?.lmStudio?.apiUrl && settings?.lmStudio?.defaultModel) {
      setProjectManagerSettings({
        apiUrl: settings.lmStudio.apiUrl,
        model: settings.lmStudio.defaultModel,
        serverType: 'lmStudio',
        parameters: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 1024,
          contextLength: 4096
        }
      });
    } else if (settings?.ollama?.apiUrl && settings?.ollama?.defaultModel) {
      setProjectManagerSettings({
        apiUrl: settings.ollama.apiUrl,
        model: settings.ollama.defaultModel,
        serverType: 'ollama',
        parameters: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 1024,
          contextLength: 4096
        }
      });
    }
  }, [settings]);
  
  // Custom logging function that saves logs to state and also outputs to console and Redux
  const log = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    // Add to logs state
    logRef.current = [...logRef.current, logEntry];
    setLogs(logRef.current);
    
    // Also log to Redux based on level
    switch (level) {
      case 'error':
        console.error(`[PM ${timestamp}] ${message}`, data || '');
        dispatch(logError(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, data));
        break;
      case 'warn':
        console.warn(`[PM ${timestamp}] ${message}`, data || '');
        dispatch(logWarning(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, data));
        break;
      case 'info':
        console.info(`[PM ${timestamp}] ${message}`, data || '');
        dispatch(logInfo(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, data));
        break;
      case 'debug':
        console.log(`[PM ${timestamp}] ${message}`, data || '');
        dispatch(logDebug(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, data));
        break;
      default:
        console.log(`[PM ${timestamp}] ${message}`, data || '');
        dispatch(logInfo(LOG_CATEGORIES.SYSTEM, `ProjectManager: ${message}`, data));
    }
    
    // If it's an error or warning, send a notification
    if (level === 'error') {
      dispatch(addNotification({
        type: 'error',
        message: `ProjectManager: ${message}`,
        timestamp: timestamp
      }));
    } else if (level === 'warn') {
      dispatch(addNotification({
        type: 'warning',
        message: `ProjectManager: ${message}`,
        timestamp: timestamp
      }));
    }
  };
  
  // Initialize once on component mount
  useEffect(() => {
    if (initialized) return;
    
    // Initialize the Project Manager
    log('info', 'Initializing Project Manager...');
    initializeProjectManager();
    
    // Listen for messages from the chat widget
    if (!messageListenerAdded) {
      window.addEventListener('chat-message', handleChatMessage);
      setMessageListenerAdded(true);
      log('info', 'Added chat-message event listener');
    }
    
    // Check if welcome message has been shown this session
    const welcomeShown = sessionStorage.getItem('pmWelcomeShown');
    
    if (!welcomeShown) {
      // Send welcome message (once per session)
      setTimeout(() => {
        log('info', 'Sending welcome message');
        sendMessageToChat(
          "Hello! I'm your Project Manager assistant. I can help you manage and run your agent workflows. Try these commands:\n\n" +
          "• list workflows\n" +
          "• create workflow [name]\n" +
          "• run workflow [name]\n" +
          "• describe workflow [name]\n" +
          "• help\n" +
          "• status (to check LLM configuration)"
        );
        
        // Mark welcome message as shown
        sessionStorage.setItem('pmWelcomeShown', 'true');
      }, 1000);
    }
    
    // Add debug command listener
    window.addEventListener('keydown', (e) => {
      // Alt+D to dump state for debugging
      if (e.altKey && e.key === 'd') {
        dumpDebugInfo();
      }
    });
    
    // First try to restore LLM configuration from sessionStorage (fastest)
    const sessionLlmConfigured = sessionStorage.getItem('llmConfigured');
    if (sessionLlmConfigured === 'true') {
      const provider = sessionStorage.getItem('lastConfiguredProvider');
      const apiUrl = sessionStorage.getItem(`${provider}Url`);
      const modelName = sessionStorage.getItem(`${provider}Model`);
      
      if (provider && apiUrl && modelName) {
        log('info', `Restoring cached LLM configuration from sessionStorage: ${provider} with model ${modelName}`);
        setLlmConfigured(true);
        setLlmProvider(provider);
        
        // Also test the connection to ensure it's still valid
        if (provider === 'lmStudio') {
          testLmStudioConnection(apiUrl, modelName);
        } else if (provider === 'ollama') {
          testOllamaConnection(apiUrl, modelName);
        }
      }
    }
    
    // Check if LLM is configured - try both from localStorage and Redux
    setTimeout(() => {
      if (!llmConfigured) {
        loadSettingsFromLocalStorage();
        checkLlmConfiguration(true);
      }
    }, 2000); // Wait for settings to load
    
    setInitialized(true);
    
    // Cleanup event listeners
    return () => {
      if (messageListenerAdded) {
        window.removeEventListener('chat-message', handleChatMessage);
        log('info', 'Removed chat-message event listener');
      }
    };
  }, [initialized, dispatch, messageListenerAdded]);
  
  // Watch for settings changes
  useEffect(() => {
    if (initialized) {
      log('info', 'Settings changed, rechecking LLM configuration...');
      if (settings && Object.keys(settings).length > 0) {
        checkLlmConfiguration(true);
      } else {
        log('info', 'Redux settings not loaded yet, loading from localStorage');
        loadSettingsFromLocalStorage();
      }
    }
  }, [settings, initialized]);
  
  /**
   * Load settings from localStorage as a fallback
   * This helps ensure we don't miss settings if Redux is slow to initialize
   */
  const loadSettingsFromLocalStorage = () => {
    try {
      log('info', 'Attempting to load settings from localStorage...');
      
      // Get settings from localStorage
      const rawSettings = localStorage.getItem('settings');
      if (rawSettings) {
        const localSettings = JSON.parse(rawSettings);
        log('info', 'Found settings in localStorage:', localSettings);
        
        // Check if local settings are valid
        const validation = LlmDebugUtil.validateSettings(localSettings);
        if (validation.valid) {
          log('info', 'Local settings are valid, using them for configuration check');
          
          // Use these settings to validate LLM configuration
          validateLlmConfiguration(localSettings);
        }
      } else {
        // Try individual keys as fallback
        const lmStudioUrl = localStorage.getItem('lmStudioAddress');
        const lmStudioModel = localStorage.getItem('defaultLmStudioModel');
        const ollamaUrl = localStorage.getItem('ollamaAddress');
        const ollamaModel = localStorage.getItem('defaultOllamaModel');
        
        if ((lmStudioUrl && lmStudioModel) || (ollamaUrl && ollamaModel)) {
          log('info', 'Found individual LLM settings in localStorage');
          
          const fallbackSettings = {
            lmStudio: {
              apiUrl: lmStudioUrl || '',
              defaultModel: lmStudioModel || ''
            },
            ollama: {
              apiUrl: ollamaUrl || '',
              defaultModel: ollamaModel || ''
            }
          };
          
          validateLlmConfiguration(fallbackSettings);
        } else {
          log('info', 'No LLM settings found in localStorage');
        }
      }
    } catch (error) {
      log('error', 'Error loading settings from localStorage', error);
    }
  };
  
  /**
   * Run diagnostics tests on LLM configuration
   */
  const runDiagnostics = async () => {
    try {
      log('info', 'Running LLM diagnostics...');
      setRunningDiagnostics(true);
      
      // First try with Redux settings
      let settingsToUse = settings;
      
      // If Redux settings aren't valid, try localStorage as fallback
      if (!LlmDebugUtil.validateSettings(settings).valid) {
        try {
          const rawSettings = localStorage.getItem('settings');
          if (rawSettings) {
            const localSettings = JSON.parse(rawSettings);
            if (LlmDebugUtil.validateSettings(localSettings).valid) {
              settingsToUse = localSettings;
              log('info', 'Using localStorage settings for diagnostics');
            }
          }
        } catch (error) {
          log('warn', 'Error parsing localStorage settings', error);
        }
      }
      
      const results = await LlmDebugUtil.runDiagnostics(settingsToUse);
      
      log('info', 'Diagnostics completed', results);
      setDiagnosticResults(results);
      
      // Update LLM configuration based on diagnostic results
      if (results.success) {
        setLlmConfigured(true);
        
        // Determine which provider to use based on results
        if (results.lmStudio.chat?.success) {
          setLlmProvider('lmStudio');
          log('info', 'LM Studio configuration validated successfully');
          
          // Save these settings to component state
          if (settingsToUse?.lmStudio) {
            saveValidatedSettings('lmStudio', settingsToUse.lmStudio.apiUrl, settingsToUse.lmStudio.defaultModel);
          }
        } else if (results.ollama.chat?.success) {
          setLlmProvider('ollama');
          log('info', 'Ollama configuration validated successfully');
          
          // Save these settings to component state
          if (settingsToUse?.ollama) {
            saveValidatedSettings('ollama', settingsToUse.ollama.apiUrl, settingsToUse.ollama.defaultModel);
          }
        }
      } else {
        log('warn', 'LLM diagnostics failed', results.validation.errors);
        setLlmConfigured(false);
        setLlmProvider(null);
      }
      
      return results;
    } catch (error) {
      log('error', 'Error running diagnostics', error);
      setDiagnosticResults({ success: false, error: error.message });
      return { success: false, error: error.message };
    } finally {
      setRunningDiagnostics(false);
    }
  };
  
  /**
   * Save validated settings to component state and sessionStorage
   * This provides a caching mechanism in case Redux state gets reset
   */
  const saveValidatedSettings = (provider, apiUrl, modelName) => {
    try {
      // Store the LLM configuration in sessionStorage
      sessionStorage.setItem(`${provider}Url`, apiUrl);
      sessionStorage.setItem(`${provider}Model`, modelName);
      sessionStorage.setItem('lastConfiguredProvider', provider);
      sessionStorage.setItem('llmConfigured', 'true');
      sessionStorage.setItem('llmConfigTimestamp', new Date().toISOString());
      
      // Also update component state
      setLlmConfigured(true);
      setLlmProvider(provider);
      
      log('info', `Cached validated ${provider} settings to sessionStorage`);
    } catch (error) {
      log('warn', `Error caching settings to sessionStorage: ${error.message}`);
    }
  };
  
  /**
   * Check if an LLM is properly configured
   */
  const checkLlmConfiguration = (verbose = false) => {
    log('info', 'Checking LLM configuration...');
    
    return validateLlmConfiguration(settings, verbose);
  };
  
  /**
   * Validate LLM configuration with specific settings object
   * Extracted as a separate function to allow validation against 
   * both Redux state and localStorage settings
   */
  const validateLlmConfiguration = (settingsToCheck, verbose = false) => {
    // First verify settings exist
    if (!settingsToCheck) {
      log('error', 'Settings object is undefined or null');
      setLlmConfigured(false);
      setLlmProvider(null);
      return false;
    }
    
    // Log raw settings
    if (verbose) {
      log('info', 'Current settings to check:', settingsToCheck);
      log('info', 'LM Studio settings:', settingsToCheck.lmStudio || {});
      log('info', 'Ollama settings:', settingsToCheck.ollama || {});
    }
    
    // Try to recover settings from session storage if missing
    if (!settingsToCheck.lmStudio?.apiUrl && sessionStorage.getItem('lmStudioUrl')) {
      log('info', 'Recovering LM Studio settings from sessionStorage');
      if (!settingsToCheck.lmStudio) settingsToCheck.lmStudio = {};
      settingsToCheck.lmStudio.apiUrl = sessionStorage.getItem('lmStudioUrl');
      settingsToCheck.lmStudio.defaultModel = sessionStorage.getItem('lmStudioModel');
    }
    
    if (!settingsToCheck.ollama?.apiUrl && sessionStorage.getItem('ollamaUrl')) {
      log('info', 'Recovering Ollama settings from sessionStorage');
      if (!settingsToCheck.ollama) settingsToCheck.ollama = {};
      settingsToCheck.ollama.apiUrl = sessionStorage.getItem('ollamaUrl');
      settingsToCheck.ollama.defaultModel = sessionStorage.getItem('ollamaModel');
    }
    
    // Validate settings using our utility
    const validation = LlmDebugUtil.validateSettings(settingsToCheck);
    
    if (!validation.valid) {
      log('warn', 'LLM configuration validation failed', validation.errors);
      setLlmConfigured(false);
      setLlmProvider(null);
      
      // Send warning notification only if verbose
      if (verbose) {
        dispatch(addNotification({
          type: 'warning',
          message: 'No valid LLM model configured. Please set up a model in Settings.'
        }));
      }
      
      return false;
    }
    
    const lmStudio = settingsToCheck.lmStudio || {};
    const ollama = settingsToCheck.ollama || {};
    
    // Configuration is valid, determine which provider to use
    if (validation.details.lmStudio.valid) {
      log('info', `LM Studio configured with model: ${lmStudio.defaultModel} at ${lmStudio.apiUrl}`);
      setLlmConfigured(true);
      setLlmProvider('lmStudio');
      
      // Cache these validated settings
      saveValidatedSettings('lmStudio', lmStudio.apiUrl, lmStudio.defaultModel);
      
      // Send notification only if verbose
      if (verbose) {
        dispatch(addNotification({
          type: 'info',
          message: `Project Manager using LM Studio with model: ${lmStudio.defaultModel}`
        }));
      }
      
      // Test connection to LM Studio
      testLmStudioConnection(lmStudio.apiUrl, lmStudio.defaultModel);
      
      return true;
    } else if (validation.details.ollama.valid) {
      log('info', `Ollama configured with model: ${ollama.defaultModel} at ${ollama.apiUrl}`);
      setLlmConfigured(true);
      setLlmProvider('ollama');
      
      // Cache these validated settings
      saveValidatedSettings('ollama', ollama.apiUrl, ollama.defaultModel);
      
      // Send notification only if verbose
      if (verbose) {
        dispatch(addNotification({
          type: 'info',
          message: `Project Manager using Ollama with model: ${ollama.defaultModel}`
        }));
      }
      
      // Test connection to Ollama
      testOllamaConnection(ollama.apiUrl, ollama.defaultModel);
      
      return true;
    }
    
    // Shouldn't get here since validation.valid would be false
    log('warn', 'LLM validation succeeded but no provider was selected');
    setLlmConfigured(false);
    setLlmProvider(null);
    return false;
  };
  
  /**
   * Test connection to LM Studio
   */
  const testLmStudioConnection = async (apiUrl, modelName) => {
    try {
      log('info', `Testing connection to LM Studio at ${apiUrl} with model ${modelName}...`);
      const result = await LlmDebugUtil.testLmStudioConnection(apiUrl);
      
      if (result.success) {
        log('info', 'LM Studio connection successful', result);
        // Verify model exists
        const modelExists = result.models.includes(modelName);
        
        if (modelExists) {
          log('info', `Model ${modelName} is available in LM Studio`);
        } else {
          log('warn', `Model ${modelName} not found in available models: ${result.models.join(', ')}`);
        }
      } else {
        log('error', 'Failed to connect to LM Studio', result);
      }
    } catch (error) {
      log('error', 'Error testing connection to LM Studio', error);
    }
  };
  
  /**
   * Test connection to Ollama
   */
  const testOllamaConnection = async (apiUrl, modelName) => {
    try {
      log('info', `Testing connection to Ollama at ${apiUrl} with model ${modelName}...`);
      const result = await LlmDebugUtil.testOllamaConnection(apiUrl);
      
      if (result.success) {
        log('info', 'Ollama connection successful', result);
        // Verify model exists
        const modelExists = result.models.includes(modelName);
        
        if (modelExists) {
          log('info', `Model ${modelName} is available in Ollama`);
        } else {
          log('warn', `Model ${modelName} not found in available models: ${result.models.join(', ')}`);
        }
      } else {
        log('error', 'Failed to connect to Ollama', result);
      }
    } catch (error) {
      log('error', 'Error testing connection to Ollama', error);
    }
  };
  
  /**
   * Initialize the Project Manager
   * Load workflows and set up any necessary background tasks
   */
  const initializeProjectManager = () => {
    // Fetch existing workflows
    dispatch(listWorkflowsThunk());
  };
  
  /**
   * Handle messages received from the chat widget
   */
  const handleChatMessage = async (event) => {
    log('info', 'ProjectManager received message:', event.detail);
    
    // Extract the message content, role, and settings from the event
    const { content, role, settings: chatSettings } = event.detail;
    
    // Update chat history
    setChatHistory(prev => [...prev, { role, content }]);
    
    // Only process user messages
    if (role !== 'user') return;
    
    // Process the message 
    try {
      log('info', 'Processing message:', content);
      log('info', 'Using chat settings:', chatSettings || 'No settings provided');
      
      // First, send "thinking" status to the user
      sendMessageToChat("Let me process that request...");
      
      let response;
      
      // Use the server type from the chat settings if available
      const serverType = chatSettings?.serverType || (llmProvider || 'lmStudio');
      const apiUrl = chatSettings?.apiUrl || 
        (serverType === 'lmStudio' ? settings?.lmStudio?.apiUrl : settings?.ollama?.apiUrl);
      const model = chatSettings?.model || 
        (serverType === 'lmStudio' ? settings?.lmStudio?.defaultModel : settings?.ollama?.defaultModel);
      
      log('info', `Using server type: ${serverType}, model: ${model}, apiUrl: ${apiUrl}`);
      
      // Handle debug commands
      if (content.toLowerCase() === 'debug' || content.toLowerCase() === 'debug info') {
        dumpDebugInfo();
        response = "I've displayed debug information on screen. You can also press Alt+D at any time to see this information.";
      } 
      // Process with LLM using the specified server type
      else if (apiUrl && model) {
        try {
          log('info', `Processing with ${serverType === 'lmStudio' ? 'LM Studio' : 'Ollama'}...`);
          
          if (serverType === 'lmStudio') {
            response = await callOpenAICompatibleAPI(content, {
              serverType: 'lmStudio',
              apiUrl: apiUrl,
              model: model
            });
          } else if (serverType === 'ollama') {
            response = await callOllamaAPI(apiUrl, model, content);
          } else {
            throw new Error(`Unsupported server type: ${serverType}`);
          }
          
          log('info', 'LLM response received');
        } catch (llmError) {
          log('error', `Error with ${serverType} processing, falling back to basic command processor`, llmError);
          response = await processCommandFallback(content);
        }
      } else {
        // No LLM configured, use basic command processing
        log('info', 'No LLM settings available, using basic command processor');
        response = await processCommandFallback(content);
      }
      
      // Send the response back to the chat widget
      sendMessageToChat(response);
    } catch (error) {
      log('error', 'Error processing message', error);
      
      // Send error message back to chat
      sendMessageToChat(`Sorry, I encountered an error: ${error.message}`);
    }
  };
  
  // Add a new effect to listen for Project Manager chat requests
  useEffect(() => {
    if (!projectManagerChatListenerAdded) {
      window.addEventListener('project-manager-request', handleProjectManagerRequest);
      setProjectManagerChatListenerAdded(true);
      
      return () => {
        window.removeEventListener('project-manager-request', handleProjectManagerRequest);
      };
    }
  }, [projectManagerChatListenerAdded]);
  
  /**
   * Handle requests from the Project Manager chat
   */
  const handleProjectManagerRequest = async (event) => {
    if (!event || !event.detail) {
      log('error', 'Received empty or invalid project manager request event', event);
      return;
    }

    const { message, settings: chatSettings } = event.detail;
    
    if (!message) {
      log('error', 'Received project manager request with no message', event.detail);
      return;
    }
    
    log('info', `Received Project Manager request: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Add a specific verification log for serverType
    log('info', 'VERIFICATION: serverType in received settings', {
      serverType: chatSettings?.serverType || 'NOT SET',
      model: chatSettings?.model || 'unknown',
      apiUrl: chatSettings?.apiUrl || 'unknown'
    });
    
    try {
      // Log the entire settings object for debugging
      log('debug', 'Received complete settings from ProjectManagerChat', chatSettings);
      
      // Extract and log the critical settings for processing
      const modelInfo = {
        model: chatSettings?.model || 'unknown',
        serverType: chatSettings?.serverType || 'unknown',
        apiUrl: chatSettings?.apiUrl || 'unknown'
      };
      
      log('info', 'Using the following model configuration:', modelInfo);
      
      // Log the parameters being used in more detail
      if (chatSettings?.parameters) {
        log('info', 'Parameters from ProjectManagerChat settings:', {
          temperature: chatSettings.parameters.temperature,
          topP: chatSettings.parameters.topP,
          topK: chatSettings.parameters.topK,
          maxTokens: chatSettings.parameters.maxTokens,
          contextLength: chatSettings.parameters.contextLength,
          repeatPenalty: chatSettings.parameters.repeatPenalty
        });
      } else {
        log('warn', 'No parameters found in chat settings', chatSettings);
      }

      // Process the message with the dedicated Project Manager LLM using the passed settings
      log('info', 'Processing message with Project Manager LLM...');
      
      // Add detailed logging for the model being used
      log('info', 'Using model from chat settings:', {
        model: chatSettings?.model,
        serverType: chatSettings?.serverType,
        apiUrl: chatSettings?.apiUrl
      });
      
      // Add detailed logging for the parameters being used
      log('debug', 'Using parameters from chat settings:', {
        temperature: chatSettings?.parameters?.temperature,
        topP: chatSettings?.parameters?.topP,
        topK: chatSettings?.parameters?.topK,
        maxTokens: chatSettings?.parameters?.maxTokens,
        contextLength: chatSettings?.parameters?.contextLength,
        repeatPenalty: chatSettings?.parameters?.repeatPenalty
      });
      
      const response = await processWithProjectManagerLLM(message, chatSettings);
      
      log('info', `Sending response back to ProjectManagerChat: ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`);
      
      // Send the response back to the ProjectManagerChat component
      const responseEvent = new CustomEvent('project-manager-message', {
        detail: { message: response }
      });
      window.dispatchEvent(responseEvent);
      
      log('debug', 'Response event dispatched to ProjectManagerChat');
    } catch (error) {
      log('error', 'Failed to process Project Manager request', error);
      
      // Send error message back to the ProjectManagerChat component
      const errorEvent = new CustomEvent('project-manager-message', {
        detail: { message: `Sorry, I encountered an error while processing your request: ${error.message}` }
      });
      window.dispatchEvent(errorEvent);
      
      log('debug', 'Error event dispatched to ProjectManagerChat');
    }
  };
  
  /**
   * Task management functions that can be called by the LLM
   */
  
  /**
   * Creates a new task with the provided details
   * @param {Object} taskData - The task data
   * @returns {Promise<Object>} - The created task
   */
  const createTask = async (taskData) => {
    log('info', 'Creating new task', taskData);
    
    try {
      // Generate a unique ID for the task
      const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create the task object
      const newTask = {
        id: taskId,
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: taskData.status || 'pending'
      };
      
      // Dispatch a custom event to notify the Tasks component
      const event = new CustomEvent('task-created', {
        detail: { task: newTask }
      });
      window.dispatchEvent(event);
      
      // Return the created task
      return newTask;
    } catch (error) {
      log('error', 'Failed to create task', error);
      throw error;
    }
  };
  
  /**
   * Updates an existing task with the provided details
   * @param {string} taskId - The ID of the task to update
   * @param {Object} taskData - The updated task data
   * @returns {Promise<Object>} - The updated task
   */
  const updateTask = async (taskId, taskData) => {
    log('info', `Updating task ${taskId}`, taskData);
    
    try {
      // Dispatch a custom event to notify the Tasks component
      const event = new CustomEvent('task-updated', {
        detail: { 
          taskId,
          updates: {
            ...taskData,
            updatedAt: new Date().toISOString()
          }
        }
      });
      window.dispatchEvent(event);
      
      // Return success
      return { success: true, taskId, message: 'Task updated successfully' };
    } catch (error) {
      log('error', `Failed to update task ${taskId}`, error);
      throw error;
    }
  };
  
  /**
   * Deletes a task with the specified ID
   * @param {string} taskId - The ID of the task to delete
   * @returns {Promise<Object>} - Success status
   */
  const deleteTask = async (taskId) => {
    log('info', `Deleting task ${taskId}`);
    
    try {
      // Dispatch a custom event to notify the Tasks component
      const event = new CustomEvent('task-deleted', {
        detail: { taskId }
      });
      window.dispatchEvent(event);
      
      // Return success
      return { success: true, message: `Task ${taskId} deleted successfully` };
    } catch (error) {
      log('error', `Failed to delete task ${taskId}`, error);
      throw error;
    }
  };
  
  /**
   * Lists all tasks, optionally filtered by status
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} - Array of tasks
   */
  const listTasks = async (status = null) => {
    log('info', `Listing tasks${status ? ` with status ${status}` : ''}`);
    
    try {
      // Create a promise that will be resolved when we receive the tasks
      return new Promise((resolve) => {
        // Create a one-time event listener for the response
        const handleTasksResponse = (event) => {
          const { tasks } = event.detail;
          window.removeEventListener('tasks-list-response', handleTasksResponse);
          resolve(tasks);
        };
        
        // Add the event listener
        window.addEventListener('tasks-list-response', handleTasksResponse);
        
        // Dispatch a custom event to request the tasks
        const event = new CustomEvent('tasks-list-request', {
          detail: { status }
        });
        window.dispatchEvent(event);
      });
    } catch (error) {
      log('error', 'Failed to list tasks', error);
      throw error;
    }
  };
  
  /**
   * Send a message back to the chat widget
   * @param {string} content - The message content to send back to the chat widget
   */
  const sendMessageToChat = (content) => {
    // Add null check to prevent TypeError
    if (content) {
      log('info', 'Sending message to chat', { 
        contentPreview: content.substring(0, Math.min(50, content.length)) + (content.length > 50 ? '...' : '') 
      });
    } else {
      log('warn', 'Attempted to send empty message to chat');
      content = "Sorry, I encountered an error processing your request.";
    }
    
    const event = new CustomEvent('project-manager-message', {
      detail: { message: content }
    });
    window.dispatchEvent(event);
  };
  
  /**
   * Calls the Ollama API with the specified parameters
   * @param {string} apiUrl - The URL of the Ollama API
   * @param {string} modelName - The name of the model to use
   * @param {string} message - The message to send to the model
   * @param {Object} parameters - Additional parameters for the model
   * @param {Object} systemMessage - Optional system message to include
   * @returns {Promise<string>} - The response from the model
   */
  const callOllamaAPI = async (apiUrl, modelName, message, parameters = {}, systemMessage = null) => {
    try {
      log('info', `Calling Ollama API at ${apiUrl} with model ${modelName}`, {
        parametersPreview: JSON.stringify(parameters).substring(0, 100)
      });
      
      // Prepare the prompt with system context and user message
      const defaultSystemPrompt = `You are an AI assistant that manages workflows and agents in a visual workflow editor. 

CAPABILITIES:
1. You can help users create, list, run, and manage workflows.
2. You can directly create and manage tasks and projects.
3. You can generate complete workflows from natural language descriptions.

ABOUT THE SYSTEM:
This system helps users manage agent workflows consisting of AI agents, prompts, and outputs organized in a directed graph. The workflow editor allows users to visually connect these nodes to create automation pipelines.

- Agent nodes: Represent AI models that can process text inputs
- Prompt nodes: Define templates that feed into agents
- Output nodes: Handle the results from agent processing

FUNCTION CALLING:
When a user asks you to perform any action related to workflows or tasks, please use function calling by creating a JSON object inside <tool_call></tool_call> tags.`;

      // Use the provided system message or fall back to the default
      const systemPrompt = systemMessage ? systemMessage.content : defaultSystemPrompt;
      
      // Prepare the messages array
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ];
      
      // Add chat history context if available
      if (chatHistory && chatHistory.length > 0) {
        // Get the last 10 messages from chat history
        const recentHistory = chatHistory.slice(-10);
        
        // Insert the history messages before the current user message
        if (recentHistory.length > 0) {
          // Remove the system message
          messages.shift();
          
          // Add system message, history messages, and then the current user message
          messages.unshift(
            { role: 'system', content: systemPrompt },
            ...recentHistory
          );
        }
      }
      
      log('info', 'Sending request to Ollama API', {
        model: modelName,
        messages: messages.length
      });
      
      // Map parameters to the correct format expected by Ollama API
      const requestParams = {
        model: modelName,
        messages: messages,
        temperature: parameters.temperature || 0.7,
        top_p: parameters.topP || 0.9, // Note: using topP from our settings format
        top_k: parameters.topK || 40, // Add topK parameter
        repeat_penalty: parameters.repeatPenalty || 1.1, // Add repeat_penalty
        max_tokens: parameters.maxTokens || 1024,
        num_ctx: parameters.contextLength || 4096 // Add context length as num_ctx
      };
      
      log('debug', 'Ollama API request parameters', requestParams);
      
      const response = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        requestParams,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout for longer generations
        }
      );
      
      log('info', 'Raw API response received');
      
      // Extract the response content
      const responseContent = response.data.message?.content || response.data.response || '';
      log('info', 'API response content', { content: responseContent.substring(0, 100) + '...' });
      
      // Check if the response contains a function call
      let functionCall = null;
      
      // Check for OpenAI-style function calls
      if (response.data.message?.function_call) {
        functionCall = response.data.message.function_call;
      } else if (response.data.message?.tool_calls) {
        // Handle OpenAI-style tool calls
        const toolCall = response.data.message.tool_calls.find(tc => tc.type === 'function');
        if (toolCall) {
          functionCall = toolCall.function;
        }
      }
      
      // Check for tool calls in the text (legacy format)
      if (!functionCall) {
        const toolCallMatch = responseContent.match(/<tool_call>\s*({.*?})\s*<\/tool_call>/s);
        if (toolCallMatch && toolCallMatch[1]) {
          try {
            const toolCall = JSON.parse(toolCallMatch[1]);
            functionCall = {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.arguments)
            };
          } catch (error) {
            log('error', 'Failed to parse tool call', error);
          }
        }
      }
      
      // If we found a function call, execute it
      if (functionCall) {
        log('info', 'Found function call in response', functionCall);
        
        try {
          // Parse the arguments if they're a string
          const args = typeof functionCall.arguments === 'string' 
            ? JSON.parse(functionCall.arguments) 
            : functionCall.arguments;
          
          // Execute the function based on the name
          let result;
          switch (functionCall.name) {
            case 'createTask':
              result = await createTask(args);
              break;
            case 'updateTask':
              result = await updateTask(args.taskId, args);
              break;
            case 'deleteTask':
              result = await deleteTask(args.taskId);
              break;
            case 'listTasks':
              result = await listTasks(args?.status);
              break;
            case 'create_workflow':
              result = await createWorkflow(args.name, args.description);
              break;
            case 'create_workflow_from_description':
              result = await createWorkflowFromDescription(args.description, args.name);
              break;
            case 'add_node':
              result = await addNodeToWorkflow(
                args.workflow_name,
                args.node_type,
                args.node_name,
                args.configuration
              );
              break;
            case 'list_workflows':
              result = await listWorkflows();
              break;
            case 'run_workflow':
              result = await runWorkflow(args.workflow_name);
              break;
            default:
              result = `Function ${functionCall.name} not implemented`;
          }
          
          return `Function ${functionCall.name} executed successfully. Result: ${JSON.stringify(result, null, 2)}`;
        } catch (error) {
          log('error', `Failed to execute function ${functionCall.name}`, error);
          return `Error executing function ${functionCall.name}: ${error.message}`;
        }
      }
      
      // If no function call was found, return the response content
      return responseContent;
    } catch (error) {
      log('error', 'Error calling Ollama API', error);
      throw error;
    }
  };
  
  /**
   * Process a message with the dedicated Project Manager LLM using the passed settings
   * @param {string} message - The message to process
   * @param {Object} chatSettings - The settings from the ProjectManagerChat component
   * @returns {Promise<string>} - The response from the LLM
   */
  const processWithProjectManagerLLM = async (message, chatSettings) => {
    try {
      // Extract settings from the chat settings
      let apiUrl = chatSettings?.apiUrl;
      const modelName = chatSettings?.model;
      const serverType = chatSettings?.serverType;
      const parameters = chatSettings?.parameters || {};
      
      log('info', `Processing message with Project Manager LLM using serverType: ${serverType}`, {
        apiUrl,
        modelName,
        serverType,
        parametersPreview: JSON.stringify(parameters).substring(0, 100)
      });
      
      // Validate required settings
      if (!apiUrl || !modelName) {
        log('error', 'Missing required settings for Project Manager LLM', {
          apiUrl,
          modelName,
          serverType
        });
        throw new Error('Missing required settings for Project Manager LLM. Please check your configuration.');
      }

      // Ensure API URL is properly formatted
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
      }
      
      // Remove any trailing slashes
      apiUrl = apiUrl.replace(/\/+$/, '');
      
      log('debug', 'Using formatted API URL', { apiUrl });
      
      // Determine which API to call based on serverType
      let response;
      if (serverType === 'lmStudio') {
        log('info', `Calling LM Studio API at ${apiUrl} with model ${modelName}`);
        
        // Ensure we're using the chat completions endpoint
        const endpoint = '/v1/chat/completions';
        const fullUrl = `${apiUrl}${endpoint}`;
        
        log('debug', 'Full API URL for request', { fullUrl });
        
        // Test the API endpoint before making the actual request
        try {
          await axios.get(`${apiUrl}/v1/models`);
          log('debug', 'API endpoint is accessible');
        } catch (error) {
          log('error', 'Failed to verify API endpoint', error);
          throw new Error(`API endpoint ${apiUrl} is not accessible. Please check if LM Studio is running.`);
        }
        
        response = await callOpenAICompatibleAPI(apiUrl, modelName, message, parameters);
      } else if (serverType === 'ollama') {
        log('info', `Calling Ollama API at ${apiUrl} with model ${modelName}`);
        response = await callOllamaAPI(apiUrl, modelName, message, parameters);
      } else {
        // If serverType is not specified, try to determine from the API URL
        if (apiUrl.includes('localhost:1234') || apiUrl.includes(':1234')) {
          log('info', `Auto-detected LM Studio from API URL ${apiUrl}`);
          response = await callOpenAICompatibleAPI(apiUrl, modelName, message, parameters);
        } else if (apiUrl.includes('localhost:11434') || apiUrl.includes(':11434')) {
          log('info', `Auto-detected Ollama from API URL ${apiUrl}`);
          response = await callOllamaAPI(apiUrl, modelName, message, parameters);
        } else {
          log('error', 'Could not determine server type from API URL', { apiUrl });
          throw new Error('Unknown server type. Please specify serverType in settings.');
        }
      }
      
      log('info', 'Received response from Project Manager LLM', {
        responsePreview: response.substring(0, 100) + '...'
      });
      
      return response;
    } catch (error) {
      log('error', 'Error processing message with Project Manager LLM', {
        error: error.message,
        stack: error.stack,
        config: error.config,
        response: error.response?.data
      });
      throw error;
    }
  };
  
  /**
   * Calls the OpenAI-compatible API (e.g., LM Studio) with the specified parameters
   */
  const callOpenAICompatibleAPI = async (prompt, options = {}) => {
    const {
      serverType = projectManagerSettings.serverType || 'lmStudio',
      apiUrl = projectManagerSettings.apiUrl,
      model = projectManagerSettings.model,
      retryAttempt = 0,
      maxRetries = 5, // Limit retries to prevent infinite loops
      fallbackToAvailableModel = true // New option to try available models if current one fails
    } = options;
    
    // Validate required parameters
    if (!apiUrl) {
      throw new Error('API URL not configured. Please check your settings.');
    }
    
    if (!model) {
      throw new Error('No model selected. Please select a model in settings.');
    }
    
    try {
      log('info', `Making API request to ${serverType} (${apiUrl}) with model: ${model}, attempt: ${retryAttempt + 1}/${maxRetries + 1}`);
      
      // Format base URL
      const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
      const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
      
      // Check if models endpoint is available and get available models
      let availableModels = [];
      try {
        const modelsResponse = await axios.get(`${cleanBaseUrl}/v1/models`, { 
          timeout: 3000,
          validateStatus: () => true // Accept any status code
        });
        
        if (modelsResponse.status === 200 && modelsResponse.data?.data) {
          availableModels = modelsResponse.data.data.map(m => m.id) || [];
          log('info', `Models endpoint working, found ${availableModels.length} models`);
          
          // Verify if the requested model exists in the available models
          if (availableModels.length > 0 && !availableModels.includes(model)) {
            log('warn', `Model "${model}" not found in available models: ${availableModels.slice(0, 5).join(', ')}${availableModels.length > 5 ? '...' : ''}`);
            
            // If we're allowed to use a fallback model and this isn't already a retry
            if (fallbackToAvailableModel && retryAttempt === 0 && availableModels.length > 0) {
              // Try to find a similar model (simple substring match)
              const similarModels = availableModels.filter(m => 
                m.includes(model.split('-')[0]) || model.includes(m.split('-')[0])
              );
              
              if (similarModels.length > 0) {
                const fallbackModel = similarModels[0];
                log('info', `Using similar available model "${fallbackModel}" instead of "${model}"`);
                
                // Call with the fallback model
                return await callOpenAICompatibleAPI(prompt, {
                  ...options,
                  model: fallbackModel,
                  fallbackToAvailableModel: false // Don't cascade fallbacks
                });
              }
            }
          }
        } else {
          log('warn', `Models endpoint returned status: ${modelsResponse.status}`);
        }
      } catch (error) {
        log('warn', `Could not access models endpoint: ${error.message}`);
        // Continue anyway, the chat endpoint might still work
      }
      
      // We'll focus only on the standard /v1/chat/completions endpoint
      const endpoint = '/v1/chat/completions';
      const fullUrl = `${cleanBaseUrl}${endpoint}`;
      
      log('info', `Sending request to ${fullUrl}`);
      
      // Prepare messages for the API
      const messages = [{ role: 'user', content: prompt }];
      
      // Create the request payload
      const requestPayload = {
        model: model,
        messages: messages,
        temperature: options.parameters?.temperature || 0.7,
        top_p: options.parameters?.topP || 0.9,
        max_tokens: options.parameters?.maxTokens || 1024
      };
      
      try {
        const apiResponse = await axios.post(
          fullUrl,
          requestPayload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000, // 20s timeout
            validateStatus: (status) => {
              // Consider both 200 (success) and 404 with model loading as valid responses
              // We'll handle the 404 model loading case in the response handler
              return status === 200;
            }
          }
        );
        
        log('info', `Received response from LM Studio API, status: ${apiResponse.status}`);
        
        // Extract content from response
        if (apiResponse.data?.choices && apiResponse.data.choices.length > 0) {
          const responseContent = apiResponse.data.choices[0].message?.content || 
                                apiResponse.data.choices[0].text;
                                
          if (responseContent) {
            return responseContent;
          } else {
            log('warn', `Empty response content from API: ${JSON.stringify(apiResponse.data)}`);
            throw new Error('Empty response from API');
          }
        } else {
          log('error', 'Unexpected API response format:', apiResponse.data);
          throw new Error('Invalid response format from API');
        }
      } catch (error) {
        // Detailed error logging
        log('warn', 'API request error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          url: fullUrl,
          model: model
        });

        // Handle 404 errors specifically - these are often model loading issues
        const is404Error = error.response?.status === 404;
        const responseData = error.response?.data;
        
        // Check if this looks like a case where the model is still loading
        const isModelLoading = is404Error && (
          // Check for explicit loading messages
          (typeof responseData?.error?.message === 'string' && 
           responseData.error.message.includes('Loading')) ||
          // Check for model not found messages that indicate JIT loading
          (typeof responseData?.error?.message === 'string' && 
           responseData.error.message.includes('Failed to load model')) ||
          // Generic message check in error response
          JSON.stringify(responseData || '').toLowerCase().includes('loading')
        );

        // If model is loading and we haven't exceeded max retries
        if (isModelLoading && retryAttempt < maxRetries) {
          // Exponential backoff with jitter
          const baseDelay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s, 8s...
          const jitter = Math.random() * 1000; // Add up to 1s of jitter to prevent request storms
          const delayMs = baseDelay + jitter;
          
          log('info', `Model "${model}" is loading, waiting ${Math.round(delayMs/1000)}s before retry ${retryAttempt + 1}/${maxRetries}`);
          
          // Show a notification to the user after a few retries
          if (retryAttempt >= 2) {
            dispatch(addNotification({
              type: 'info',
              message: `LM Studio is loading model "${model}"`, 
              description: `Please wait, this may take a few moments. Retry ${retryAttempt + 1}/${maxRetries}`,
              duration: 5000
            }));
          }
          
          // Wait for the backoff period
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Retry the request with incremented retry count
          return await callOpenAICompatibleAPI(prompt, {
            ...options,
            retryAttempt: retryAttempt + 1
          });
        }
        
        // If we've run out of retries but we have available models, try a different one
        if (retryAttempt >= maxRetries && fallbackToAvailableModel && availableModels.length > 0) {
          // Filter out the current model that's failing
          const otherModels = availableModels.filter(m => m !== model);
          
          if (otherModels.length > 0) {
            // Try to find a similar model first
            const similarModels = otherModels.filter(m => 
              m.includes(model.split('-')[0]) || model.includes(m.split('-')[0])
            );
            
            const fallbackModel = similarModels.length > 0 ? similarModels[0] : otherModels[0];
            
            log('info', `Model "${model}" failed to load after ${maxRetries} retries. Trying available model "${fallbackModel}" instead`);
            
            dispatch(addNotification({
              type: 'warning',
              message: `Switching to available model "${fallbackModel}"`,
              description: `Model "${model}" failed to load after multiple attempts`,
              duration: 5000
            }));
            
            // Call with the fallback model
            return await callOpenAICompatibleAPI(prompt, {
              ...options,
              model: fallbackModel,
              retryAttempt: 0,
              fallbackToAvailableModel: false // Don't cascade fallbacks
            });
          }
        }
        
        // If we get here, all retries and fallbacks failed
        if (retryAttempt >= maxRetries) {
          log('error', `Failed to load model "${model}" after ${maxRetries} retries`);
          throw new Error(`Model "${model}" failed to load after multiple attempts. Try selecting a different model or restart LM Studio.`);
        }
        
        throw error; // Re-throw if not handled above
      }
    } catch (error) {
      // Special handling for network issues
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
        log('error', `Could not connect to server at ${apiUrl}. Please ensure LM Studio is running and the API server is enabled.`);
        throw new Error(`Connection to ${serverType} failed: ${error.message}`);
      }
      
      log('error', `${serverType} API request failed`, { error: error.message });
      throw error;
    }
  };

  /**
   * Extract content from various API response formats
   */
  const extractResponseContent = (responseData) => {
    if (responseData.choices && responseData.choices.length > 0) {
      // Standard OpenAI format
      return responseData.choices[0].message?.content || 
             responseData.choices[0].text || 
             responseData.choices[0].content;
    } else if (responseData.response) {
      // Ollama-like format
      return responseData.response;
    } else if (responseData.output || responseData.generated_text) {
      // Other formats
      return responseData.output || responseData.generated_text;
    } else if (typeof responseData === 'string') {
      // Direct string response
      return responseData;
    } else if (responseData.completion) {
      // Some models return a completion field
      return responseData.completion;
    } else if (responseData.generations && responseData.generations.length > 0) {
      // Some models return generations array
      return responseData.generations[0].text || responseData.generations[0].content;
    }
    
    // Fallback - try to find any text field in the response
    const textFields = ['text', 'content', 'message', 'result', 'answer'];
    for (const field of textFields) {
      if (responseData[field]) {
        return responseData[field];
      }
    }
    
    // If no content field was found, log the structure and throw error
    console.error('Unexpected API response format:', responseData);
    throw new Error('Could not extract content from API response');
  };
  
  // Add this function to implement the fallback command processor
  const processCommandFallback = (message) => {
    if (!message || typeof message !== 'string') {
      return "I didn't understand that message.";
    }
    
    message = message.trim().toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
      return "Hello! I'm your project assistant. How can I help you today?";
    }
    
    if (message.includes('help')) {
      return `Here are some commands you can try:
  - help: Show this message
  - status: Check system status
  - version: Show application version
  - about: Learn more about this application`;
    }
    
    if (message.includes('status')) {
      return "System is operational. Using local settings mode.";
    }
    
    if (message.includes('version')) {
      return "Nexa Agents v1.0.0";
    }
    
    if (message.includes('about')) {
      return "Nexa Agents is an AI orchestration platform for managing autonomous agents and workflows.";
    }
    
    // Default response for unrecognized commands
    return "I'm not connected to an LLM server at the moment. Please check your settings or try basic commands like 'help'.";
  };

  // This is a service component with no UI
  return null;
};

export default ProjectManager;