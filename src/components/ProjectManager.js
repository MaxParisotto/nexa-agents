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
    
    // Check if LLM is configured
    setTimeout(() => {
      checkLlmConfiguration(true);
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
      checkLlmConfiguration(true);
    }
  }, [settings, initialized]);
  
  /**
   * Run diagnostics tests on LLM configuration
   */
  const runDiagnostics = async () => {
    try {
      log('info', 'Running LLM diagnostics...');
      setRunningDiagnostics(true);
      
      const results = await LlmDebugUtil.runDiagnostics(settings);
      
      log('info', 'Diagnostics completed', results);
      setDiagnosticResults(results);
      
      // Update LLM configuration based on diagnostic results
      if (results.success) {
        setLlmConfigured(true);
        
        // Determine which provider to use based on results
        if (results.lmStudio.chat?.success) {
          setLlmProvider('lmStudio');
          log('info', 'LM Studio configuration validated successfully');
        } else if (results.ollama.chat?.success) {
          setLlmProvider('ollama');
          log('info', 'Ollama configuration validated successfully');
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
   * Check if an LLM is properly configured
   */
  const checkLlmConfiguration = (verbose = false) => {
    log('info', 'Checking LLM configuration...');
    
    // First verify settings exist
    if (!settings) {
      log('error', 'Settings object is undefined or null');
      setLlmConfigured(false);
      setLlmProvider(null);
      return false;
    }
    
    // Log raw settings
    if (verbose) {
      log('info', 'Current settings:', settings);
      log('info', 'LM Studio settings:', lmStudioSettings);
      log('info', 'Ollama settings:', ollamaSettings);
    }
    
    // Validate settings using our utility
    const validation = LlmDebugUtil.validateSettings(settings);
    
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
    
    // Configuration is valid, determine which provider to use
    if (validation.details.lmStudio.valid) {
      log('info', `LM Studio configured with model: ${lmStudioSettings.defaultModel} at ${lmStudioSettings.apiUrl}`);
      setLlmConfigured(true);
      setLlmProvider('lmStudio');
      
      // Send notification only if verbose
      if (verbose) {
        dispatch(addNotification({
          type: 'info',
          message: `Project Manager using LM Studio with model: ${lmStudioSettings.defaultModel}`
        }));
      }
      
      // Test connection to LM Studio
      testLmStudioConnection(lmStudioSettings.apiUrl, lmStudioSettings.defaultModel);
      
      return true;
    } else if (validation.details.ollama.valid) {
      log('info', `Ollama configured with model: ${ollamaSettings.defaultModel} at ${ollamaSettings.apiUrl}`);
      setLlmConfigured(true);
      setLlmProvider('ollama');
      
      // Send notification only if verbose
      if (verbose) {
        dispatch(addNotification({
          type: 'info',
          message: `Project Manager using Ollama with model: ${ollamaSettings.defaultModel}`
        }));
      }
      
      // Test connection to Ollama
      testOllamaConnection(ollamaSettings.apiUrl, ollamaSettings.defaultModel);
      
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
    
    // Check LLM configuration status first
    const isLlmConfigured = checkLlmConfiguration();
    
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
          log('info', 'Attempting to process with LLM...');
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
    
    // Select service based on active model and settings
    if (lmStudioSettings?.defaultModel && lmStudioSettings?.apiUrl) {
      apiUrl = lmStudioSettings.apiUrl;
      modelName = lmStudioSettings.defaultModel;
      useOpenAIFormat = true;
      log('info', `Using LM Studio at ${apiUrl} with model ${modelName}`);
    } else if (ollamaSettings?.defaultModel && ollamaSettings?.apiUrl) {
      apiUrl = ollamaSettings.apiUrl;
      modelName = ollamaSettings.defaultModel;
      useOpenAIFormat = false;
      log('info', `Using Ollama at ${apiUrl} with model ${modelName}`);
    } else {
      // No LLM is configured
      log('error', 'No LLM configuration available');
      throw new Error('No LLM model configured. Please check your settings.');
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
      
      // Prepare the messages including context about available tools
      const messages = [
        {
          role: "system",
          content: `You are an AI assistant that manages workflows and agents. You can help users create, list, run, and manage workflows. Available commands include: list workflows, create workflow [name], run workflow [name], describe workflow [name], delete workflow [name], help. This system helps users manage agent workflows consisting of AI agents, prompts, and outputs organized in a directed graph.`
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
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 20000 // 20 second timeout
        }
      );
      
      log('info', 'Raw API response received');
      
      // Extract the response content
      const responseContent = response.data.choices[0].message.content;
      log('info', 'API response content', { content: responseContent.substring(0, 100) + '...' });
      
      // Process the response to check for tool calls
      return await processLLMResponse(responseContent, message);
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
   * Call the Ollama API
   */
  const callOllamaAPI = async (apiUrl, modelName, message) => {
    try {
      log('info', `Calling Ollama API at ${apiUrl} with model ${modelName}`);
      
      // Prepare the prompt with system context and user message
      const systemPrompt = `You are an AI assistant that manages workflows and agents. You can help users create, list, run, and manage workflows. Available commands include: list workflows, create workflow [name], run workflow [name], describe workflow [name], delete workflow [name], help. This system helps users manage agent workflows consisting of AI agents, prompts, and outputs organized in a directed graph.`;
      
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
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 20000 // 20 second timeout
        }
      );
      
      log('info', 'Raw API response received');
      
      // Extract the response content
      const responseContent = response.data.response;
      log('info', 'API response content', { content: responseContent.substring(0, 100) + '...' });
      
      // Process the response to check for tool calls
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
      { pattern: /delete workflow ['""]?([^'""\n]+)['""]?/i, action: deleteWorkflow }
    ];
    
    log('info', 'Processing LLM response for tool calls', { contentPreview: responseContent.substring(0, 100) + '...' });
    
    // Check if the response contains tool call patterns
    for (const { pattern, action } of toolPatterns) {
      const match = responseContent.match(pattern);
      if (match) {
        try {
          log('info', `Matched pattern: ${pattern}, executing action with param: ${match[1] || 'none'}`);
          // Execute the appropriate action with the parameter (if any)
          const result = await action(match[1] || null);
          
          // Return the modified response with the tool result
          return responseContent.replace(
            pattern, 
            `I've executed that command. ${result}`
          );
        } catch (error) {
          log('error', 'Error executing tool call', error);
        }
      }
    }
    
    // If no tool patterns were matched, return the original response
    return responseContent;
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
- **export workflow [name]**: Creates a downloadable file of the workflow
- **status**: Shows the current system status
- **debug**: Shows detailed debug information
- **diagnose**: Runs diagnostics on LLM configuration and reports results`;
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

The LLM is properly configured and I can now provide intelligent responses.`;
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
        return "You don't have any workflows yet. You can create one with 'create workflow [name]'.";
      }
      
      return `Here are your workflows:\n${workflowList.map(wf => `- ${wf.name}`).join('\n')}`;
    }
    
    // Create workflow command
    if (lowerMessage.startsWith('create workflow ')) {
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
      return `Created a new workflow named "${name}". You can now add nodes and edges to it.`;
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
      return `To add an agent node, you'll need to:
1. Go to the Agents page by clicking "Agents" in the sidebar
2. Select or create a workflow
3. Click the "Add Node" button in the top right
4. Select "Agent" as the node type
5. Configure the node settings and click Save

Would you like me to walk you through creating a workflow first?`;
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
      `;
    }
    
    // Default response for unrecognized commands
    if (!llmConfigured) {
      return "I'm your Project Manager assistant. I can help you manage agent workflows, but I currently don't have an LLM configured. Please go to Settings to configure an LLM model. For now, I can only respond to basic commands. Type 'help' to see what commands I support or 'status' to check configuration details.";
    } else {
      return "I'm your Project Manager assistant. I can help you manage agent workflows. Type 'help' to see what I can do.";
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
  
  // This is a service component with no UI
  return null;
};

export default ProjectManager; 