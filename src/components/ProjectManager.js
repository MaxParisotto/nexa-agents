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
        message: `ProjectManager: ${message}`
      }));
    } else if (level === 'warn') {
      dispatch(addNotification({
        type: 'warning',
        message: `ProjectManager: ${message}`
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
    
    // Extract the message from the event
    const { content, role } = event.detail;
    
    // Update chat history
    setChatHistory(prev => [...prev, { role, content }]);
    
    // Only process user messages
    if (role !== 'user') return;
    
    // Check LLM configuration status first - force a check from all possible storage
    // This is a more aggressive check than the regular checkLlmConfiguration
    let isLlmConfigured = false;
    
    // First check if we've already confirmed we're configured
    if (llmConfigured && llmProvider) {
      isLlmConfigured = true;
    } else {
      // Next try a full configuration check including localStorage and sessionStorage
      log('info', 'Checking LLM configuration before processing message');
      
      // Try Redux settings first
      if (settings && (settings.lmStudio?.defaultModel || settings.ollama?.defaultModel)) {
        isLlmConfigured = checkLlmConfiguration(false);
      }
      
      // If Redux check failed, try sessionStorage next (fastest)
      if (!isLlmConfigured) {
        const sessionLlmUrl = sessionStorage.getItem('lmStudioUrl') || sessionStorage.getItem('ollamaUrl');
        const sessionModel = sessionStorage.getItem('lmStudioModel') || sessionStorage.getItem('ollamaModel');
        
        if (sessionLlmUrl && sessionModel) {
          log('info', 'Found LLM configuration in sessionStorage');
          const provider = sessionStorage.getItem('lmStudioUrl') ? 'lmStudio' : 'ollama';
          
          // Manually set the LLM as configured since we've verified it exists in session
          setLlmConfigured(true);
          setLlmProvider(provider);
          
          // Create a temporary settings object to validate
          const tempSettings = {
            [provider]: {
              apiUrl: sessionStorage.getItem(`${provider}Url`),
              defaultModel: sessionStorage.getItem(`${provider}Model`)
            }
          };
          
          isLlmConfigured = validateLlmConfiguration(tempSettings, false);
        }
      }
      
      // Lastly, check localStorage as a last resort
      if (!isLlmConfigured) {
        loadSettingsFromLocalStorage();
        // After loading from localStorage, if we're configured, update the flag
        if (llmConfigured) {
          isLlmConfigured = true;
        }
      }
    }
    
    // Process the message 
    try {
      log('info', 'Processing message:', content);
      
      // First, send "thinking" status to the user
      sendMessageToChat("Let me process that request...");
      
      let response;
      
      // Handle debug commands
      if (content.toLowerCase() === 'debug' || content.toLowerCase() === 'debug info') {
        dumpDebugInfo();
        response = "I've displayed debug information on screen. You can also press Alt+D at any time to see this information.";
      } 
      // Process with LLM or fallback
      else if (isLlmConfigured) {
        try {
          log('info', `Attempting to process with LLM using provider ${llmProvider}...`);
          response = await processWithLLM(content);
          log('info', 'LLM response received');
        } catch (llmError) {
          log('error', 'Error with LLM processing, falling back to basic command processor', llmError);
          // If LLM processing fails, fall back to basic command processing
          response = await processCommandFallback(content);
        }
      } else {
        // No LLM configured, use basic command processing
        log('info', 'No LLM configured, using basic command processor');
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
  
  /**
   * Process a message with the selected LLM using tool calling
   */
  const processWithLLM = async (message) => {
    // Determine which LLM service to use based on settings
    let apiUrl;
    let modelName;
    let useOpenAIFormat = false;
    let provider = llmProvider;
    
    // First check Redux store settings
    if (lmStudioSettings?.defaultModel && lmStudioSettings?.apiUrl) {
      apiUrl = lmStudioSettings.apiUrl;
      modelName = lmStudioSettings.defaultModel;
      useOpenAIFormat = true;
      provider = 'lmStudio';
      log('info', `Using LM Studio from Redux store: ${apiUrl} with model ${modelName}`);
    } else if (ollamaSettings?.defaultModel && ollamaSettings?.apiUrl) {
      apiUrl = ollamaSettings.apiUrl;
      modelName = ollamaSettings.defaultModel;
      useOpenAIFormat = false;
      provider = 'ollama';
      log('info', `Using Ollama from Redux store: ${apiUrl} with model ${modelName}`);
    } else {
      // Try sessionStorage as fallback
      provider = sessionStorage.getItem('lastConfiguredProvider');
      
      if (provider === 'lmStudio') {
        apiUrl = sessionStorage.getItem('lmStudioUrl');
        modelName = sessionStorage.getItem('lmStudioModel');
        useOpenAIFormat = true;
        log('info', `Using LM Studio from sessionStorage: ${apiUrl} with model ${modelName}`);
      } else if (provider === 'ollama') {
        apiUrl = sessionStorage.getItem('ollamaUrl');
        modelName = sessionStorage.getItem('ollamaModel');
        useOpenAIFormat = false;
        log('info', `Using Ollama from sessionStorage: ${apiUrl} with model ${modelName}`);
      } else {
        // No LLM is configured
        log('error', 'No LLM configuration available');
        throw new Error('No LLM model configured. Please check your settings.');
      }
    }
    
    // Final validation to ensure we have all required values
    if (!apiUrl || !modelName) {
      log('error', 'Incomplete LLM configuration', { apiUrl, modelName, provider });
      throw new Error('Incomplete LLM configuration. Please check your settings.');
    }
    
    try {
      // If we're using LM Studio or another OpenAI-compatible API
      if (useOpenAIFormat) {
        const response = await callOpenAICompatibleAPI(apiUrl, modelName, message);
        return response;
      } else {
        // If we're using Ollama
        const response = await callOllamaAPI(apiUrl, modelName, message);
        return response;
      }
    } catch (error) {
      log('error', 'Error in LLM processing', error);
      throw error;
    }
  };
  
  /**
   * Call an OpenAI-compatible API (like LM Studio)
   */
  const callOpenAICompatibleAPI = async (apiUrl, modelName, message) => {
    try {
      log('info', `Calling OpenAI-compatible API at ${apiUrl} with model ${modelName}`);
      
      // Define available functions/tools for the model to call
      const tools = [
        {
          type: "function",
          function: {
            name: "create_workflow",
            description: "Create a new workflow with a specified name and description",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The name for the workflow"
                },
                description: {
                  type: "string",
                  description: "A description of what the workflow does"
                }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_workflow_from_description",
            description: "Generate a complete workflow based on a natural language description",
            parameters: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "A natural language description of the workflow's purpose and components"
                },
                name: {
                  type: "string",
                  description: "Optional name for the workflow. If not provided, a name will be generated"
                }
              },
              required: ["description"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "add_node",
            description: "Add a node to an existing workflow",
            parameters: {
              type: "object",
              properties: {
                workflow_name: {
                  type: "string",
                  description: "The name of the workflow to add the node to"
                },
                node_type: {
                  type: "string",
                  enum: ["agent", "prompt", "output"],
                  description: "The type of node to add"
                },
                node_name: {
                  type: "string",
                  description: "The name for the node"
                },
                configuration: {
                  type: "object",
                  description: "Optional configuration for the node",
                  properties: {}
                }
              },
              required: ["workflow_name", "node_type", "node_name"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "list_workflows",
            description: "List all available workflows",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        },
        {
          type: "function",
          function: {
            name: "run_workflow",
            description: "Run a specific workflow",
            parameters: {
              type: "object",
              properties: {
                workflow_name: {
                  type: "string",
                  description: "The name of the workflow to run"
                }
              },
              required: ["workflow_name"]
            }
          }
        }
      ];
      
      // Prepare the messages including context about available tools
      const messages = [
        {
          role: "system",
          content: `You are an AI assistant that manages workflows and agents in a visual workflow editor. 

CAPABILITIES:
1. You can help users create, list, run, and manage workflows.
2. You can directly create and manage nodes (agent nodes, prompt nodes, output nodes).
3. You can generate complete workflows from natural language descriptions.

ABOUT THE SYSTEM:
This system helps users manage agent workflows consisting of AI agents, prompts, and outputs organized in a directed graph. The workflow editor allows users to visually connect these nodes to create automation pipelines.

- Agent nodes: Represent AI models that can process text inputs
- Prompt nodes: Define templates that feed into agents
- Output nodes: Handle the results from agent processing

FUNCTION CALLING:
When a user asks you to perform any action related to workflows, please use the appropriate function call. Prefer function calling over text responses for actions.

For example:
- If the user asks to create a workflow, use the create_workflow function
- If the user describes a workflow they want to build, use create_workflow_from_description
- If the user wants to add a node, use add_node
- If the user asks to list workflows or run a workflow, use the appropriate function`
        },
        {
          role: "user",
          content: message
        }
      ];
      
      // Add chat history for context (limited to last 10 messages)
      const recentHistory = chatHistory.slice(-10);
      if (recentHistory.length > 0) {
        messages.splice(1, 0, ...recentHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }
      
      log('info', 'Sending request to OpenAI API with payload', {
        model: modelName,
        messagesCount: messages.length
      });
      
      const response = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        {
          model: modelName,
          messages,
          tools,
          temperature: 0.7,
          max_tokens: 800
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      log('info', 'Raw API response received');
      
      const responseMessage = response.data.choices[0].message;
      
      // Check if the response contains a function call
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        log('info', 'Found function calls in response', responseMessage.tool_calls);
        
        // Process each function call
        const firstToolCall = responseMessage.tool_calls[0];
        const functionName = firstToolCall.function.name;
        let functionArgs;
        
        try {
          functionArgs = JSON.parse(firstToolCall.function.arguments);
        } catch (error) {
          log('error', 'Failed to parse function arguments', error);
          functionArgs = {};
        }
        
        // Execute the function based on the name
        let result;
        switch (functionName) {
          case 'create_workflow':
            result = await createWorkflow(functionArgs.name, functionArgs.description);
            break;
          case 'create_workflow_from_description':
            result = await createWorkflowFromDescription(functionArgs.description, functionArgs.name);
            break;
          case 'add_node':
            result = await addNodeToWorkflow(
              functionArgs.workflow_name,
              functionArgs.node_type,
              functionArgs.node_name,
              functionArgs.configuration
            );
            break;
          case 'list_workflows':
            result = await listWorkflows();
            break;
          case 'run_workflow':
            result = await runWorkflow(functionArgs.workflow_name);
            break;
          default:
            result = `Function ${functionName} not implemented`;
        }
        
        return `I've executed your request. ${result}`;
      } else if (responseMessage.content && responseMessage.content.includes('<tool_call>')) {
        // Handle the <tool_call> format
        const match = responseMessage.content.match(/<tool_call>\s*({.*?})\s*<\/tool_call>/s);
        if (match && match[1]) {
          try {
            const toolCall = JSON.parse(match[1]);
            log('info', 'Found tool call in response content', toolCall);
            
            // Execute the function based on the name
            let result;
            switch (toolCall.name) {
              case 'create_workflow':
                result = await createWorkflow(toolCall.arguments.name, toolCall.arguments.description);
                break;
              case 'create_workflow_from_description':
                result = await createWorkflowFromDescription(toolCall.arguments.description, toolCall.arguments.name);
                break;
              case 'add_node':
                result = await addNodeToWorkflow(
                  toolCall.arguments.workflow_name,
                  toolCall.arguments.node_type,
                  toolCall.arguments.node_name,
                  toolCall.arguments.configuration
                );
                break;
              case 'list_workflows':
                result = await listWorkflows();
                break;
              case 'run_workflow':
                result = await runWorkflow(toolCall.arguments.workflow_name);
                break;
              default:
                result = `Function ${toolCall.name} not implemented`;
            }
            
            return `I've executed your request. ${result}`;
          } catch (error) {
            log('error', 'Failed to parse tool call JSON', error);
          }
        }
      }
      
      // If no function calls were found, process the response as before
      return await processLLMResponse(responseMessage.content, message);
    } catch (error) {
      log('error', 'Error calling OpenAI-compatible API', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to connect to LM Studio: ${error.message}`);
    }
  };
  
  /**
   * Create a workflow from a natural language description
   */
  const createWorkflowFromDescription = async (description, providedName = null) => {
    try {
      log('info', `Creating workflow from description: "${description}"`);
      
      // Generate a workflow name if not provided
      const name = providedName || `Workflow-${Date.now()}`;
      
      // Create a notification
      dispatch(addNotification({
        type: 'info',
        message: `Generating workflow "${name}" from description...`
      }));
      
      // First, create the basic workflow
      const newWorkflow = {
        id: `workflow-${Date.now()}`,
        name,
        description,
        nodes: [],
        edges: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      // Save the initial workflow
      await dispatch(saveWorkflowThunk(newWorkflow));
      
      // Get model information for agent nodes
      let modelName = '';
      let apiUrl = '';
      
      // Get model information from settings
      if (llmProvider === 'lmStudio') {
        const sessionUrl = sessionStorage.getItem('lmStudioUrl');
        const sessionModel = sessionStorage.getItem('lmStudioModel');
        
        modelName = sessionModel || lmStudioSettings?.defaultModel || 'default model';
        apiUrl = sessionUrl || lmStudioSettings?.apiUrl || 'http://localhost:1234';
      } else if (llmProvider === 'ollama') {
        const sessionUrl = sessionStorage.getItem('ollamaUrl');
        const sessionModel = sessionStorage.getItem('ollamaModel');
        
        modelName = sessionModel || ollamaSettings?.defaultModel || 'default model';
        apiUrl = sessionUrl || ollamaSettings?.apiUrl || 'http://localhost:11434';
      } else {
        // If no LLM provider is configured, use some default values
        modelName = 'default model';
        apiUrl = 'http://localhost:1234';
      }
      
      // Add 1 second delay to ensure the workflow is saved before adding nodes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use a second LLM call to analyze the description and determine what nodes to create
      const nodeDescriptions = await analyzeWorkflowDescription(description);
      
      // Create all nodes from the descriptions
      let createdNodes = [];
      
      // Create each node from the descriptions
      for (let nodeDesc of nodeDescriptions) {
        const nodeId = `node-${nodeDesc.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        // Calculate position - layout nodes in a logical flow
        const x = 100 + (nodeDesc.position?.x || createdNodes.length * 300);
        const y = 100 + (nodeDesc.position?.y || 0);
        
        // Create node data based on type
        let nodeData = {
          label: nodeDesc.name,
          onEdit: null,
          onDelete: null
        };
        
        switch (nodeDesc.type.toLowerCase()) {
          case 'agent':
            nodeData = {
              ...nodeData,
              modelName: modelName,
              apiAddress: apiUrl,
              inferenceApi: llmProvider || 'lmstudio',
              modelTemperature: nodeDesc.temperature || 0.7,
              maxTokens: nodeDesc.maxTokens || 1024,
              agentDescription: nodeDesc.description || `Agent node for ${nodeDesc.name}`
            };
            break;
          case 'prompt':
            nodeData = {
              ...nodeData,
              promptContent: nodeDesc.content || "Enter your prompt here. Use {{variable}} for dynamic content.",
              promptVariables: nodeDesc.variables || [],
              systemPrompt: nodeDesc.systemPrompt || "System instructions for the prompt."
            };
            break;
          case 'output':
            nodeData = {
              ...nodeData,
              outputType: nodeDesc.outputType || "ui",
              saveToFile: nodeDesc.saveToFile || false,
              outputFilePath: nodeDesc.filePath || ""
            };
            break;
        }
        
        const newNode = {
          id: nodeId,
          type: nodeDesc.type.toLowerCase(),
          position: { x, y },
          data: nodeData
        };
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        createdNodes.push(newNode);
      }
      
      // Create edges based on the node descriptions
      let createdEdges = [];
      
      for (let i = 0; i < nodeDescriptions.length; i++) {
        const nodeDesc = nodeDescriptions[i];
        
        if (nodeDesc.connectsTo) {
          for (let targetName of nodeDesc.connectsTo) {
            // Find the target node by name
            const targetNode = createdNodes.find(n => n.data.label === targetName);
            if (targetNode) {
              const edge = {
                id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                source: createdNodes[i].id,
                target: targetNode.id,
                type: 'default'
              };
              createdEdges.push(edge);
            }
          }
        } else if (i < nodeDescriptions.length - 1) {
          // By default, connect nodes in sequence if no explicit connections
          const edge = {
            id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            source: createdNodes[i].id,
            target: createdNodes[i + 1].id,
            type: 'default'
          };
          createdEdges.push(edge);
        }
      }
      
      // Add all nodes and edges to the workflow
      newWorkflow.nodes = createdNodes;
      newWorkflow.edges = createdEdges;
      
      // Update the workflow with nodes and edges
      log('info', `Saving workflow "${name}" with ${createdNodes.length} nodes and ${createdEdges.length} edges`);
      await dispatch(saveWorkflowThunk(newWorkflow));
      
      // Give final confirmation
      dispatch(addNotification({
        type: 'success',
        message: `Workflow "${name}" created with ${createdNodes.length} nodes and ${createdEdges.length} edges`
      }));
      
      // Store the workflow ID to focus
      sessionStorage.setItem('focusWorkflowId', newWorkflow.id);
      
      // Navigate to the workflow automatically
      setTimeout(() => {
        window.location.href = '/agents';
      }, 1000);
      
      return `Successfully created workflow "${name}" based on your description. It has ${createdNodes.length} nodes connected in a logical flow. You are being redirected to the Agents page to view the workflow.`;
    } catch (error) {
      log('error', 'Error creating workflow from description', error);
      dispatch(addNotification({
        type: 'error',
        message: `Failed to create workflow: ${error.message}`
      }));
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  };
  
  /**
   * Analyze a workflow description and determine what nodes to create
   */
  const analyzeWorkflowDescription = async (description) => {
    try {
      log('info', `Analyzing workflow description: "${description}"`);
      
      // Determine which LLM service to use
      let apiUrl;
      let modelName;
      let useOpenAIFormat = false;
      
      if (lmStudioSettings?.defaultModel && lmStudioSettings?.apiUrl) {
        apiUrl = lmStudioSettings.apiUrl;
        modelName = lmStudioSettings.defaultModel;
        useOpenAIFormat = true;
      } else if (ollamaSettings?.defaultModel && ollamaSettings?.apiUrl) {
        apiUrl = ollamaSettings.apiUrl;
        modelName = ollamaSettings.defaultModel;
        useOpenAIFormat = false;
      } else {
        // Try sessionStorage as fallback
        const provider = sessionStorage.getItem('lastConfiguredProvider');
        
        if (provider === 'lmStudio') {
          apiUrl = sessionStorage.getItem('lmStudioUrl');
          modelName = sessionStorage.getItem('lmStudioModel');
          useOpenAIFormat = true;
        } else if (provider === 'ollama') {
          apiUrl = sessionStorage.getItem('ollamaUrl');
          modelName = sessionStorage.getItem('ollamaModel');
          useOpenAIFormat = false;
        } else {
          throw new Error('No LLM model configured for workflow analysis');
        }
      }
      
      // LLM prompt to analyze the workflow description
      const promptMessages = [
        {
          role: "system",
          content: `You are a workflow design expert. Based on text descriptions, you identify the components needed for a workflow and their relationships. 

Your task is to analyze a user's workflow description and return a JSON array of node objects with these properties:
- name: Descriptive name for the node
- type: One of "prompt", "agent", or "output"
- description: What the node does
- position: {x, y} coordinates (optional)
- connectsTo: Array of node names this node connects to (optional)

For prompt nodes, you can add:
- content: The prompt template content
- variables: Array of variable names used in the prompt
- systemPrompt: System instructions for the prompt

For agent nodes, you can add:
- temperature: Value between 0 and 1 for randomness (default 0.7)
- maxTokens: Maximum output tokens (default 1024)

For output nodes, you can add:
- outputType: "ui", "file", "api", etc.
- saveToFile: Boolean indicating if output should be saved to file
- filePath: Path to save the file if saveToFile is true

The user will provide a description of a workflow they want to build. Your response must be a valid JSON array.`
        },
        {
          role: "user",
          content: `Analyze this workflow description and identify the necessary nodes, their types, and connections. Return a JSON array of node objects:\n\n${description}`
        }
      ];
      
      // Make the LLM call
      const response = await axios.post(
        `${apiUrl}/v1/chat/completions`,
        {
          model: modelName,
          messages: promptMessages,
          temperature: 0.2, // Lower temperature for more consistent results
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );
      
      // Extract the content from the response
      const content = response.data.choices[0].message.content;
      log('info', 'LLM analysis result received', { content });
      
      // Parse the JSON response
      // First, try to extract JSON if it's wrapped in backticks
      let jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/);
      let nodeDescriptions;
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          nodeDescriptions = JSON.parse(jsonMatch[1].trim());
        } catch (error) {
          log('error', 'Failed to parse JSON from markdown code block', error);
          // Try parsing the whole content
          nodeDescriptions = JSON.parse(content);
        }
      } else {
        // If no markdown code blocks, try parsing the whole content
        nodeDescriptions = JSON.parse(content);
      }
      
      if (!Array.isArray(nodeDescriptions)) {
        throw new Error('Invalid node descriptions format: expected an array');
      }
      
      log('info', `Identified ${nodeDescriptions.length} nodes for the workflow`, nodeDescriptions);
      
      // If no nodes were identified, create some default ones
      if (nodeDescriptions.length === 0) {
        nodeDescriptions = [
          {
            name: "Input Prompt",
            type: "prompt",
            description: "User input prompt",
            content: "Process the following input: {{input}}",
            variables: ["input"]
          },
          {
            name: "Processing Agent",
            type: "agent",
            description: "Processes the input data"
          },
          {
            name: "Output Handler",
            type: "output",
            description: "Handles the processed output",
            outputType: "ui"
          }
        ];
      }
      
      return nodeDescriptions;
    } catch (error) {
      log('error', 'Error analyzing workflow description', error);
      // Return default nodes if analysis fails
      return [
        {
          name: "Input Prompt",
          type: "prompt",
          description: "User input prompt",
          content: "Process the following input: {{input}}",
          variables: ["input"]
        },
        {
          name: "Processing Agent",
          type: "agent",
          description: "Processes the input data"
        },
        {
          name: "Output Handler",
          type: "output",
          description: "Handles the processed output",
          outputType: "ui"
        }
      ];
    }
  };
  
  /**
   * Call the Ollama API
   */
  const callOllamaAPI = async (apiUrl, modelName, message, parameters = {}) => {
    try {
      log('info', `Calling Ollama API at ${apiUrl} with model ${modelName}`);
      
      // Prepare the prompt with system context and user message
      const systemPrompt = `You are an AI assistant that manages workflows and agents in a visual workflow editor. 

CAPABILITIES:
1. You can help users create, list, run, and manage workflows.
2. You can directly create and manage agent nodes (prompt nodes, agent nodes, output nodes).
3. You can generate complete workflows from natural language descriptions.

ABOUT THE SYSTEM:
This system helps users manage agent workflows consisting of AI agents, prompts, and outputs organized in a directed graph. The workflow editor allows users to visually connect these nodes to create automation pipelines.

- Agent nodes: Represent AI models that can process text inputs
- Prompt nodes: Define templates that feed into agents
- Output nodes: Handle the results from agent processing

FUNCTION CALLING:
When a user asks you to perform any action related to workflows, please use function calling by creating a JSON object inside <tool_call></tool_call> tags.

The available functions are:
1. create_workflow - Creates a new workflow with specified name
   Parameters: 
   - name: string (required) - The name for the workflow
   - description: string - A description of what the workflow does

2. create_workflow_from_description - Generates a complete workflow based on a description
   Parameters:
   - description: string (required) - Natural language description of the workflow
   - name: string - Optional name for the workflow

3. add_node - Adds a node to an existing workflow
   Parameters:
   - workflow_name: string (required) - Name of the workflow to add the node to
   - node_type: string (required) - Type of node to add (agent, prompt, or output)
   - node_name: string (required) - Name for the node
   - configuration: object - Optional configuration details

4. list_workflows - Lists all available workflows
   Parameters: none

5. run_workflow - Runs a specific workflow
   Parameters:
   - workflow_name: string (required) - Name of the workflow to run

For example, to create a workflow your response should include:
<tool_call>
{"name": "create_workflow", "arguments": {"name": "My Workflow", "description": "This workflow processes data"}}
</tool_call>`;
      
      // Add chat history context if available
      let historyContext = '';
      const recentHistory = chatHistory.slice(-10);
      if (recentHistory.length > 0) {
        historyContext = recentHistory.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n');
        historyContext += '\n\n';
      }
      
      const fullPrompt = `${systemPrompt}\n\n${historyContext}User: ${message}\n\nAssistant:`;
      log('info', 'Sending request to Ollama API', {
        model: modelName,
        promptLength: fullPrompt.length
      });
      
      const response = await axios.post(
        `${apiUrl}/api/generate`,
        {
          model: modelName,
          prompt: fullPrompt,
          temperature: parameters.temperature || 0.7,
          top_p: parameters.topP || 0.9,
          top_k: parameters.topK || 40,
          repeat_penalty: parameters.repeatPenalty || 1.1,
          max_tokens: parameters.maxTokens || 1024,
          context_length: parameters.contextLength || 4096
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      log('info', 'Raw API response received');
      
      // Extract the response content
      const responseContent = response.data.response;
      log('info', 'API response content', { content: responseContent.substring(0, 100) + '...' });
      
      // Check if the response contains a tool call
      const toolCallMatch = responseContent.match(/<tool_call>\s*({.*?})\s*<\/tool_call>/s);
      if (toolCallMatch && toolCallMatch[1]) {
        try {
          const toolCall = JSON.parse(toolCallMatch[1]);
          log('info', 'Found tool call in response content', toolCall);
          
          // Execute the function based on the name
          let result;
          switch (toolCall.name) {
            case 'create_workflow':
              result = await createWorkflow(toolCall.arguments.name, toolCall.arguments.description);
              break;
            case 'create_workflow_from_description':
              result = await createWorkflowFromDescription(toolCall.arguments.description, toolCall.arguments.name);
              break;
            case 'add_node':
              result = await addNodeToWorkflow(
                toolCall.arguments.workflow_name,
                toolCall.arguments.node_type,
                toolCall.arguments.node_name,
                toolCall.arguments.configuration
              );
              break;
            case 'list_workflows':
              result = await listWorkflows();
              break;
            case 'run_workflow':
              result = await runWorkflow(toolCall.arguments.workflow_name);
              break;
            default:
              result = `Function ${toolCall.name} not implemented`;
          }
          
          return `I've executed your request. ${result}`;
        } catch (error) {
          log('error', 'Failed to parse tool call JSON', error);
        }
      }
      
      // Process the response to check for tool calls in the standard pattern-matching way
      return await processLLMResponse(responseContent, message);
    } catch (error) {
      log('error', 'Error calling Ollama API', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to connect to Ollama: ${error.message}`);
    }
  };
  
  /**
   * Process the LLM response to check for tool calls and execute them
   */
  const processLLMResponse = async (responseContent, originalMessage) => {
    // Check for tool call patterns in the response
    const toolPatterns = [
      { pattern: /list workflows/i, action: listWorkflows },
      { pattern: /create workflow ['""]?([^'""\n]+)['""]?/i, action: createWorkflow },
      { pattern: /run workflow ['""]?([^'""\n]+)['""]?/i, action: runWorkflow },
      { pattern: /describe workflow ['""]?([^'""\n]+)['""]?/i, action: describeWorkflow },
      { pattern: /delete workflow ['""]?([^'""\n]+)['""]?/i, action: deleteWorkflow },
      { pattern: /create (?:an?|another) agent node(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (workflowName) => addNodeToWorkflow(workflowName, 'agent', 'New Agent') },
      { pattern: /add (?:an?|another) agent node(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (workflowName) => addNodeToWorkflow(workflowName, 'agent', 'New Agent') },
      { pattern: /add (?:an?|another) node(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (workflowName) => addNodeToWorkflow(workflowName, 'agent', 'New Agent') },
      { pattern: /create (?:an?|another) node(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (workflowName) => addNodeToWorkflow(workflowName, 'agent', 'New Agent') },
      { pattern: /add (?:an?|another) prompt node(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (workflowName) => addNodeToWorkflow(workflowName, 'prompt', 'Prompt Node') },
      { pattern: /add (?:an?|another) output node(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (workflowName) => addNodeToWorkflow(workflowName, 'output', 'Output Node') },
      { pattern: /add node named ['""]?([^'""\n]+)['""]?(?: in workflow ['""]?([^'""\n]+)['""]?)?/i, action: (nodeName, workflowName) => addNodeToWorkflow(workflowName, 'agent', nodeName) },
      { pattern: /create (?:a |an )?demo workflow/i, action: createDemoWorkflow },
      { pattern: /add (?:a |an )?demo workflow/i, action: createDemoWorkflow },
      { pattern: /show workflow ['""]?([^'""\n]+)['""]?/i, action: showWorkflow },
      { pattern: /view workflow ['""]?([^'""\n]+)['""]?/i, action: showWorkflow },
      { pattern: /go to (?:agents|workflows) page/i, action: navigateToAgentsPage },
      { pattern: /show (?:agents|workflows) page/i, action: navigateToAgentsPage },
      { pattern: /open (?:agents|workflows) page/i, action: navigateToAgentsPage },
      { pattern: /agent node/i, action: handleAgentNodeRequest }
    ];
    
    log('info', 'Processing LLM response for tool calls', { contentPreview: responseContent.substring(0, 100) + '...' });
    
    // Check if the response contains tool call patterns
    for (const { pattern, action } of toolPatterns) {
      const match = responseContent.match(pattern);
      if (match) {
        try {
          log('info', `Matched pattern: ${pattern}, executing action with param: ${match[1] || 'none'}`);
          
          // Special handling for node names and workflow names
          if (pattern.toString().includes('node named')) {
            // This pattern captures two groups: nodeName and workflowName
            const result = await action(match[1], match[2]);
            return responseContent.replace(pattern, `I've executed that command. ${result}`);
          } else {
            // Execute the appropriate action with the parameter (if any)
            const result = await action(match[1] || null);
            
            // Return the modified response with the tool result
            return responseContent.replace(pattern, `I've executed that command. ${result}`);
          }
        } catch (error) {
          log('error', 'Error executing tool call', error);
        }
      }
    }
    
    // If no tool patterns were matched, return the original response
    return responseContent;
  };
  
  /**
   * Handle requests related to agent nodes
   */
  const handleAgentNodeRequest = async () => {
    log('info', 'Handling agent node request');
    
    return `
To create or add an agent node to your workflow, follow these steps:

1. Go to the Agents page by clicking "Agents" in the sidebar
2. Select an existing workflow or create a new one if needed
3. Click the "Add Node" button in the top right corner
4. Select "Agent" as the node type
5. Configure the node settings with these options:
   - Agent Name: Give your agent a descriptive name
   - API Endpoint: Choose between LM Studio or Ollama
   - Select a model to power your agent
   - Set temperature, max tokens, and other parameters
6. Click "Create Node" to add it to your workflow

Would you like me to help you create a workflow first? You can use the command "create workflow [name]" to get started.

Note: You need to configure at least one LLM provider in Settings before creating agent nodes.
`;
  };
  
  /**
   * List all workflows
   */
  const listWorkflows = async () => {
    log('info', 'Listing workflows');
    const workflowList = await dispatch(listWorkflowsThunk());
    if (!workflowList || workflowList.length === 0) {
      return "You don't have any workflows yet.";
    }
    
    return `Found ${workflowList.length} workflows.`;
  };
  
  /**
   * Create a new workflow
   */
  const createWorkflow = async (name) => {
    log('info', `Creating workflow: ${name}`);
    if (!name) {
      return "No name was provided.";
    }
    
    const newWorkflow = {
      id: `workflow-${Date.now()}`,
      name,
      nodes: [],
      edges: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    
    await dispatch(saveWorkflowThunk(newWorkflow));
    return `Created a new workflow named "${name}".`;
  };
  
  /**
   * Run a workflow
   */
  const runWorkflow = async (name) => {
    log('info', `Running workflow: ${name}`);
    if (!name) {
      return "No workflow name was provided.";
    }
    
    // Find the workflow
    const workflowList = await dispatch(listWorkflowsThunk());
    const workflow = workflowList.find(wf => wf.name.toLowerCase() === name.toLowerCase());
    
    if (!workflow) {
      log('warn', `Workflow not found: ${name}`);
      return `Couldn't find a workflow named "${name}".`;
    }
    
    await dispatch(runWorkflowThunk(workflow));
    return `Started running workflow "${workflow.name}".`;
  };
  
  /**
   * Describe a workflow
   */
  const describeWorkflow = async (name) => {
    log('info', `Describing workflow: ${name}`);
    if (!name) {
      return "No workflow name was provided.";
    }
    
    // Find the workflow
    const workflowList = await dispatch(listWorkflowsThunk());
    const workflow = workflowList.find(wf => wf.name.toLowerCase() === name.toLowerCase());
    
    if (!workflow) {
      log('warn', `Workflow not found: ${name}`);
      return `Couldn't find a workflow named "${name}".`;
    }
    
    return `Workflow "${workflow.name}" has ${workflow.nodes?.length || 0} nodes and ${workflow.edges?.length || 0} connections.`;
  };
  
  /**
   * Delete a workflow
   */
  const deleteWorkflow = async (name) => {
    log('info', `Deleting workflow: ${name}`);
    if (!name) {
      return "No workflow name was provided.";
    }
    
    // Find the workflow
    const workflowList = await dispatch(listWorkflowsThunk());
    const workflow = workflowList.find(wf => wf.name.toLowerCase() === name.toLowerCase());
    
    if (!workflow) {
      log('warn', `Workflow not found: ${name}`);
      return `Couldn't find a workflow named "${name}".`;
    }
    
    await dispatch(deleteWorkflowThunk(workflow.id));
    return `Deleted workflow "${workflow.name}".`;
  };
  
  /**
   * Show a specific workflow by navigating to it
   */
  const showWorkflow = async (workflowName) => {
    if (!workflowName) {
      return "No workflow name was provided.";
    }
    
    log('info', `Showing workflow: ${workflowName}`);
    
    // Find the workflow
    const workflowList = await dispatch(listWorkflowsThunk());
    const workflow = workflowList.find(wf => wf.name.toLowerCase() === workflowName.toLowerCase());
    
    if (!workflow) {
      log('warn', `Workflow not found: ${workflowName}`);
      return `Couldn't find a workflow named "${workflowName}".`;
    }
    
    // Navigate to the Agents page and store the workflow ID to focus
    sessionStorage.setItem('focusWorkflowId', workflow.id);
    
    // Navigate to the agents page
    setTimeout(() => {
      window.location.href = '/agents';
    }, 500);
    
    return `Showing workflow "${workflow.name}" which has ${workflow.nodes?.length || 0} nodes and ${workflow.edges?.length || 0} connections.`;
  };
  
  /**
   * Create a comprehensive demo workflow
   */
  const createDemoWorkflow = async () => {
    try {
      log('info', 'Creating demo workflow');
      dispatch(addNotification({
        type: 'info',
        message: 'Creating demo workflow...'
      }));
      
      // First, delete any existing "Demo" workflows to start fresh
      const workflowList = await dispatch(listWorkflowsThunk());
      const existingDemos = workflowList.filter(wf => 
        wf.name.toLowerCase().includes('demo') || 
        wf.name.toLowerCase().includes('sentiment')
      );
      
      for (const workflow of existingDemos) {
        log('info', `Removing existing demo workflow: ${workflow.name}`);
        await dispatch(deleteWorkflowThunk(workflow.id));
      }
      
      // Create a new workflow with a unique timestamp to avoid conflicts
      const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
      const demoWorkflow = {
        id: `workflow-demo-${Date.now()}`,
        name: `Complete Demo Workflow`,
        description: "A comprehensive demo workflow showing different node types and connections",
        nodes: [],
        edges: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      log('info', `Creating new demo workflow: ${demoWorkflow.name}`);
      
      // Save the initial workflow
      await dispatch(saveWorkflowThunk(demoWorkflow));
      dispatch(addNotification({
        type: 'success',
        message: `Created workflow "${demoWorkflow.name}"`
      }));
      
      // Get model information for agent nodes
      let modelName = '';
      let apiUrl = '';
      
      // Get model information from settings
      if (llmProvider === 'lmStudio') {
        const sessionUrl = sessionStorage.getItem('lmStudioUrl');
        const sessionModel = sessionStorage.getItem('lmStudioModel');
        
        modelName = sessionModel || lmStudioSettings?.defaultModel || 'default model';
        apiUrl = sessionUrl || lmStudioSettings?.apiUrl || 'http://localhost:1234';
      } else if (llmProvider === 'ollama') {
        const sessionUrl = sessionStorage.getItem('ollamaUrl');
        const sessionModel = sessionStorage.getItem('ollamaModel');
        
        modelName = sessionModel || ollamaSettings?.defaultModel || 'default model';
        apiUrl = sessionUrl || ollamaSettings?.apiUrl || 'http://localhost:11434';
      } else {
        // If no LLM provider is configured, use some default values
        modelName = 'default model';
        apiUrl = 'http://localhost:1234';
      }
      
      log('info', `Using model: ${modelName} at ${apiUrl} for demo nodes`);
      
      // Add 1 second delay to ensure the workflow is saved before adding nodes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create nodes with positions for better visualization
      // Each node has a unique timestamp to avoid ID conflicts
      
      // Input Prompt Node 1
      const promptNode1 = {
        id: `node-prompt-${Date.now()}`,
        type: 'prompt',
        position: { x: 100, y: 100 },
        data: {
          label: "User Input Prompt",
          promptContent: "Analyze the sentiment of the following text: {{text}}",
          promptVariables: ["text"],
          systemPrompt: "You are a sentiment analysis expert. Provide detailed sentiment analysis of user input."
        }
      };
      
      // Add a slight delay between node creations to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Sentiment Analysis Agent Node
      const sentimentAgentNode = {
        id: `node-agent-${Date.now()}`,
        type: 'agent',
        position: { x: 400, y: 100 },
        data: {
          label: "Sentiment Analyzer",
          modelName: modelName,
          apiAddress: apiUrl,
          inferenceApi: llmProvider || 'lmstudio',
          agentDescription: "Analyzes text to determine sentiment (positive, negative, neutral)",
          modelTemperature: 0.3,
          maxTokens: 1024
        }
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Input Prompt Node 2
      const promptNode2 = {
        id: `node-prompt2-${Date.now()}`,
        type: 'prompt',
        position: { x: 100, y: 250 },
        data: {
          label: "Summary Prompt",
          promptContent: "Create a concise summary of this text: {{text}}",
          promptVariables: ["text"],
          systemPrompt: "You are a summarization expert. Create concise and informative summaries."
        }
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Summary Agent Node
      const summaryAgentNode = {
        id: `node-agent-summary-${Date.now()}`,
        type: 'agent',
        position: { x: 400, y: 250 },
        data: {
          label: "Text Summarizer",
          modelName: modelName,
          apiAddress: apiUrl,
          inferenceApi: llmProvider || 'lmstudio',
          agentDescription: "Creates concise summaries of longer text",
          modelTemperature: 0.7,
          maxTokens: 1024
        }
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Output Node
      const outputNode = {
        id: `node-output-${Date.now()}`,
        type: 'output',
        position: { x: 700, y: 175 },
        data: {
          label: "Final Output",
          outputType: "ui",
          saveToFile: false
        }
      };
      
      // Create edges to connect the nodes
      const edge1 = {
        id: `edge-${Date.now()}-1`,
        source: promptNode1.id,
        target: sentimentAgentNode.id,
        type: 'default'
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const edge2 = {
        id: `edge-${Date.now()}-2`,
        source: promptNode2.id,
        target: summaryAgentNode.id,
        type: 'default'
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const edge3 = {
        id: `edge-${Date.now()}-3`,
        source: sentimentAgentNode.id,
        target: outputNode.id,
        type: 'default'
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const edge4 = {
        id: `edge-${Date.now()}-4`,
        source: summaryAgentNode.id,
        target: outputNode.id,
        type: 'default'
      };
      
      // Add all nodes and edges to the workflow
      demoWorkflow.nodes = [promptNode1, sentimentAgentNode, promptNode2, summaryAgentNode, outputNode];
      demoWorkflow.edges = [edge1, edge2, edge3, edge4];
      
      // Update the workflow with nodes and edges
      log('info', 'Saving demo workflow with nodes and edges');
      await dispatch(saveWorkflowThunk(demoWorkflow));
      
      // Give final confirmation
      dispatch(addNotification({
        type: 'success',
        message: `Demo workflow "${demoWorkflow.name}" created with ${demoWorkflow.nodes.length} nodes`
      }));
      
      // Force a refresh of workflows
      await dispatch(listWorkflowsThunk());
      
      // Store the workflow ID to focus
      sessionStorage.setItem('focusWorkflowId', demoWorkflow.id);
      
      // Go to Agents page automatically
      setTimeout(() => {
        window.location.href = '/agents';
      }, 1000);
      
      return `Successfully created comprehensive demo workflow "${demoWorkflow.name}" with ${demoWorkflow.nodes.length} nodes (2 prompts, 2 agents, 1 output) all properly connected.

You are being redirected to the Agents page to view the workflow.`;
    } catch (error) {
      log('error', 'Error creating demo workflow', error);
      dispatch(addNotification({
        type: 'error',
        message: `Failed to create demo workflow: ${error.message}`
      }));
      throw new Error(`Failed to create demo workflow: ${error.message}`);
    }
  };
  
  /**
   * Navigate to the Agents page
   */
  const navigateToAgentsPage = async () => {
    log('info', 'Navigating to Agents page');
    
    // Use window.location to navigate to the Agents page
    setTimeout(() => {
      window.location.href = '/agents';
    }, 500);
    
    return `I'm taking you to the Agents page where you can see all workflows and nodes.`;
  };
  
  /**
   * Fallback command processor when LLM is not available
   * Uses simple string matching for basic commands
   */
  const processCommandFallback = async (message) => {
    // Log that we're using the fallback processor
    log('info', 'Using fallback command processor', { message });
    
    // Convert message to lowercase for easier comparison
    const lowerMessage = message.toLowerCase();
    
    // Help command
    if (lowerMessage === 'help') {
      return `Here are the commands I understand:
- **list workflows**: Shows all saved workflows
- **create workflow [name]**: Creates a new workflow with the given name
- **run workflow [name]**: Executes the specified workflow
- **describe workflow [name]**: Shows details about a workflow
- **delete workflow [name]**: Deletes the specified workflow
- **add agent node [in workflow name]**: Creates a new agent node programmatically
- **add prompt node [in workflow name]**: Creates a new prompt node programmatically
- **add output node [in workflow name]**: Creates a new output node programmatically
- **create demo workflow**: Creates a complete demo workflow with multiple connected nodes
- **create workflow from [description]**: Creates a custom workflow from a natural language description
- **go to agents page**: Opens the Agents page to see workflows and nodes
- **status**: Shows the current system status
- **debug**: Shows detailed debug information
- **diagnose**: Runs diagnostics on LLM configuration and reports results

You can also just describe what kind of workflow you want to create in natural language, and I'll build it for you!`;
    }
    
    // Create workflow from description
    if (lowerMessage.includes('create') && 
        (lowerMessage.includes('workflow from') || 
         lowerMessage.includes('workflow based on') || 
         lowerMessage.includes('workflow using'))) {
      // Extract the description
      let description = message;
      
      const prefixes = [
        'create workflow from',
        'create a workflow from',
        'create workflow based on',
        'create a workflow based on',
        'create workflow using',
        'create a workflow using',
        'build workflow from',
        'build a workflow from',
        'generate workflow from',
        'generate a workflow from'
      ];
      
      for (const prefix of prefixes) {
        if (message.toLowerCase().startsWith(prefix)) {
          description = message.substring(prefix.length).trim();
          break;
        }
      }
      
      if (description === message) {
        // If we didn't find a prefix, use the entire message as the description
        description = message;
      }
      
      try {
        const result = await createWorkflowFromDescription(description);
        return result;
      } catch (error) {
        return `Failed to create workflow from description: ${error.message}. Please try again with a clearer description.`;
      }
    }
    
    // Check if message seems to be describing a workflow without explicit command
    // This is a more advanced feature that uses the LLM to interpret the message
    if (message.length > 30 && 
        (lowerMessage.includes('workflow') || 
         lowerMessage.includes('process') || 
         lowerMessage.includes('node') || 
         lowerMessage.includes('automate'))) {
      
      // It seems like a workflow description - ask for confirmation
      sendMessageToChat(`Your message seems to be describing a workflow. Would you like me to create a workflow based on this description? If so, type "yes" or "create workflow from this".`);
      
      // We'll handle the confirmation response in the next message
      return null;
    }
    
    // Confirmation for creating a workflow
    if (lowerMessage === 'yes' || 
        lowerMessage === 'create workflow from this' || 
        lowerMessage === 'yes, create workflow' || 
        lowerMessage === 'create workflow' || 
        lowerMessage === 'create a workflow') {
      
      // Find the previous message that might contain the workflow description
      const previousMessages = chatHistory.slice(-3).reverse();
      const descriptionMessage = previousMessages.find(msg => 
        msg.role === 'user' && 
        msg.content.length > 30 && 
        msg.content.toLowerCase() !== lowerMessage
      );
      
      if (descriptionMessage) {
        try {
          const result = await createWorkflowFromDescription(descriptionMessage.content);
          return result;
        } catch (error) {
          return `Failed to create workflow from description: ${error.message}. Please try again with a clearer description.`;
        }
      } else {
        return `I couldn't find a recent message with a workflow description. Please describe the workflow you'd like to create in detail.`;
      }
    }
    
    // Create Demo Workflow Command
    if (lowerMessage.includes('demo') && (lowerMessage.includes('workflow') || lowerMessage.includes('create'))) {
      try {
        const result = await createDemoWorkflow();
        return result;
      } catch (error) {
        return `Failed to create demo workflow: ${error.message}. Please try again or check the logs for more details.`;
      }
    }
    
    // Navigate to Agents page
    if (lowerMessage.includes('go to') || lowerMessage.includes('open') || lowerMessage.includes('show')) {
      if (lowerMessage.includes('agent') || lowerMessage.includes('workflow')) {
        return await navigateToAgentsPage();
      }
    }
    
    // Add Node Command - match node types more specifically
    if (lowerMessage.includes('add') && 
        (lowerMessage.includes('node') || 
         lowerMessage.includes('agent') || 
         lowerMessage.includes('prompt') || 
         lowerMessage.includes('output'))) {
      
      // Extract workflow name if provided
      let workflowName = null;
      const workflowMatch = message.match(/(?:in|to) workflow ['""]?([^'""\n]+)['""]?/i);
      if (workflowMatch && workflowMatch[1]) {
        workflowName = workflowMatch[1];
      }
      
      // Extract node name if provided
      let nodeName = "New Node";
      const nodeNameMatch = message.match(/(?:named|called) ['""]?([^'""\n]+)['""]?/i);
      if (nodeNameMatch && nodeNameMatch[1]) {
        nodeName = nodeNameMatch[1];
      }
      
      // Determine node type
      let nodeType = "agent"; // default
      if (lowerMessage.includes('prompt node')) {
        nodeType = "prompt";
      } else if (lowerMessage.includes('output node')) {
        nodeType = "output";
      } else if (lowerMessage.includes('agent node')) {
        nodeType = "agent";
      }
      
      try {
        const result = await addNodeToWorkflow(workflowName, nodeType, nodeName);
        return result;
      } catch (error) {
        return `Failed to add node: ${error.message}. Please try again or check the logs for more details.`;
      }
    }
    
    // Diagnose command
    if (lowerMessage === 'diagnose' || lowerMessage === 'run diagnostics') {
      // Send a message that we're running diagnostics
      sendMessageToChat("Running LLM diagnostics, please wait...");
      
      try {
        const results = await runDiagnostics();
        
        if (results.success) {
          return `## LLM Diagnostics: Success ✅

I've tested the LLM configuration and everything is working properly.

**Active Provider:** ${llmProvider === 'lmStudio' ? 'LM Studio' : 'Ollama'}
**Model:** ${llmProvider === 'lmStudio' ? lmStudioSettings.defaultModel : ollamaSettings.defaultModel}

The LLM is properly configured and I can now provide intelligent responses and generate workflows using natural language.`;
        } else {
          let response = `## LLM Diagnostics: Failed ❌

I've tested the LLM configuration and found some issues:

${results.validation.errors.map(err => `- ${err}`).join('\n')}

`;

          // Add specific provider results
          if (results.lmStudio.connection) {
            response += `\n### LM Studio Check:
- Connection: ${results.lmStudio.connection.success ? '✅ Success' : '❌ Failed'}
${results.lmStudio.connection.error ? `- Error: ${results.lmStudio.connection.error}` : ''}
${results.lmStudio.chat ? `- Chat Test: ${results.lmStudio.chat.success ? '✅ Success' : '❌ Failed'}` : ''}
`;
          }
          
          if (results.ollama.connection) {
            response += `\n### Ollama Check:
- Connection: ${results.ollama.connection.success ? '✅ Success' : '❌ Failed'}
${results.ollama.connection.error ? `- Error: ${results.ollama.connection.error}` : ''}
${results.ollama.chat ? `- Chat Test: ${results.ollama.chat.success ? '✅ Success' : '❌ Failed'}` : ''}
`;
          }
          
          response += `\nPlease check the LLM configuration in Settings to fix these issues.`;
          return response;
        }
      } catch (error) {
        return `Error running diagnostics: ${error.message}. Please try again later.`;
      }
    }
    
    // Debug command
    if (lowerMessage === 'debug' || lowerMessage === 'debug info') {
      dumpDebugInfo();
      return "I've displayed debug information on screen. You can also press Alt+D at any time to see this information.";
    }
    
    // List workflows command
    if (lowerMessage === 'list workflows') {
      const workflowList = await dispatch(listWorkflowsThunk());
      if (!workflowList || workflowList.length === 0) {
        return "You don't have any workflows yet. You can create one with 'create workflow [name]' or describe a workflow you'd like me to build.";
      }
      
      return `Here are your workflows:\n${workflowList.map(wf => `- ${wf.name}`).join('\n')}`;
    }
    
    // Create workflow command
    if (lowerMessage.startsWith('create workflow ') && !lowerMessage.includes('from')) {
      const name = message.substring('create workflow '.length).trim();
      if (!name) {
        return "Please provide a name for the workflow, e.g., 'create workflow My Workflow'";
      }
      
      const newWorkflow = {
        id: Date.now().toString(),
        name,
        nodes: [],
        edges: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      dispatch(saveWorkflowThunk(newWorkflow));
      return `Created a new workflow named "${name}". You can now add nodes and edges to it, or just tell me what this workflow should do and I'll build it for you.`;
    }
    
    // Run workflow command
    if (lowerMessage.startsWith('run workflow ')) {
      const name = message.substring('run workflow '.length).trim();
      
      // Find the workflow
      const workflowList = await dispatch(listWorkflowsThunk());
      const workflow = workflowList.find(wf => wf.name.toLowerCase() === name.toLowerCase());
      
      if (!workflow) {
        return `I couldn't find a workflow named "${name}". Please check the name and try again.`;
      }
      
      dispatch(runWorkflowThunk(workflow));
      return `Running workflow "${workflow.name}"...`;
    }
    
    // Handle specific queries about agent nodes
    if (lowerMessage.includes('agent node') || lowerMessage.includes('create node')) {
      return `To create or add a node to your workflow, you can use these commands:

1. Add specific node types:
   - "add agent node in workflow [name]"
   - "add prompt node in workflow [name]"
   - "add output node in workflow [name]"

2. Create a complete workflow:
   - "create workflow from [description]" - I'll build the entire workflow for you based on your description
   - "create demo workflow" - Creates a pre-configured demo workflow

3. Or simply describe what you want to automate, and I'll analyze your description to build an appropriate workflow!

Note: You need to configure at least one LLM provider in Settings for advanced features.`;
    }
    
    // Status command
    if (lowerMessage === 'status' || lowerMessage.includes('llm status')) {
      // Do a fresh check of LLM configuration
      checkLlmConfiguration(true);
      
      const llmStatus = llmConfigured 
        ? `Using ${llmProvider} with model: ${llmProvider === 'lmStudio' ? lmStudioSettings?.defaultModel : ollamaSettings?.defaultModel}`
        : 'No LLM configured. Using basic command processing.';
        
      const configDetails = llmConfigured
        ? (llmProvider === 'lmStudio' 
            ? `\n- API URL: ${lmStudioSettings?.apiUrl}`
            : `\n- API URL: ${ollamaSettings?.apiUrl}`)
        : '\n- Settings Issue: Model and/or API URL not properly configured';
      
      return `
**System Status**
- LLM: ${llmStatus}${configDetails}
- Workflows: ${workflows.length}
- Active Workflows: ${workflows.filter(wf => wf.status === 'running').length}
- Type "debug" to see detailed debug information

**Settings Check**
- LM Studio Model: ${lmStudioSettings?.defaultModel || 'Not set'}
- LM Studio URL: ${lmStudioSettings?.apiUrl || 'Not set'}
- Ollama Model: ${ollamaSettings?.defaultModel || 'Not set'}
- Ollama URL: ${ollamaSettings?.apiUrl || 'Not set'}

**Enhanced Features**
- Function Calling: ${llmConfigured ? '✓ Available' : '✗ Unavailable'} 
- Workflow Generation: ${llmConfigured ? '✓ Available' : '✗ Unavailable'}
- Natural Language Interface: ${llmConfigured ? '✓ Available' : '✗ Unavailable'}
      `;
    }
    
    // Default response for unrecognized commands
    if (!llmConfigured) {
      return "I'm your Project Manager assistant. I can help you manage agent workflows, but I currently don't have an LLM configured. Please go to Settings to configure an LLM model. For now, I can only respond to basic commands. Type 'help' to see what commands I support or 'status' to check configuration details.";
    } else {
      return "I'm your Project Manager assistant. I can help you manage agent workflows. Type 'help' to see what I can do, or simply describe a workflow you'd like me to create!";
    }
  };
  
  /**
   * Send a message back to the chat widget
   */
  const sendMessageToChat = (content) => {
    log('info', 'Sending message to chat', { contentPreview: content.substring(0, 50) + '...' });
    const event = new CustomEvent('project-manager-message', {
      detail: { content, role: 'assistant' }
    });
    window.dispatchEvent(event);
    
    // Also update local chat history
    setChatHistory(prev => [...prev, { role: 'assistant', content }]);
  };
  
  /**
   * Dump debug info to console and UI
   */
  const dumpDebugInfo = () => {
    const debugInfo = {
      settings,
      lmStudioSettings,
      ollamaSettings,
      llmConfigured,
      llmProvider,
      logs: logRef.current.slice(-20)
    };
    
    log('info', 'Debug info:', debugInfo);
    
    // Create a notification with basic debug info
    dispatch(addNotification({
      type: 'info',
      message: `Debug Info: LLM ${llmConfigured ? 'configured' : 'not configured'}, Provider: ${llmProvider || 'none'}`
    }));
    
    // Create a temporary div to show all debug info
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'fixed';
    debugDiv.style.top = '50px';
    debugDiv.style.left = '50px';
    debugDiv.style.right = '50px';
    debugDiv.style.bottom = '50px';
    debugDiv.style.backgroundColor = 'white';
    debugDiv.style.color = 'black';
    debugDiv.style.padding = '20px';
    debugDiv.style.overflow = 'auto';
    debugDiv.style.zIndex = '10000';
    debugDiv.style.border = '2px solid #333';
    debugDiv.style.borderRadius = '5px';
    
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.padding = '5px 10px';
    closeButton.onclick = () => document.body.removeChild(debugDiv);
    debugDiv.appendChild(closeButton);
    
    // Tabs for different sections
    const tabsContainer = document.createElement('div');
    tabsContainer.style.display = 'flex';
    tabsContainer.style.borderBottom = '1px solid #ccc';
    tabsContainer.style.marginBottom = '10px';
    
    const contentContainer = document.createElement('div');
    
    // Create tabs
    const tabs = [
      { id: 'status', label: 'Status' },
      { id: 'logs', label: 'Logs' },
      { id: 'diagnostics', label: 'Diagnostics' }
    ];
    
    // Tab click handler
    const showTab = (tabId) => {
      // Hide all content
      Array.from(contentContainer.children).forEach(child => {
        child.style.display = 'none';
      });
      
      // Show selected content
      const selectedContent = document.getElementById(`tab-content-${tabId}`);
      if (selectedContent) {
        selectedContent.style.display = 'block';
      }
      
      // Update active tab styling
      Array.from(tabsContainer.children).forEach(tab => {
        tab.style.fontWeight = tab.id === `tab-${tabId}` ? 'bold' : 'normal';
        tab.style.borderBottom = tab.id === `tab-${tabId}` ? '2px solid #2196f3' : 'none';
      });
    };
    
    // Create tab elements
    tabs.forEach(tab => {
      const tabElement = document.createElement('div');
      tabElement.id = `tab-${tab.id}`;
      tabElement.innerText = tab.label;
      tabElement.style.padding = '10px 20px';
      tabElement.style.cursor = 'pointer';
      tabElement.style.userSelect = 'none';
      tabElement.onclick = () => showTab(tab.id);
      tabsContainer.appendChild(tabElement);
    });
    
    debugDiv.appendChild(tabsContainer);
    debugDiv.appendChild(contentContainer);
    
    // Status tab content
    const statusContent = document.createElement('div');
    statusContent.id = 'tab-content-status';
    statusContent.style.display = 'block'; // Show by default
    
    // Add title
    const title = document.createElement('h2');
    title.innerText = 'Project Manager Debug Info';
    statusContent.appendChild(title);
    
    // LLM Status
    const llmStatus = document.createElement('div');
    llmStatus.innerHTML = `<h3>LLM Status</h3>
      <p>Configured: ${llmConfigured ? 'Yes' : 'No'}</p>
      <p>Provider: ${llmProvider || 'None'}</p>
      <p>LM Studio URL: ${lmStudioSettings?.apiUrl || 'Not set'}</p>
      <p>LM Studio Model: ${lmStudioSettings?.defaultModel || 'Not set'}</p>
      <p>Ollama URL: ${ollamaSettings?.apiUrl || 'Not set'}</p>
      <p>Ollama Model: ${ollamaSettings?.defaultModel || 'Not set'}</p>
    `;
    statusContent.appendChild(llmStatus);
    
    // Logs tab content
    const logsContent = document.createElement('div');
    logsContent.id = 'tab-content-logs';
    logsContent.style.display = 'none';
    
    const logsTitle = document.createElement('h3');
    logsTitle.innerText = 'Recent Logs';
    logsContent.appendChild(logsTitle);
    
    const logsDiv = document.createElement('pre');
    logsDiv.style.backgroundColor = '#f5f5f5';
    logsDiv.style.padding = '10px';
    logsDiv.style.overflow = 'auto';
    logsDiv.style.maxHeight = '500px';
    logsDiv.style.fontFamily = 'monospace';
    logsDiv.style.fontSize = '12px';
    
    logRef.current.slice(-30).forEach(entry => {
      const logLine = document.createElement('div');
      logLine.style.marginBottom = '3px';
      logLine.style.color = entry.level === 'error' ? 'red' : entry.level === 'warn' ? 'orange' : 'black';
      
      const time = new Date(entry.timestamp).toLocaleTimeString();
      logLine.textContent = `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`;
      if (entry.data) {
        logLine.textContent += ` ${JSON.stringify(entry.data)}`;
      }
      
      logsDiv.appendChild(logLine);
    });
    
    logsContent.appendChild(logsDiv);
    
    // Diagnostics tab content
    const diagnosticsContent = document.createElement('div');
    diagnosticsContent.id = 'tab-content-diagnostics';
    diagnosticsContent.style.display = 'none';
    
    const diagnosticsTitle = document.createElement('h3');
    diagnosticsTitle.innerText = 'LLM Diagnostics';
    diagnosticsContent.appendChild(diagnosticsTitle);
    
    const runButton = document.createElement('button');
    runButton.innerText = runningDiagnostics ? 'Running diagnostics...' : 'Run Diagnostics';
    runButton.disabled = runningDiagnostics;
    runButton.style.padding = '8px 16px';
    runButton.style.marginBottom = '16px';
    runButton.style.backgroundColor = '#2196f3';
    runButton.style.color = 'white';
    runButton.style.border = 'none';
    runButton.style.borderRadius = '4px';
    runButton.style.cursor = 'pointer';
    
    runButton.onclick = async () => {
      runButton.innerText = 'Running diagnostics...';
      runButton.disabled = true;
      
      // Clear previous results
      const resultsDiv = document.getElementById('diagnostics-results');
      if (resultsDiv) {
        resultsDiv.innerHTML = '<p>Running diagnostics, please wait...</p>';
      }
      
      const results = await runDiagnostics();
      
      // Update results display
      if (resultsDiv) {
        resultsDiv.innerHTML = '';
        
        const summaryDiv = document.createElement('div');
        summaryDiv.innerHTML = `
          <h4>Diagnostic Summary</h4>
          <p style="color: ${results.success ? 'green' : 'red'}">
            <strong>Overall result: ${results.success ? 'Success' : 'Failed'}</strong>
          </p>
          ${results.validation.errors.map(err => `<p style="color: red">${err}</p>`).join('')}
        `;
        resultsDiv.appendChild(summaryDiv);
        
        // Add provider results
        const providers = ['lmStudio', 'ollama'];
        providers.forEach(provider => {
          if (results[provider]?.connection) {
            const providerDiv = document.createElement('div');
            providerDiv.style.marginTop = '15px';
            providerDiv.style.padding = '10px';
            providerDiv.style.backgroundColor = '#f5f5f5';
            providerDiv.style.borderRadius = '4px';
            
            providerDiv.innerHTML = `
              <h4>${provider === 'lmStudio' ? 'LM Studio' : 'Ollama'} Results</h4>
              <p>Connection: ${results[provider].connection.success ? 
                '<span style="color: green">Success</span>' : 
                `<span style="color: red">Failed - ${results[provider].connection.error}</span>`}</p>
              ${results[provider].chat ? 
                `<p>Chat test: ${results[provider].chat.success ? 
                  '<span style="color: green">Success</span>' : 
                  `<span style="color: red">Failed - ${results[provider].chat.error}</span>`}</p>` : 
                ''}
              ${results[provider].connection.success && results[provider].connection.models ?
                `<p>Available models: ${results[provider].connection.models.length}</p>` : ''}
            `;
            
            // Show model response if available
            if (results[provider].chat?.success && results[provider].chat?.message) {
              const responseDiv = document.createElement('div');
              responseDiv.style.marginTop = '10px';
              responseDiv.style.padding = '10px';
              responseDiv.style.backgroundColor = 'white';
              responseDiv.style.border = '1px solid #ddd';
              responseDiv.style.borderRadius = '4px';
              
              responseDiv.innerHTML = `
                <h5>Model Response:</h5>
                <p style="white-space: pre-wrap;">${results[provider].chat.message}</p>
              `;
              providerDiv.appendChild(responseDiv);
            }
            
            resultsDiv.appendChild(providerDiv);
          }
        });
      }
      
      runButton.innerText = 'Run Diagnostics';
      runButton.disabled = false;
    };
    
    diagnosticsContent.appendChild(runButton);
    
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'diagnostics-results';
    
    // Show previous results if available
    if (diagnosticResults) {
      resultsContainer.innerHTML = `
        <h4>Last Diagnostic Results</h4>
        <p>Overall: ${diagnosticResults.success ? 
          '<span style="color: green">Success</span>' : 
          '<span style="color: red">Failed</span>'}</p>
        <p>Timestamp: ${new Date(diagnosticResults.timestamp).toLocaleString()}</p>
      `;
    } else {
      resultsContainer.innerHTML = '<p>No diagnostic results available. Run diagnostics to test the LLM configuration.</p>';
    }
    
    diagnosticsContent.appendChild(resultsContainer);
    
    // Add all tab contents to the container
    contentContainer.appendChild(statusContent);
    contentContainer.appendChild(logsContent);
    contentContainer.appendChild(diagnosticsContent);
    
    document.body.appendChild(debugDiv);
    
    // Show the first tab by default
    showTab('status');
  };
  
  /**
   * Add a node to a workflow programmatically
   */
  const addNodeToWorkflow = async (workflowName, nodeType = 'agent', nodeName = 'New Agent') => {
    try {
      log('info', `Adding a ${nodeType} node named "${nodeName}" to workflow ${workflowName || 'default'}`);
      
      let workflow;
      // Find workflow or create a new one
      const workflowList = await dispatch(listWorkflowsThunk());
      
      if (workflowName) {
        workflow = workflowList.find(wf => wf.name.toLowerCase() === workflowName.toLowerCase());
      }
      
      // If no workflow name was provided or not found, use the first workflow or create one
      if (!workflow) {
        if (workflowList.length > 0) {
          workflow = workflowList[0];
          log('info', `Using existing workflow: ${workflow.name}`);
        } else {
          // Create a new workflow
          const newWorkflowName = workflowName || `Workflow-${Date.now()}`;
          workflow = {
            id: `workflow-${Date.now()}`,
            name: newWorkflowName,
            nodes: [],
            edges: [],
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          };
          
          log('info', `Creating new workflow: ${newWorkflowName}`);
          await dispatch(saveWorkflowThunk(workflow));
          dispatch(addNotification({
            type: 'success',
            message: `Created new workflow "${newWorkflowName}"`
          }));
        }
      }
      
      // Create a new node
      const nodeId = `node-${nodeType}-${Date.now()}`;
      let modelName = '';
      let apiUrl = '';
      
      // Get model information from settings
      if (llmProvider === 'lmStudio') {
        const sessionUrl = sessionStorage.getItem('lmStudioUrl');
        const sessionModel = sessionStorage.getItem('lmStudioModel');
        
        modelName = sessionModel || lmStudioSettings?.defaultModel || '';
        apiUrl = sessionUrl || lmStudioSettings?.apiUrl || '';
      } else if (llmProvider === 'ollama') {
        const sessionUrl = sessionStorage.getItem('ollamaUrl');
        const sessionModel = sessionStorage.getItem('ollamaModel');
        
        modelName = sessionModel || ollamaSettings?.defaultModel || '';
        apiUrl = sessionUrl || ollamaSettings?.apiUrl || '';
      }
      
      // Calculate position based on existing nodes
      const existingNodeCount = workflow.nodes?.length || 0;
      const posX = 100 + (existingNodeCount % 3) * 300;
      const posY = 100 + Math.floor(existingNodeCount / 3) * 150;
      
      // Create node data based on type
      let nodeData = {};
      
      switch(nodeType.toLowerCase()) {
        case 'agent':
          nodeData = {
            label: nodeName,
            modelName: modelName,
            apiAddress: apiUrl,
            inferenceApi: llmProvider || 'lmstudio',
            modelTemperature: 0.7,
            maxTokens: 1024,
            agentDescription: `Agent node for ${nodeName}`,
            onEdit: null,
            onDelete: null
          };
          break;
        case 'prompt':
          nodeData = {
            label: nodeName,
            promptContent: "Enter your prompt here. Use {{variable}} for dynamic content.",
            promptVariables: [],
            systemPrompt: "System instructions for the prompt.",
            onEdit: null,
            onDelete: null
          };
          break;
        case 'output':
          nodeData = {
            label: nodeName,
            outputType: "ui",
            saveToFile: false,
            onEdit: null,
            onDelete: null
          };
          break;
        default:
          nodeData = {
            label: nodeName,
            onEdit: null,
            onDelete: null
          };
      }
      
      const newNode = {
        id: nodeId,
        type: nodeType.toLowerCase(),
        position: { x: posX, y: posY },
        data: nodeData
      };
      
      // Add the node to the workflow
      workflow.nodes = [...(workflow.nodes || []), newNode];
      workflow.modified = new Date().toISOString();
      
      // Save the workflow
      await dispatch(saveWorkflowThunk(workflow));
      
      // Notify user of success
      dispatch(addNotification({
        type: 'success',
        message: `Added ${nodeType} node "${nodeName}" to workflow "${workflow.name}"`
      }));
      
      log('info', `Added ${nodeType} node to workflow ${workflow.name}`);
      
      // Store the workflow ID to focus
      sessionStorage.setItem('focusWorkflowId', workflow.id);
      
      return `Successfully added a ${nodeType} node named "${nodeName}" to workflow "${workflow.name}". You can view and edit it in the Agents page by following this link: [view workflow](javascript:window.location.href='/agents')`;
    } catch (error) {
      log('error', 'Error adding node to workflow', error);
      throw new Error(`Failed to add node: ${error.message}`);
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
    const { message } = event.detail;
    
    if (!message) return;
    
    log('info', `Received Project Manager request: ${message}`);
    
    try {
      // Process the message with the dedicated Project Manager LLM
      const response = await processWithProjectManagerLLM(message);
      
      // Send the response back to the ProjectManagerChat component
      const responseEvent = new CustomEvent('project-manager-message', {
        detail: { message: response }
      });
      window.dispatchEvent(responseEvent);
    } catch (error) {
      log('error', 'Failed to process Project Manager request', error);
      
      // Send error message back to the ProjectManagerChat component
      const errorEvent = new CustomEvent('project-manager-message', {
        detail: { message: 'Sorry, I encountered an error while processing your request. Please try again later.' }
      });
      window.dispatchEvent(errorEvent);
    }
  };
  
  /**
   * Process a message with the dedicated Project Manager LLM
   */
  const processWithProjectManagerLLM = async (message) => {
    // Get Project Manager settings from Redux store
    const projectManagerSettings = settings?.projectManager || {};
    const apiUrl = projectManagerSettings.apiUrl || 'http://localhost:11434';
    const model = projectManagerSettings.model || 'deepscaler:7b';
    const parameters = projectManagerSettings.parameters || {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      maxTokens: 1024,
      contextLength: 4096
    };
    
    log('info', `Processing Project Manager request with model: ${model} and parameters: ${JSON.stringify(parameters)}`);
    
    try {
      // Call the Ollama API with the Project Manager model and parameters
      const response = await callOllamaAPI(apiUrl, model, message, parameters);
      return response;
    } catch (error) {
      log('error', 'Failed to process with Project Manager LLM', error);
      throw error;
    }
  };
  
  // This is a service component with no UI
  return null;
};

export default ProjectManager; 