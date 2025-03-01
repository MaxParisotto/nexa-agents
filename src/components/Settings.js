import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels, saveSettings, toggleFeature } from '../store/actions/settingsActions';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import configService from '../services/configService';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  FormControl, 
  FormHelperText, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Select, 
  TextField, 
  Typography, 
  Alert, 
  Link,
  Divider,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Paper,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { HelpOutline, Info, ErrorOutline, CheckCircle, Code, Download, ContentCopy, Assessment, Close as CloseIcon } from '@mui/icons-material';
import { addNotification, addBenchmarkResult } from '../store/actions/systemActions';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';
import { FETCH_MODELS_SUCCESS } from '../store/actions/settingsActions';

const DEFAULT_URLS = {
  lmStudio: 'http://localhost:1234'
};

const FEATURE_DESCRIPTIONS = {
  chatWidget: 'Enable the floating chat widget for direct LLM interactions',
  projectManagerAgent: 'Enable the Project Manager agent for workflow management',
  taskManagement: 'Enable task creation and management features',
  loggingSystem: 'Enable detailed system logging and diagnostics',
  notifications: 'Enable system notifications and alerts',
  metrics: 'Enable performance metrics and monitoring',
  autoSave: 'Automatically save changes to configuration and state',
  debugMode: 'Enable additional debugging features and logging',
  experimentalFeatures: 'Enable experimental and beta features'
};

// Add this at the top of the file with other constants
const DEFAULT_PARAMETERS = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  maxTokens: 1024,
  contextLength: 4096
};

  const initialFormData = {
    projectManager: {
      apiUrl: '',
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
    },
  lmStudio: { apiUrl: '', defaultModel: '' }
  };

// Add validateSettings function before handleSave
const validateSettings = (settings) => {
  const errors = {
    lmStudio: { apiUrl: '', defaultModel: '' },
    ollama: { apiUrl: '', defaultModel: '' },
    projectManager: { apiUrl: '', model: '' }
  };
  
  let isValid = true;

  // Validate LM Studio settings
  if (!settings.lmStudio?.apiUrl) {
    errors.lmStudio.apiUrl = 'API URL is required';
    isValid = false;
  } else if (!settings.lmStudio.apiUrl.startsWith('http')) {
    errors.lmStudio.apiUrl = 'API URL must start with http:// or https://';
    isValid = false;
  }

  // Validate Ollama settings
  if (!settings.ollama?.apiUrl) {
    errors.ollama.apiUrl = 'API URL is required';
    isValid = false;
  } else if (!settings.ollama.apiUrl.startsWith('http')) {
    errors.ollama.apiUrl = 'API URL must start with http:// or https://';
    isValid = false;
  }

  // Validate Project Manager settings
  if (!settings.projectManager?.apiUrl) {
    errors.projectManager.apiUrl = 'API URL is required';
    isValid = false;
  } else if (!settings.projectManager.apiUrl.startsWith('http')) {
    errors.projectManager.apiUrl = 'API URL must start with http:// or https://';
    isValid = false;
  }

  if (!settings.projectManager?.model) {
    errors.projectManager.model = 'Model is required';
    isValid = false;
  }

  // Validate parameters for Project Manager
  if (settings.projectManager?.parameters) {
    const params = settings.projectManager.parameters;
    if (params.temperature < 0 || params.temperature > 2) {
      errors.projectManager.parameters = 'Temperature must be between 0 and 2';
      isValid = false;
    }
    if (params.topP < 0 || params.topP > 1) {
      errors.projectManager.parameters = 'Top P must be between 0 and 1';
      isValid = false;
    }
    if (params.topK < 1 || params.topK > 100) {
      errors.projectManager.parameters = 'Top K must be between 1 and 100';
      isValid = false;
    }
    if (params.repeatPenalty < 1 || params.repeatPenalty > 2) {
      errors.projectManager.parameters = 'Repeat penalty must be between 1 and 2';
      isValid = false;
    }
    if (params.maxTokens < 128 || params.maxTokens > 4096) {
      errors.projectManager.parameters = 'Max tokens must be between 128 and 4096';
      isValid = false;
    }
    if (params.contextLength < 512 || params.contextLength > 8192) {
      errors.projectManager.parameters = 'Context length must be between 512 and 8192';
      isValid = false;
    }
  }

  return {
    isValid,
    errors
  };
};

const Settings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  
  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 8) return 'success.main';
    if (score >= 5) return 'warning.main';
    return 'error.main';
  };
  
  const [formData, setFormData] = useState({
    lmStudio: {
      apiUrl: settings?.lmStudio?.apiUrl || DEFAULT_URLS.lmStudio,
      defaultModel: settings?.lmStudio?.defaultModel || ''
    },
    ollama: {
      apiUrl: settings?.ollama?.apiUrl || DEFAULT_URLS.ollama,
      defaultModel: settings?.ollama?.defaultModel || ''
    },
    projectManager: {
      apiUrl: settings?.projectManager?.apiUrl || '',
      model: settings?.projectManager?.model || '',
      serverType: settings?.projectManager?.serverType || 'lmStudio',
      parameters: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        maxTokens: 1024,
        contextLength: 4096
      }
    },
    nodeEnv: settings?.nodeEnv || 'development',
    port: settings?.port || '3001'
  });
  
  // State for benchmark functionality
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalRef = useRef(null);
  const terminalContainerRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);
  
  const [validationErrors, setValidationErrors] = useState({
    lmStudio: { apiUrl: '', defaultModel: '' },
    ollama: { apiUrl: '', defaultModel: '' },
    projectManager: { apiUrl: '', model: '' }
  });

  // Check if services were manually loaded (via user interaction)
  const [servicesManuallyLoaded, setServicesManuallyLoaded] = useState({
    lmStudio: false,
    ollama: false,
    projectManager: false
  });

  const [configFormat, setConfigFormat] = useState('json');
  const [configValue, setConfigValue] = useState('');
  const [isConfigValid, setIsConfigValid] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  
  // Track last operation to prevent repeated calls
  const [lastOperation, setLastOperation] = useState({
    type: null,
    timestamp: 0,
    result: null
  });
  
  // Add a terminal refresh interval state
  const [terminalRefreshInterval, setTerminalRefreshInterval] = useState(null);

  // Initialize featureStates with default values from Redux store
  const [featureStates, setFeatureStates] = useState(() => {
    // Get initial values from Redux store or use defaults
    const storeFeatures = settings?.features || {};
    return {
      chatWidget: storeFeatures.chatWidget ?? true,
      projectManagerAgent: storeFeatures.projectManagerAgent ?? true,
      taskManagement: storeFeatures.taskManagement ?? true,
      loggingSystem: storeFeatures.loggingSystem ?? true,
      notifications: storeFeatures.notifications ?? true,
      metrics: storeFeatures.metrics ?? true,
      autoSave: storeFeatures.autoSave ?? true,
      debugMode: storeFeatures.debugMode ?? false,
      experimentalFeatures: storeFeatures.experimentalFeatures ?? false
    };
  });

  const [manualModelInput, setManualModelInput] = useState('');
  
  // Function to handle adding a manual model
  const handleAddManualModel = () => {
    if (!manualModelInput) return;
    
    const provider = 'projectManager';
    const normalizedInput = manualModelInput.trim();
    
    // Get current models array for this provider
    const currentModels = settings[provider]?.models || [];
    
    // Check if model already exists
    if (currentModels.includes(normalizedInput)) {
      dispatch(addNotification({
        type: 'info',
        message: `Model "${normalizedInput}" already exists.`
      }));
      return;
    }
    
    // Add the new model to the list
    const updatedModels = [...currentModels, normalizedInput];
    
    // Update Redux store
    dispatch({
      type: FETCH_MODELS_SUCCESS,
      payload: {
        provider,
        models: updatedModels
      }
    });
    
    // Save to localStorage for persistence - regular models cache
    try {
      const storedModels = JSON.parse(localStorage.getItem('nexa_models') || '{}');
      localStorage.setItem('nexa_models', JSON.stringify({
        ...storedModels,
        [provider]: updatedModels
      }));
    } catch (error) {
      console.error('Error saving models to localStorage:', error);
    }
    
    // Also save to provider-specific localStorage key for the API client
    try {
      localStorage.setItem(`${provider}Models`, JSON.stringify(updatedModels));
    } catch (error) {
      console.error('Error saving to provider models cache:', error);
    }
    
    // Also maintain a separate list of manually added models
    try {
      const manualModels = JSON.parse(localStorage.getItem('projectManager_manual_models') || '[]');
      if (!manualModels.includes(normalizedInput)) {
        manualModels.push(normalizedInput);
        localStorage.setItem('projectManager_manual_models', JSON.stringify(manualModels));
      }
    } catch (error) {
      console.error('Error saving to manual models list:', error);
    }
    
    // Set the model in the form
    handleInputChange(provider, 'model', normalizedInput);
    
    // Show success notification
    dispatch(addNotification({
      type: 'success',
      message: `Model "${normalizedInput}" added successfully.`
    }));
    
    // Clear the input
    setManualModelInput('');
    
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Manually added model for ${provider}: ${normalizedInput}`));
  };
  
  // Handle benchmark button click
  const handleBenchmark = async () => {
    if (!formData.projectManager.model) {
      dispatch(addNotification({
        type: 'error',
        message: 'Please select a model to benchmark'
      }));
      return;
    }
    
    setIsBenchmarking(true);
    setBenchmarkResults(null);
    setShowTerminal(true);
    
    // Create a helper function to ensure terminal writes are flushed
    const writeToTerminal = (text) => {
      if (terminalInstance.current) {
        terminalInstance.current.write(text);
        // Force a redraw by triggering a resize event
        if (fitAddon.current) {
          fitAddon.current.fit();
          // Force browser to repaint
          setTimeout(() => {
            if (terminalContainerRef.current) {
              // Force a reflow
              terminalContainerRef.current.style.display = 'none';
              // This line forces a reflow
              void terminalContainerRef.current.offsetHeight;
              terminalContainerRef.current.style.display = 'block';
            }
          }, 5);
        }
      }
    };
    
    try {
      // Wait a moment for the terminal container to be visible in the DOM
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize terminal
      if (!terminalInstance.current && terminalContainerRef.current) {
        try {
          // Make sure the terminal container is visible
          terminalContainerRef.current.style.display = 'block';
          
          terminalInstance.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            rows: 20,
            cols: 100,
            theme: {
              background: '#1e1e1e',
              foreground: '#f0f0f0',
              cursor: '#f0f0f0',
              selection: 'rgba(255, 255, 255, 0.3)',
              black: '#000000',
              red: '#e06c75',
              green: '#98c379',
              yellow: '#e5c07b',
              blue: '#61afef',
              magenta: '#c678dd',
              cyan: '#56b6c2',
              white: '#d0d0d0'
            }
          });
          
          fitAddon.current = new FitAddon();
          terminalInstance.current.loadAddon(fitAddon.current);
          terminalInstance.current.open(terminalContainerRef.current);
          
          // Force initial fit
          fitAddon.current.fit();
        } catch (error) {
          console.error('Error initializing terminal:', error);
          dispatch(addNotification({
            type: 'error',
            message: 'Failed to initialize terminal: ' + error.message
          }));
          throw error; // Re-throw to exit the benchmark
        }
      }
      
      // Set up a refresh interval for the terminal
      if (terminalRefreshInterval) {
        clearInterval(terminalRefreshInterval);
      }
      const refreshInterval = setInterval(() => {
        if (terminalInstance.current && fitAddon.current && terminalContainerRef.current) {
          fitAddon.current.fit();
        }
      }, 500);
      setTerminalRefreshInterval(refreshInterval);
      
      // Wait a moment for the terminal to be fully initialized
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Clear terminal and write initial content
      if (terminalInstance.current) {
        terminalInstance.current.clear();
        writeToTerminal('\x1b[1;32m=== Benchmark Started ===\x1b[0m\r\n\n');
        writeToTerminal(`\x1b[1;36mModel:\x1b[0m ${formData.projectManager.model}\r\n`);
        writeToTerminal(`\x1b[1;36mAPI URL:\x1b[0m ${formData.projectManager.apiUrl}\r\n`);
        writeToTerminal(`\x1b[1;36mServer Type:\x1b[0m ${formData.projectManager.serverType || 'ollama'}\r\n`);
        writeToTerminal(`\x1b[1;36mParameters:\x1b[0m\r\n`);
        Object.entries(formData.projectManager.parameters).forEach(([key, value]) => {
          writeToTerminal(`  - ${key}: ${value}\r\n`);
        });
        writeToTerminal('\r\n');
      }
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Starting benchmark for model: ${formData.projectManager.model}`));
      
      // Notify user
      dispatch(addNotification({
        type: 'info',
        message: `Benchmarking ${formData.projectManager.model}. This may take a minute...`
      }));
      
      // Get server type
      const serverType = formData.projectManager.serverType || 'ollama';
      
      // Check if the server is available
      if (terminalInstance.current) {
        writeToTerminal(`\x1b[33mChecking ${serverType === 'lmStudio' ? 'LM Studio' : 'Ollama'} server availability...\x1b[0m\r\n`);
      }
      
      try {
        // Use different endpoints based on server type
        const versionEndpoint = serverType === 'lmStudio' ? '/v1/models' : '/api/version';
        const serverCheckResponse = await axios.get(`${formData.projectManager.apiUrl}${versionEndpoint}`);
        
        if (terminalInstance.current) {
          if (serverType === 'lmStudio') {
            writeToTerminal(`\x1b[32mLM Studio server is available\x1b[0m\r\n\n`);
          } else {
            writeToTerminal(`\x1b[32mOllama server is available (version: ${serverCheckResponse.data.version})\x1b[0m\r\n\n`);
          }
        }
      } catch (serverCheckError) {
        if (terminalInstance.current) {
          writeToTerminal(`\x1b[31mError: ${serverType === 'lmStudio' ? 'LM Studio' : 'Ollama'} server is not available at ${formData.projectManager.apiUrl}\x1b[0m\r\n`);
          writeToTerminal(`\x1b[31mDetails: ${serverCheckError.message}\x1b[0m\r\n\n`);
        }
        
        throw new Error(`${serverType === 'lmStudio' ? 'LM Studio' : 'Ollama'} server is not available at ${formData.projectManager.apiUrl}: ${serverCheckError.message}`);
      }
      
      // Check if the model exists
      if (terminalInstance.current) {
        writeToTerminal(`\x1b[33mVerifying model exists...\x1b[0m\r\n`);
      }
      
      try {
        // Use different endpoints based on server type
        const modelsEndpoint = serverType === 'lmStudio' ? '/v1/models' : '/api/tags';
        const modelCheckResponse = await axios.get(`${formData.projectManager.apiUrl}${modelsEndpoint}`);
        
        let availableModels = [];
        if (serverType === 'lmStudio') {
          // Extract models from LM Studio response
          if (modelCheckResponse.data && modelCheckResponse.data.data && Array.isArray(modelCheckResponse.data.data)) {
            availableModels = modelCheckResponse.data.data.map(model => model.id);
          }
        } else {
          // Extract models from Ollama response
          if (modelCheckResponse.data && modelCheckResponse.data.models && Array.isArray(modelCheckResponse.data.models)) {
            availableModels = modelCheckResponse.data.models.map(model => model.name);
          }
        }
        
        if (!availableModels.includes(formData.projectManager.model)) {
          if (terminalInstance.current) {
            writeToTerminal(`\x1b[31mError: Model "${formData.projectManager.model}" not found in available models.\x1b[0m\r\n`);
            writeToTerminal(`\x1b[33mAvailable models: ${availableModels.join(', ')}\x1b[0m\r\n\n`);
          }
          
          throw new Error(`Model "${formData.projectManager.model}" not found. Available models: ${availableModels.join(', ')}`);
        }
        
        if (terminalInstance.current) {
          writeToTerminal(`\x1b[32mModel verified. Proceeding with benchmark...\x1b[0m\r\n\n`);
        }
      } catch (modelCheckError) {
        if (terminalInstance.current) {
          writeToTerminal(`\x1b[31mError checking model: ${modelCheckError.message}\x1b[0m\r\n\n`);
          writeToTerminal(`\x1b[33mProceeding with benchmark anyway...\x1b[0m\r\n\n`);
        }
        
        // Log the error but continue with the benchmark
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, `Error checking model: ${modelCheckError.message}`));
      }
      
      // Run benchmark tests
      const results = await runModelBenchmark(
        formData.projectManager.apiUrl, 
        formData.projectManager.model,
        formData.projectManager.parameters
      );
      
      setBenchmarkResults(results);
      
      // Save benchmark results to localStorage and Redux store
      try {
        // Add timestamp to results
        const resultsWithTimestamp = {
          ...results,
          timestamp: new Date().toISOString()
        };
        
        // Dispatch to Redux store
        dispatch(addBenchmarkResult(resultsWithTimestamp));
        
        // Save to localStorage
        const storedBenchmarks = localStorage.getItem('benchmarkResults');
        let benchmarks = [];
        
        if (storedBenchmarks) {
          try {
            benchmarks = JSON.parse(storedBenchmarks);
            if (!Array.isArray(benchmarks)) benchmarks = [];
          } catch (e) {
            benchmarks = [];
          }
        }
        
        // Add new result to the beginning of the array
        benchmarks.unshift(resultsWithTimestamp);
        
        // Keep only the last 10 results
        benchmarks = benchmarks.slice(0, 10);
        
        // Save back to localStorage
        localStorage.setItem('benchmarkResults', JSON.stringify(benchmarks));
        
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Benchmark results saved to localStorage and Redux store'));
      } catch (saveError) {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Failed to save benchmark results', saveError));
      }
      
      // Write final results to terminal
      if (terminalInstance.current) {
        writeToTerminal('\x1b[1;32m=== Benchmark Completed ===\x1b[0m\r\n\n');
        writeToTerminal(`\x1b[1;33mOverall Score:\x1b[0m ${results.averageScore.toFixed(1)}/10\r\n`);
        writeToTerminal(`\x1b[1;33mAverage Latency:\x1b[0m ${results.averageLatency.toFixed(0)}ms\r\n`);
        writeToTerminal(`\x1b[1;33mTokens/sec:\x1b[0m ${results.averageTokensPerSecond.toFixed(1)}\r\n`);
        writeToTerminal(`\x1b[1;33mTotal Time:\x1b[0m ${(results.totalTime / 1000).toFixed(1)}s\r\n\n`);
      }
      
      dispatch(addNotification({
        type: 'success',
        message: `Benchmark completed for ${formData.projectManager.model}`
      }));
    } catch (error) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Benchmark failed', error));
      
      // Write error to terminal
      if (terminalInstance.current) {
        writeToTerminal('\x1b[1;31m=== Benchmark Failed ===\x1b[0m\r\n\n');
        writeToTerminal(`\x1b[1;31mError:\x1b[0m ${error.message}\r\n`);
      }
      
      dispatch(addNotification({
        type: 'error',
        message: `Benchmark failed: ${error.message}`
      }));
    } finally {
      setIsBenchmarking(false);
      // Clear the refresh interval
      if (terminalRefreshInterval) {
        clearInterval(terminalRefreshInterval);
        setTerminalRefreshInterval(null);
      }
    }
  };
  
  // Run model benchmark
  const runModelBenchmark = async (apiUrl, modelName, parameters) => {
    // Determine server type from the current form data
    const serverType = formData.projectManager.serverType || 'ollama';
    
    // Create a helper function to ensure terminal writes are flushed
    const writeToTerminal = (text) => {
      if (terminalInstance.current) {
        terminalInstance.current.write(text);
        // Force a redraw by triggering a resize event
        if (fitAddon.current) {
          fitAddon.current.fit();
          // Force browser to repaint
          setTimeout(() => {
            if (terminalContainerRef.current) {
              // Force a reflow
              terminalContainerRef.current.style.display = 'none';
              // This line forces a reflow
              void terminalContainerRef.current.offsetHeight;
              terminalContainerRef.current.style.display = 'block';
            }
          }, 5);
        }
      }
    };
    
    // Prepare benchmark tests
    const tests = [
      {
        name: "Reasoning",
        prompt: "If John has 5 apples and gives 2 to Mary, then buys 3 more and gives half of his apples to Tom, how many apples does John have left?",
        evaluateFunc: (response) => {
          // Check if the answer is correct (3 apples)
          return response.toLowerCase().includes("3") ? 10 : 
                 response.toLowerCase().includes("three") ? 10 : 0;
        }
      },
      {
        name: "Function Calling",
        prompt: "Please call the create_workflow function to create a workflow named 'Test Workflow'",
        evaluateFunc: (response) => {
          // Check if response contains function call syntax
          const hasFunctionCall = response.includes("create_workflow") && 
                                 (response.includes("tool_call") || 
                                  response.includes("function") || 
                                  response.includes("arguments"));
          return hasFunctionCall ? 10 : 0;
        }
      },
      {
        name: "Instruction Following",
        prompt: "Respond with exactly one word: banana",
        evaluateFunc: (response) => {
          // Check if response is exactly "banana"
          const cleaned = response.trim().toLowerCase();
          if (cleaned === "banana") return 10;
          if (cleaned.includes("banana")) return 5;
          return 0;
        }
      }
    ];
    
    const startTime = Date.now();
    let totalTokens = 0;
    const results = [];
    
    // Write test plan to terminal
    if (terminalInstance.current) {
      writeToTerminal('\x1b[1;33mRunning Tests:\x1b[0m\r\n');
      tests.forEach((test, index) => {
        writeToTerminal(`  ${index + 1}. ${test.name}\r\n`);
      });
      writeToTerminal('\r\n');
    }
    
    /**
     * Helper function to handle streaming responses
     * @param {string} apiUrl - The API URL
     * @param {string} modelName - The model name
     * @param {string} prompt - The prompt to send
     * @param {object} parameters - The model parameters
     * @returns {Promise<string>} - The concatenated response
     */
    const handleStreamingRequest = async (apiUrl, modelName, prompt, parameters) => {
      if (terminalInstance.current) {
        writeToTerminal(`\x1b[90mAttempting streaming request as fallback...\x1b[0m\r\n`);
      }
      
      try {
        // Use different endpoints based on server type
        const endpoint = serverType === 'lmStudio' ? '/v1/chat/completions' : '/api/generate';
        const payload = serverType === 'lmStudio' ? 
          {
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            stream: true,
            temperature: parameters?.temperature || 0.7,
            top_p: parameters?.topP || 0.9,
            max_tokens: parameters?.maxTokens || 1024
          } : 
          {
            model: modelName,
            prompt: prompt,
            stream: true,
            temperature: parameters?.temperature || 0.7,
            top_p: parameters?.topP || 0.9,
            top_k: parameters?.topK || 40,
            repeat_penalty: parameters?.repeatPenalty || 1.1,
            max_tokens: parameters?.maxTokens || 1024
          };
        
        // Make a raw fetch request to handle streaming
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (!response.body) {
          throw new Error('Response body is null');
        }
        
        // Set up a reader to read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let responseChunks = [];
        
        // Read the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          responseChunks.push(chunk);
          
          // Log progress
          if (terminalInstance.current && responseChunks.length % 10 === 0) {
            writeToTerminal('.');
          }
        }
        
        // Process all chunks
        const combinedText = responseChunks.join('');
        const lines = combinedText.split('\n').filter(line => line.trim());
        
        // Extract the response text from each JSON object
        let extractedText = '';
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              extractedText += data.response;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
        
        if (terminalInstance.current) {
          writeToTerminal('\r\x1b[K'); // Clear the line
          writeToTerminal(`\x1b[32mStreaming response received (${extractedText.length} chars)\x1b[0m\r\n`);
        }
        
        return extractedText;
      } catch (error) {
        if (terminalInstance.current) {
          writeToTerminal(`\x1b[31mStreaming request failed: ${error.message}\x1b[0m\r\n`);
        }
        throw error;
      }
    };
    
    // Run each test
    for (const [index, test] of tests.entries()) {
      const testStartTime = Date.now();
      
      // Write test start to terminal
      if (terminalInstance.current) {
        writeToTerminal(`\x1b[1;34m[${index + 1}/${tests.length}] Running test: ${test.name}...\x1b[0m\r\n`);
        writeToTerminal(`\x1b[90mPrompt: ${test.prompt}\x1b[0m\r\n`);
        writeToTerminal(`\x1b[33mWaiting for response...\x1b[0m`);
      }
      
      try {
        // Call API based on server type
        if (terminalInstance.current) {
          const endpoint = serverType === 'lmStudio' ? '/v1/chat/completions' : '/api/generate';
          writeToTerminal(`\x1b[90mSending request to ${apiUrl}${endpoint}...\x1b[0m\r\n`);
        }
        
        // Add a timeout promise to handle cases where the API doesn't respond
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timed out after 30 seconds')), 30000);
        });
        
        let responseText = '';
        let testEndTime;
        
        try {
          // First try with non-streaming request
          // Create the API call promise with the appropriate endpoint and payload
          const endpoint = serverType === 'lmStudio' ? '/v1/chat/completions' : '/api/generate';
          const payload = serverType === 'lmStudio' ? 
            {
              model: modelName,
              messages: [{ role: "user", content: test.prompt }],
              stream: false,
              temperature: parameters?.temperature || 0.7,
              top_p: parameters?.topP || 0.9,
              max_tokens: parameters?.maxTokens || 1024
            } : 
            {
              model: modelName,
              prompt: test.prompt,
              temperature: parameters?.temperature || 0.7,
              top_p: parameters?.topP || 0.9,
              top_k: parameters?.topK || 40,
              repeat_penalty: parameters?.repeatPenalty || 1.1,
              max_tokens: parameters?.maxTokens || 1024,
              stream: false
            };
          
          const apiCallPromise = axios.post(
            `${apiUrl}${endpoint}`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
          
          // Race the API call against the timeout
          const response = await Promise.race([apiCallPromise, timeoutPromise]);
          
          testEndTime = Date.now();
          
          // Debug the response structure
          if (terminalInstance.current) {
            writeToTerminal('\r\x1b[K'); // Clear the line
            writeToTerminal(`\x1b[36mDebug - Response structure: ${JSON.stringify(Object.keys(response.data))}\x1b[0m\r\n`);
          }
          
          // Handle different response formats
          
          // Handle different response formats based on server type
          if (serverType === 'lmStudio') {
            if (response.data && response.data.choices && response.data.choices.length > 0) {
              // LM Studio/OpenAI format
              responseText = response.data.choices[0].message?.content || response.data.choices[0].text || '';
            } else {
              throw new Error(`Invalid LM Studio response structure: ${JSON.stringify(response.data)}`);
            }
          } else {
            // Ollama format
            if (response.data && response.data.response) {
              responseText = response.data.response;
            } else if (response.data && typeof response.data === 'string') {
              responseText = response.data;
            } else if (response.data && Array.isArray(response.data)) {
              responseText = response.data.map(item => item.response || '').join('');
            } else if (response.data && typeof response.data === 'object') {
              // If it's a streaming response that was collected as a single object
              if (terminalInstance.current) {
                writeToTerminal(`\x1b[33mWarning: Received unexpected response format. Attempting to extract content.\x1b[0m\r\n`);
              }
              
              // Try to extract any text content from the object
              const dataStr = JSON.stringify(response.data);
              const matches = dataStr.match(/"response":"([^"]*)"/g);
              if (matches && matches.length > 0) {
                responseText = matches.map(m => m.replace(/"response":"/, '').replace(/"$/, '')).join('');
              } else {
                // Last resort - use the stringified data
                responseText = `Unable to parse response: ${dataStr.substring(0, 100)}...`;
              }
            } else {
              throw new Error(`Invalid Ollama response structure: ${JSON.stringify(response.data)}`);
            }
          }
        } catch (nonStreamingError) {
          // If non-streaming request fails, try with streaming as fallback
          if (terminalInstance.current) {
            writeToTerminal('\r\x1b[K'); // Clear the line
            writeToTerminal(`\x1b[33mNon-streaming request failed: ${nonStreamingError.message}\x1b[0m\r\n`);
          }
          
          // Try streaming request as fallback
          const startStreamTime = Date.now();
          responseText = await handleStreamingRequest(apiUrl, modelName, test.prompt, parameters);
          testEndTime = Date.now();
          
          if (!responseText) {
            throw new Error('Both non-streaming and streaming requests failed');
          }
        }
        
        // Safely calculate tokens generated
        let tokensGenerated = 0;
        
        try {
          // Try to get token count from response if available (non-streaming case)
          if (response && response.data && response.data.eval_count) {
            tokensGenerated = response.data.eval_count;
            if (terminalInstance.current) {
              writeToTerminal(`\x1b[90mToken count from API: ${tokensGenerated}\x1b[0m\r\n`);
            }
          } 
          // Otherwise estimate based on whitespace (works for both streaming and non-streaming)
          else if (responseText && typeof responseText === 'string') {
            tokensGenerated = responseText.split(/\s+/).length;
            if (terminalInstance.current) {
              writeToTerminal(`\x1b[90mEstimated token count: ${tokensGenerated}\x1b[0m\r\n`);
            }
          } else {
            // If we can't determine tokens, use a default value
            tokensGenerated = 10;
            if (terminalInstance.current) {
              writeToTerminal(`\x1b[33mWarning: Could not determine token count, using default value\x1b[0m\r\n`);
            }
          }
        } catch (tokenError) {
          // Fallback if token calculation fails
          tokensGenerated = responseText ? Math.ceil(responseText.length / 4) : 10;
          if (terminalInstance.current) {
            writeToTerminal(`\x1b[33mWarning: Error calculating tokens, using estimate: ${tokensGenerated}\x1b[0m\r\n`);
          }
        }
        
        totalTokens += tokensGenerated;
        
        // Calculate metrics
        const latency = testEndTime - testStartTime;
        const tokensPerSecond = tokensGenerated / (latency / 1000);
        
        // Safely evaluate the response
        let score = 0;
        try {
          if (responseText && typeof responseText === 'string') {
            score = test.evaluateFunc(responseText);
          } else {
            if (terminalInstance.current) {
              writeToTerminal(`\x1b[33mWarning: Response is not a string, cannot evaluate\x1b[0m\r\n`);
            }
          }
        } catch (evalError) {
          if (terminalInstance.current) {
            writeToTerminal(`\x1b[33mWarning: Error evaluating response: ${evalError.message}\x1b[0m\r\n`);
          }
        }
        
        // Clear the "Waiting for response..." line and write results to terminal
        if (terminalInstance.current) {
          writeToTerminal('\r\x1b[K'); // Clear the line
          writeToTerminal(`\x1b[32mResponse received in ${(latency / 1000).toFixed(2)}s\x1b[0m\r\n`);
          
          // Safely display response text
          if (responseText && typeof responseText === 'string') {
            writeToTerminal(`\x1b[90m${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}\x1b[0m\r\n`);
          } else {
            writeToTerminal(`\x1b[33mWarning: Response is not a string\x1b[0m\r\n`);
            writeToTerminal(`\x1b[90m${JSON.stringify(response.data).substring(0, 100)}...\x1b[0m\r\n`);
          }
          
          // Write score with color based on value
          let scoreColor = '31'; // Red
          if (score >= 8) scoreColor = '32'; // Green
          else if (score >= 5) scoreColor = '33'; // Yellow
          
          writeToTerminal(`\x1b[1;${scoreColor}mScore: ${score}/10\x1b[0m\r\n`);
          writeToTerminal(`Tokens/sec: ${tokensPerSecond.toFixed(1)}\r\n\n`);
        }
        
        results.push({
          name: test.name,
          score,
          latency,
          tokensPerSecond,
          response: responseText && typeof responseText === 'string' 
            ? responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
            : JSON.stringify(response.data).substring(0, 100) + '...'
        });
      } catch (error) {
        // Clear the "Waiting for response..." line and write error to terminal
        if (terminalInstance.current) {
          writeToTerminal('\r\x1b[K'); // Clear the line
          
          // Provide more detailed error information
          let errorMessage = error.message;
          let errorDetails = '';
          let responseData = null;
          
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            errorMessage = `Server error: ${error.response.status}`;
            errorDetails = JSON.stringify(error.response.data);
            responseData = error.response.data;
          } else if (error.request) {
            // The request was made but no response was received
            errorMessage = 'No response received from server';
            errorDetails = 'Check if the Ollama server is running and accessible';
          }
          
          // Check if the error contains streaming response data
          if (errorMessage.includes('Invalid response structure') && error.message.includes('"response":')) {
            try {
              // Try to extract the streamed responses
              const streamedData = error.message.split('\n')
                .filter(line => line.trim().startsWith('{') && line.includes('"response"'))
                .map(line => {
                  try {
                    return JSON.parse(line);
                  } catch (e) {
                    return null;
                  }
                })
                .filter(item => item !== null);
              
              if (streamedData.length > 0) {
                // Extract the text from the streamed responses
                const extractedText = streamedData
                  .map(item => item.response || '')
                  .join('');
                
                if (extractedText) {
                  writeToTerminal(`\x1b[33mDetected streaming response. Extracted content:\x1b[0m\r\n`);
                  writeToTerminal(`\x1b[90m${extractedText.substring(0, 200)}${extractedText.length > 200 ? '...' : ''}\x1b[0m\r\n`);
                  
                  // Try to evaluate the extracted text
                  let score = 0;
                  try {
                    score = test.evaluateFunc(extractedText);
                    
                    // Calculate approximate metrics
                    const latency = testEndTime - testStartTime;
                    const tokensGenerated = extractedText.split(/\s+/).length;
                    const tokensPerSecond = tokensGenerated / (latency / 1000);
                    
                    // Add the result with the extracted text
                    results.push({
                      name: test.name,
                      score,
                      latency,
                      tokensPerSecond,
                      response: extractedText.substring(0, 100) + (extractedText.length > 100 ? '...' : '')
                    });
                    
                    // Write score with color based on value
                    let scoreColor = '31'; // Red
                    if (score >= 8) scoreColor = '32'; // Green
                    else if (score >= 5) scoreColor = '33'; // Yellow
                    
                    writeToTerminal(`\x1b[1;${scoreColor}mScore: ${score}/10\x1b[0m\r\n`);
                    writeToTerminal(`Tokens/sec: ${tokensPerSecond.toFixed(1)}\r\n\n`);
                    
                    // Skip the rest of the error handling
                    return;
                  } catch (evalError) {
                    writeToTerminal(`\x1b[33mWarning: Error evaluating extracted response: ${evalError.message}\x1b[0m\r\n`);
                  }
                }
              }
            } catch (parseError) {
              writeToTerminal(`\x1b[33mWarning: Failed to parse streaming response: ${parseError.message}\x1b[0m\r\n`);
            }
          }
          
          writeToTerminal(`\x1b[31mError: ${errorMessage}\x1b[0m\r\n`);
          if (errorDetails) {
            writeToTerminal(`\x1b[31mDetails: ${errorDetails}\x1b[0m\r\n`);
          }
          writeToTerminal('\n');
        }
        
        results.push({
          name: test.name,
          score: 0,
          latency: 0,
          tokensPerSecond: 0,
          error: error.message
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const averageLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const averageTokensPerSecond = results.reduce((sum, r) => sum + r.tokensPerSecond, 0) / results.length;
    
    // Write summary to terminal
    if (terminalInstance.current) {
      writeToTerminal('\x1b[1;35m=== Summary ===\x1b[0m\r\n');
      writeToTerminal(`Total time: ${(totalTime / 1000).toFixed(2)}s\r\n`);
      writeToTerminal(`Average score: ${averageScore.toFixed(1)}/10\r\n`);
      writeToTerminal(`Average latency: ${averageLatency.toFixed(0)}ms\r\n`);
      writeToTerminal(`Average tokens/sec: ${averageTokensPerSecond.toFixed(1)}\r\n\n`);
    }
    
    return {
      model: modelName,
      timestamp: new Date().toISOString(),
      totalTime,
      totalTokens,
      averageScore,
      averageLatency,
      averageTokensPerSecond,
      tests: results
    };
  };
  
  // Handle parameter change
  const handleParameterChange = (param, value) => {
    setFormData(prev => ({
      ...prev,
      projectManager: {
        ...prev.projectManager,
        parameters: {
          ...prev.projectManager.parameters,
          [param]: value
        }
      }
    }));
  };

  useEffect(() => {
    // Log current settings on component mount - but only once
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings component mounted'));
    
    // Load saved settings from localStorage
    try {
      const savedSettings = localStorage.getItem('nexa-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // Update form data with saved settings
        setFormData(prev => ({
          lmStudio: {
            apiUrl: parsedSettings.lmStudio?.apiUrl || DEFAULT_URLS.lmStudio,
            defaultModel: parsedSettings.lmStudio?.defaultModel || ''
          },
          ollama: {
            apiUrl: parsedSettings.ollama?.apiUrl || DEFAULT_URLS.ollama,
            defaultModel: parsedSettings.ollama?.defaultModel || ''
          },
          projectManager: {
            apiUrl: parsedSettings.projectManager?.apiUrl || '',
            model: parsedSettings.projectManager?.model || '',
            serverType: parsedSettings.projectManager?.serverType || 'lmStudio',
            parameters: parsedSettings.projectManager?.parameters || DEFAULT_PARAMETERS
          },
          nodeEnv: parsedSettings.nodeEnv || 'development',
          port: parsedSettings.port || '3001'
        }));

        // Update feature states
        if (parsedSettings.features) {
          setFeatureStates(parsedSettings.features);
        }

        // Update Redux store
        dispatch(saveSettings(parsedSettings));
      }
    } catch (error) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Error loading saved settings', error));
    }
    
    // Try to load config from file as backup
    loadConfigFromFile();
    
    // Generate config from settings as fallback
    generateConfigFromSettings();
    
    // Cleanup function
    return () => {
      // Log when component unmounts
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings component unmounted'));
      
      // Clear any terminal refresh interval
      if (terminalRefreshInterval) {
        clearInterval(terminalRefreshInterval);
      }
    };
  }, [terminalRefreshInterval]);
  
  // Debounce config generation to prevent excessive updates
  useEffect(() => {
    const timer = setTimeout(() => {
      generateConfigFromSettings();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [formData, configFormat]);
  
  const generateConfigFromSettings = () => {
    const config = {
      lmStudio: {
        apiUrl: formData.lmStudio.apiUrl,
        defaultModel: formData.lmStudio.defaultModel
      },
      ollama: {
        apiUrl: formData.ollama.apiUrl,
        defaultModel: formData.ollama.defaultModel
      },
      projectManager: {
        apiUrl: formData.projectManager?.apiUrl || '',
        model: formData.projectManager?.model || '',
        serverType: formData.projectManager?.serverType || 'lmStudio',
        parameters: formData.projectManager?.parameters || DEFAULT_PARAMETERS
      },
      features: featureStates,  // Include feature states
      nodeEnv: formData.nodeEnv,
      port: formData.port
    };

    try {
      // Save to localStorage for persistence
      localStorage.setItem('nexa-settings', JSON.stringify(config));

      if (configFormat === 'json') {
        setConfigValue(JSON.stringify(config, null, 2));
      } else {
        // Simple YAML conversion
        let yamlStr = '';
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'object') {
            yamlStr += `${key}:\n`;
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (typeof subValue === 'object') {
                yamlStr += `  ${subKey}:\n`;
                Object.entries(subValue).forEach(([subSubKey, subSubValue]) => {
                  yamlStr += `    ${subSubKey}: ${subSubValue}\n`;
                });
              } else {
                yamlStr += `  ${subKey}: ${subValue || '""'}\n`;
              }
            });
          } else {
            yamlStr += `${key}: ${value}\n`;
          }
        });
        setConfigValue(yamlStr);
      }
      setIsConfigValid(true);
    } catch (error) {
      console.error('Error generating config:', error);
      setIsConfigValid(false);
    }
  };
  
  const handleEditorChange = (value) => {
    setConfigValue(value);
    
    try {
      // Validate and update settings
      if (configFormat === 'json') {
        const parsedConfig = JSON.parse(value);
        updateSettingsFromConfig(parsedConfig);
        setIsConfigValid(true);
      } else {
        // Basic YAML validation and parsing
        // In a real app, you'd use a proper YAML parser library
        setIsConfigValid(true);
        // For demo, we're not implementing full YAML parsing
        // updateSettingsFromConfig(yamlParse(value));
      }
    } catch (error) {
      console.error('Invalid config format:', error);
      setIsConfigValid(false);
    }
  };
  
  const updateSettingsFromConfig = (config) => {
    if (!config) return;
    
    const newFormData = { ...formData };
    
    // Update form data if properties exist in config
    if (config.lmStudio) {
      if (config.lmStudio.apiUrl) newFormData.lmStudio.apiUrl = config.lmStudio.apiUrl;
      if (config.lmStudio.defaultModel) newFormData.lmStudio.defaultModel = config.lmStudio.defaultModel;
    }
    
    if (config.ollama) {
      if (config.ollama.apiUrl) newFormData.ollama.apiUrl = config.ollama.apiUrl;
      if (config.ollama.defaultModel) newFormData.ollama.defaultModel = config.ollama.defaultModel;
    }
    
    if (config.projectManager) {
      if (config.projectManager.apiUrl) newFormData.projectManager.apiUrl = config.projectManager.apiUrl;
      if (config.projectManager.model) newFormData.projectManager.model = config.projectManager.model;
      if (config.projectManager.serverType) newFormData.projectManager.serverType = config.projectManager.serverType;
    }
    
    if (config.nodeEnv) newFormData.nodeEnv = config.nodeEnv;
    if (config.port) newFormData.port = config.port;
    
    setFormData(newFormData);
  };
  
  const handleFormatChange = (event, newFormat) => {
    setConfigFormat(newFormat);
    
    // Try to load the configuration for the selected format
    setTimeout(() => {
      loadConfigFromFile();
    }, 100);
  };
  
  const handleCopyConfig = () => {
    navigator.clipboard.writeText(configValue);
    dispatch(addNotification({
      type: 'success',
      message: 'Configuration copied to clipboard!'
    }));
  };
  
  const handleDownloadConfig = () => {
    const filename = `nexa-config.${configFormat}`;
    const blob = new Blob([configValue], { type: 'text/plain' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    dispatch(addNotification({
      type: 'success',
      message: `Configuration downloaded as ${filename}`
    }));
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleTestConnection = (provider) => {
    let apiUrl, modelName, serverType;
    
    if (provider === 'lmStudio') {
      apiUrl = formData.lmStudio.apiUrl;
      modelName = formData.lmStudio.defaultModel;
      serverType = 'lmStudio';
    } else if (provider === 'ollama') {
      apiUrl = formData.ollama.apiUrl;
      modelName = formData.ollama.defaultModel;
      serverType = 'ollama';
    } else if (provider === 'projectManager') {
      apiUrl = formData.projectManager.apiUrl;
      modelName = formData.projectManager.model;
      serverType = formData.projectManager.serverType || 'lmStudio';
    }
    
    // Log the connection attempt with more detail
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Testing connection to ${provider} at ${apiUrl}`, { 
      serverType,
      provider,
      apiUrl
    }));
    
    if (!apiUrl) {
      setValidationErrors(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          apiUrl: 'API URL is required'
        }
      }));
      return;
    }
    
    // Show notification that we're testing the connection
    dispatch(addNotification({
      type: 'info',
      message: `Testing connection to ${provider}...`
    }));
    
    // For Project Manager, explicitly passing the server type is important
    // This ensures it uses the correct backend for model discovery
    dispatch(fetchModels(provider, apiUrl, serverType))
      .then(models => {
        if (models && models.length > 0) {
          // Show success notification
          dispatch(addNotification({
            type: 'success',
            message: `Successfully connected to ${provider} and found ${models.length} models`
          }));
          
          // Mark this service as manually loaded
          setServicesManuallyLoaded(prev => ({
            ...prev,
            [provider]: true
          }));
          
          // If no model is selected and we have models, select the first one
          if (!modelName && models.length > 0) {
            if (provider === 'projectManager') {
              // For Project Manager, try to find a suitable model based on server type
              let selectedModel = null;
              
              // Select appropriate model based on server type
              if (serverType === 'lmStudio') {
                // For LM Studio, prefer qwen models
                selectedModel = models.find(m => 
                  m.toLowerCase().includes('qwen') || 
                  m.toLowerCase().includes('mixtral') ||
                  m.toLowerCase().includes('llama') ||
                  m.toLowerCase().includes('mistral')
                );
              } else {
                // For Ollama, prefer llama or mistral models
                selectedModel = models.find(m => 
                  m.toLowerCase().includes('llama') || 
                  m.toLowerCase().includes('mistral') ||
                  m.toLowerCase().includes('mixtral')
                );
              }
              
              // If no preferred model found, use the first one
              if (!selectedModel) {
                selectedModel = models[0];
              }
              
              handleInputChange(provider, 'model', selectedModel);
              dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Selected model for Project Manager: ${selectedModel}`));
            } else {
              handleInputChange(provider, 'defaultModel', models[0]);
              dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Selected model for ${provider}: ${models[0]}`));
            }
          }
        } else {
          // Show warning if no models were found
          dispatch(addNotification({
            type: 'warning',
            message: `Connected to ${provider} but found no models. Please check if models are installed or add a model manually.`
          }));
        }
      })
      .catch(error => {
        // This catch block handles any errors not caught by the fetchModels function
        dispatch(logError(LOG_CATEGORIES.SETTINGS, `Error in handleTestConnection for ${provider}:`, error));
        dispatch(addNotification({
          type: 'error',
          message: `Failed to connect to ${provider}: ${error.message}`
        }));
      });
  };

  const validateForm = (formData) => {
    const errors = {
      projectManager: { apiUrl: '', model: '' },
      lmStudio: { apiUrl: '' }
    };

    // Validate Project Manager
    if (!formData.projectManager.apiUrl) {
      errors.projectManager.apiUrl = 'API URL is required';
    } else if (!formData.projectManager.apiUrl.startsWith('http')) {
      errors.projectManager.apiUrl = 'API URL must start with http:// or https://';
    }

    // Validate LM Studio
    if (!formData.lmStudio.apiUrl) {
      errors.lmStudio.apiUrl = 'API URL is required';
    } else if (!formData.lmStudio.apiUrl.startsWith('http')) {
      errors.lmStudio.apiUrl = 'API URL must start with http:// or https://';
    }

    return errors;
  };

  const handleInputChange = (provider, field, value) => {
    setFormData(prev => {
      const newValue = value || '';
      return {
        ...prev,
        [provider]: {
          ...prev[provider],
          [field]: newValue
        }
      }
    });
    
    // Clear validation errors when user types
    setValidationErrors(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: ''
      }
    }));
  };

  const handleSave = async () => {
    try {
      // Validate settings
      const validationResult = validateSettings(formData);
      if (!validationResult.isValid) {
        setValidationErrors(validationResult.errors);
        dispatch(addNotification({
          type: 'error',
          message: 'Please fix validation errors before saving'
        }));
        return;
      }

      // Prepare complete configuration object
      const completeConfig = {
        lmStudio: {
          apiUrl: formData.lmStudio.apiUrl,
          defaultModel: formData.lmStudio.defaultModel
        },
        ollama: {
          apiUrl: formData.ollama.apiUrl,
          defaultModel: formData.ollama.defaultModel
        },
        projectManager: {
          apiUrl: formData.projectManager.apiUrl,
          model: formData.projectManager.model,
          serverType: formData.projectManager.serverType,
          parameters: formData.projectManager.parameters
        },
        features: featureStates,
        nodeEnv: formData.nodeEnv,
        port: formData.port
      };

      // Save to localStorage
      localStorage.setItem('nexa-settings', JSON.stringify(completeConfig));

      // Save settings to Redux store
      await dispatch(saveSettings(completeConfig));

      // Save to config file
      try {
        await configService.saveConfigToFile(completeConfig, 'json');
        dispatch(addNotification({
          type: 'success',
          message: 'Settings saved successfully to configuration file'
        }));
      } catch (fileError) {
        dispatch(logWarning(
          LOG_CATEGORIES.SETTINGS,
          'Failed to save to config file, but settings are saved in application state',
          fileError
        ));
        dispatch(addNotification({
          type: 'warning',
          message: 'Settings saved in application but failed to update config file'
        }));
      }

      // Update validation state
      setValidationErrors({
        lmStudio: { apiUrl: '', defaultModel: '' },
        ollama: { apiUrl: '', defaultModel: '' },
        projectManager: { apiUrl: '', model: '' }
      });

    } catch (error) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to save settings', error));
      dispatch(addNotification({
        type: 'error',
        message: `Failed to save settings: ${error.message}`
      }));
    }
  };

  const handleUseDefault = (provider) => {
    if (provider === 'lmStudio') {
      setFormData(prev => ({
        ...prev,
        lmStudio: {
          apiUrl: DEFAULT_URLS.lmStudio,
          defaultModel: prev.lmStudio.defaultModel
        }
      }));
    } else if (provider === 'ollama') {
      setFormData(prev => ({
        ...prev,
        ollama: {
          apiUrl: DEFAULT_URLS.ollama,
          defaultModel: prev.ollama.defaultModel
        }
      }));
    } else if (provider === 'projectManager') {
      // Use the appropriate default URL based on server type
      const serverType = formData.projectManager.serverType || 'lmStudio';
      const defaultUrl = DEFAULT_URLS[serverType];
      
      setFormData(prev => ({
        ...prev,
        projectManager: {
          ...prev.projectManager,
          apiUrl: defaultUrl,
          // Keep the existing model or use a default based on server type
          model: prev.projectManager.model || (serverType === 'lmStudio' ? '' : 'qwen2.5-7b-instruct-1m'),
          serverType: serverType
        }
      }));
    }
  };

  const loadConfigFromFile = async () => {
    setIsLoadingFile(true);
    setFileError('');
    
    try {
      const config = await configService.loadConfigFromFile('json');
      
      // Update form data with loaded configuration
      setFormData(prev => ({
        ...prev,
        lmStudio: {
          apiUrl: config.lmStudio?.apiUrl || DEFAULT_URLS.lmStudio,
          defaultModel: config.lmStudio?.defaultModel || ''
        },
        ollama: {
          apiUrl: config.ollama?.apiUrl || DEFAULT_URLS.ollama,
          defaultModel: config.ollama?.defaultModel || ''
        },
        projectManager: {
          apiUrl: config.projectManager?.apiUrl || '',
          model: config.projectManager?.model || '',
          serverType: config.projectManager?.serverType || 'lmStudio'
        },
        nodeEnv: config.nodeEnv || 'development',
        port: config.port || '3001'
      }));

      // Update Redux store
      dispatch(saveSettings(config));

      dispatch(addNotification({
        type: 'success',
        message: 'Configuration loaded successfully'
      }));

    } catch (error) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to load configuration', error));
      setFileError('Failed to load configuration: ' + error.message);
      
      dispatch(addNotification({
        type: 'error',
        message: 'Error loading configuration: ' + error.message
      }));
    } finally {
      setIsLoadingFile(false);
    }
  };

  const saveConfigToFile = async () => {
    if (!isConfigValid) {
      dispatch(addNotification({
        type: 'error',
        message: 'Cannot save invalid configuration'
      }));
      return;
    }
    
    // Rate limiting - don't save if we just saved in the last 3 seconds
    const now = Date.now();
    if (lastOperation.type === 'save' && now - lastOperation.timestamp < 3000) {
      console.log('Skipping repeated save operation');
      dispatch(addNotification({
        type: 'info',
        message: 'Configuration already saved'
      }));
      return;
    }
    
    setIsSavingFile(true);
    setFileError('');
    
    try {
      // First, check if the server is available
      const serverAvailable = await configService.checkServerAvailability(true);
      
      if (!serverAvailable) {
        // Still save to localStorage but inform the user
        if (configFormat === 'json') {
          const configObj = JSON.parse(configValue);
          configService.saveConfigToLocalStorage(configObj);
        }
        
        throw new Error('Server is not available. Configuration saved to browser storage only.');
      }
      
      let configToSave;
      
      if (configFormat === 'json') {
        // Parse JSON content to get an object
        configToSave = JSON.parse(configValue);
        // Also save to localStorage for redundancy
        configService.saveConfigToLocalStorage(configToSave);
      } else {
        // For YAML, we'd need to parse it first
        // But for now we'll just save the raw content
        configToSave = configValue;
      }
      
      const result = await configService.saveConfigToFile(configToSave, configFormat);
      
      // Update the last operation
      setLastOperation({
        type: 'save',
        timestamp: now,
        result: configToSave
      });
      
      // Check response properties
      if (result.rateLimited) {
        dispatch(addNotification({
          type: 'info',
          message: 'Configuration saved to browser storage only (rate limited)'
        }));
      } else if (result.serverUnavailable) {
        dispatch(addNotification({
          type: 'warning',
          message: 'Server unavailable - Configuration saved to browser storage only'
        }));
      } else {
        dispatch(addNotification({
          type: 'success',
          message: `Configuration saved to file: config/nexa-config.${configFormat}`
        }));
      }
    } catch (error) {
      // Different handling based on error type
      if (error.message.includes('Server is not available')) {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Server unavailable for configuration saving', error));
        setFileError('Server unavailable - saved to browser storage only');
        
        dispatch(addNotification({
          type: 'warning',
          message: 'Server unavailable - Configuration saved to browser storage only'
        }));
      } else {
        dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Error saving configuration to file', error));
        setFileError('Failed to save configuration file: ' + error.message);
        
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to save configuration: ' + (error.message || 'Unknown error')
        }));
      }
    } finally {
      setIsSavingFile(false);
    }
  };

  const renderProviderCard = (provider, title, description) => {
    const providerData = settings[provider] || {};
    const isLoading = providerData.loading;
    const error = providerData.error;
    const models = providerData.models || [];
    const hasTestedConnection = servicesManuallyLoaded[provider];
    const isConfigured = formData[provider]?.apiUrl && 
      (provider === 'projectManager' ? formData[provider]?.model : formData[provider]?.defaultModel);
    
    // Define modelField based on provider type
    const modelField = provider === 'projectManager' ? 'model' : 'defaultModel';

    // Ensure parameters exist for Project Manager
    if (provider === 'projectManager' && !formData.projectManager?.parameters) {
      setFormData(prev => ({
        ...prev,
        projectManager: {
          ...prev.projectManager,
          parameters: { ...DEFAULT_PARAMETERS }
        }
      }));
      return null; // Return null once to avoid the error while state updates
    }

    // Get parameters safely
    const parameters = provider === 'projectManager' ? 
      (formData.projectManager?.parameters || DEFAULT_PARAMETERS) : 
      null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ mr: 1 }}>
              {title} Settings
            </Typography>
            {isConfigured && <CheckCircle color="success" fontSize="small" />}
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            {/* Add server type selector for Project Manager */}
            {provider === 'projectManager' && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="server-type-label">Server Type</InputLabel>
                  <Select
                    labelId="server-type-label"
                    value={formData.projectManager.serverType || 'ollama'}
                    onChange={(e) => handleInputChange('projectManager', 'serverType', e.target.value)}
                    label="Server Type"
                  >
                    <MenuItem value="ollama">Ollama</MenuItem>
                    <MenuItem value="lmStudio">LM Studio</MenuItem>
                  </Select>
                  <FormHelperText>
                    Select the type of server you're connecting to
                  </FormHelperText>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={formData[provider].apiUrl || ''}
                  onChange={(e) => handleInputChange(provider, 'apiUrl', e.target.value)}
                  error={!!validationErrors[provider].apiUrl}
                  helperText={validationErrors[provider].apiUrl || 
                    `Example: ${DEFAULT_URLS[provider === 'projectManager' ? (formData.projectManager.serverType === 'lmStudio' ? 'lmStudio' : 'ollama') : provider]}`}
                  sx={{ mr: 1 }}
                />
                <Tooltip title={`Use default URL: ${DEFAULT_URLS[provider === 'projectManager' ? (formData.projectManager.serverType === 'lmStudio' ? 'lmStudio' : 'ollama') : provider]}`}>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleUseDefault(provider)}
                  >
                    <HelpOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <FormControl 
                  fullWidth 
                  error={!!validationErrors[provider][modelField]}
                  sx={{ mr: 1 }}
                >
                  <InputLabel id={`${provider}-model-label`}>Model</InputLabel>
                  <Select
                    labelId={`${provider}-model-label`}
                    value={formData[provider][modelField] || ''}
                    onChange={(e) => handleInputChange(provider, modelField, e.target.value)}
                    label="Model"
                  >
                    {models.length > 0 ? (
                      models.map(model => (
                        <MenuItem key={model} value={model}>{model}</MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        {isLoading ? 'Loading models...' : 'No models available'}
                      </MenuItem>
                    )}
                  </Select>
                  {validationErrors[provider][modelField] && (
                    <FormHelperText>{validationErrors[provider][modelField]}</FormHelperText>
                  )}
                </FormControl>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleTestConnection(provider)}
                  disabled={isLoading || !formData[provider].apiUrl}
                  sx={{ minWidth: '120px', height: '56px' }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} />
                  ) : hasTestedConnection ? (
                    'Refresh Models'
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </Box>
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
              
              {/* Always show manual model input for Project Manager with improved visibility */}
              {provider === 'projectManager' && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  border: '1px dashed', 
                  borderColor: models.length === 0 && !isLoading ? 'warning.main' : 'divider', 
                  borderRadius: 1,
                  backgroundColor: models.length === 0 && !isLoading ? 'warning.light' : 'background.paper'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {models.length === 0 && !isLoading ? 
                      <strong>No models found. Add a model name manually:</strong> : 
                      'Add a custom model:'
                    }
                  </Typography>
                  <Box sx={{ display: 'flex', mt: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Model Name"
                      placeholder="Enter model name (e.g., qwen2.5-7b-instruct, llama3)"
                      value={manualModelInput || ''}
                      onChange={(e) => setManualModelInput(e.target.value)}
                      sx={{ mr: 1 }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddManualModel}
                      disabled={!manualModelInput}
                      color={models.length === 0 ? "warning" : "primary"}
                    >
                      Add Model
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Common model names: llama2, mistral-7b-instruct, qwen2.5-7b-instruct, mixtral-8x7b
                  </Typography>
                </Box>
              )}
            </Grid>
            
            {/* Add model parameters for Project Manager */}
            {provider === 'projectManager' && parameters && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Temperature"
                    type="number"
                    inputProps={{ step: 0.1, min: 0, max: 2 }}
                    value={parameters.temperature || 0.7}
                    onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                    helperText="Controls randomness (0.0-2.0)"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Top P"
                    type="number"
                    inputProps={{ step: 0.05, min: 0, max: 1 }}
                    value={parameters.topP || 0.9}
                    onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
                    helperText="Nucleus sampling (0.0-1.0)"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Top K"
                    type="number"
                    inputProps={{ step: 1, min: 1, max: 100 }}
                    value={parameters.topK || 40}
                    onChange={(e) => handleParameterChange('topK', parseInt(e.target.value))}
                    helperText="Limits vocabulary to top K tokens"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Repeat Penalty"
                    type="number"
                    inputProps={{ step: 0.1, min: 1, max: 2 }}
                    value={parameters.repeatPenalty || 1.1}
                    onChange={(e) => handleParameterChange('repeatPenalty', parseFloat(e.target.value))}
                    helperText="Penalizes repetition (1.0-2.0)"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Tokens"
                    type="number"
                    inputProps={{ step: 128, min: 128, max: 4096 }}
                    value={parameters.maxTokens || 2048}
                    onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
                    helperText="Maximum tokens to generate"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Context Length"
                    type="number"
                    inputProps={{ step: 512, min: 512, max: 8192 }}
                    value={parameters.contextLength || 4096}
                    onChange={(e) => handleParameterChange('contextLength', parseInt(e.target.value))}
                    helperText="Maximum context window size"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Update handleFeatureToggle with error handling
  const handleFeatureToggle = async (featureName) => {
    try {
      const newValue = !featureStates[featureName];
      
      // Update local state
      setFeatureStates(prev => ({
        ...prev,
        [featureName]: newValue
      }));
      
      // Dispatch Redux action
      dispatch(toggleFeature(featureName, newValue));
      
      // Save to localStorage
      try {
        const currentSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        localStorage.setItem('settings', JSON.stringify({
          ...currentSettings,
          features: {
            ...(currentSettings.features || {}),
            [featureName]: newValue
          }
        }));
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
        dispatch(logWarning(
          LOG_CATEGORIES.SETTINGS,
          'Failed to save feature state to localStorage',
          storageError
        ));
      }

      // Save to config file
      try {
        // Get current config
        const config = await configService.loadConfig();
        
        // Update features in config
        const updatedConfig = {
          ...config,
          features: {
            ...(config.features || {}),
            [featureName]: newValue
          }
        };

        // Save updated config
        await configService.saveConfig(updatedConfig);
        
        dispatch(logInfo(
          LOG_CATEGORIES.SETTINGS,
          `Feature "${featureName}" ${newValue ? 'enabled' : 'disabled'} and saved to config`,
          { featureName, value: newValue }
        ));
      } catch (configError) {
        dispatch(logWarning(
          LOG_CATEGORIES.SETTINGS,
          'Failed to save feature state to config file',
          configError
        ));
      }
      
      // Show notification
      dispatch(addNotification({
        type: 'info',
        message: `${featureName} ${newValue ? 'enabled' : 'disabled'}`
      }));
      
      dispatch(logInfo(
        LOG_CATEGORIES.SETTINGS,
        `Feature "${featureName}" ${newValue ? 'enabled' : 'disabled'}`
      ));
    } catch (error) {
      console.error('Error toggling feature:', error);
      dispatch(logError(
        LOG_CATEGORIES.SETTINGS,
        `Error toggling feature ${featureName}`,
        error
      ));
      dispatch(addNotification({
        type: 'error',
        message: `Failed to toggle ${featureName}: ${error.message}`
      }));
    }
  };

  // Inside the Settings component, after other useEffect hooks
  useEffect(() => {
    // Update local state when Redux settings change
    if (settings?.features) {
      setFeatureStates(settings.features);
    }
  }, [settings?.features]);

  // Fix message flooding by adding rate limiting to the event listener
  useEffect(() => {
    // Message flood prevention
    let messageCount = 0;
    let lastResetTime = Date.now();
    const MESSAGE_LIMIT = 10; // Max 10 messages per second
    const RESET_INTERVAL = 1000; // Reset counter every second

    const handleMessage = (event) => {
      const now = Date.now();
      
      // Reset counter if window has passed
      if (now - lastResetTime > RESET_INTERVAL) {
        messageCount = 0;
        lastResetTime = now;
      }

      // Increment counter
      messageCount++;

      // Check if over limit
      if (messageCount > MESSAGE_LIMIT) {
        console.warn(`Message flood detected: ${messageCount} messages in 1 second`);
        return; // Skip processing this message
      }

      // Process message normally
      // ... rest of your message handling code ...
    };

    // Clean up old listeners before adding new one
    window.removeEventListener('project-manager-message', handleMessage);
    window.addEventListener('project-manager-message', handleMessage);

    return () => {
      window.removeEventListener('project-manager-message', handleMessage);
    };
  }, []);

  return (
    <Box sx={{ maxWidth: '900px', mx: 'auto', p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Providers" />
          <Tab label="Benchmark" />
          <Tab label="Configuration" />
          <Tab label="Features" />
          <Tab label="Uplink" />
        </Tabs>
      </Box>

      {/* Providers Tab */}
      {activeTab === 0 && (
        <div>
          {renderProviderCard('lmStudio', 'LM Studio', 'Configure LM Studio API settings for local inference')}
          {renderProviderCard('ollama', 'Ollama', 'Configure Ollama API settings for local inference')}
          {renderProviderCard('projectManager', 'Project Manager', 'Configure the Project Manager agent settings')}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={isSavingFile}
            >
              {isSavingFile ? 'Saving...' : 'Save All Settings'}
            </Button>
          </Box>
        </div>
      )}

      {/* Benchmark Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Benchmark
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Test the performance of your Project Manager model
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleBenchmark}
              disabled={isBenchmarking}
              startIcon={isBenchmarking ? <CircularProgress size={20} /> : <Assessment />}
            >
              {isBenchmarking ? 'Running Benchmark...' : 'Run Benchmark'}
            </Button>
            
            {showTerminal && (
              <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2">Benchmark Terminal</Typography>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        // Force terminal refresh
                        if (terminalInstance.current && fitAddon.current) {
                          fitAddon.current.fit();
                          // Force a reflow
                          if (terminalContainerRef.current) {
                            terminalContainerRef.current.style.display = 'none';
                            void terminalContainerRef.current.offsetHeight;
                            terminalContainerRef.current.style.display = 'block';
                          }
                        }
                      }}
                      sx={{ mr: 1 }}
                    >
                      <Assessment fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setShowTerminal(false)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box 
                  ref={terminalContainerRef} 
                  sx={{ 
                    height: '400px', // Increased height for better visibility
                    width: '100%', 
                    bgcolor: '#1e1e1e',
                    overflow: 'hidden', // Prevent scrollbars
                    position: 'relative', // Ensure proper positioning
                    '& .xterm': {
                      padding: '8px', // Add padding inside terminal
                      height: '100%',
                      width: '100%'
                    }
                  }} 
                />
              </Box>
            )}
            
            {benchmarkResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Results</Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Score</Typography>
                      <Typography variant="h4" sx={{ color: getScoreColor(benchmarkResults.averageScore) }}>
                        {benchmarkResults.averageScore.toFixed(1)}/10
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Latency</Typography>
                      <Typography variant="h4">
                        {benchmarkResults.averageLatency.toFixed(0)}ms
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Tokens/sec</Typography>
                      <Typography variant="h4">
                        {benchmarkResults.averageTokensPerSecond.toFixed(1)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Configuration
              </Typography>
              <Box>
                <Tabs value={configFormat} onChange={handleFormatChange} aria-label="config format">
                  <Tab value="json" label="JSON" />
                  <Tab value="yaml" label="YAML" />
                </Tabs>
              </Box>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Editor
                height="300px"
                language={configFormat}
                value={configValue}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopy />}
                  onClick={handleCopyConfig}
                  sx={{ mr: 1 }}
                >
                  Copy
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={handleDownloadConfig}
                >
                  Download
                </Button>
              </Box>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={!isConfigValid || isSavingFile}
                >
                  {isSavingFile ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
            </Box>
            
            {fileError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {fileError}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Features Tab */}
      {activeTab === 3 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Feature Management
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enable or disable specific features to customize your environment.
          </Typography>
          
          <Paper variant="outlined" sx={{ mt: 2 }}>
            <List>
              {Object.entries(FEATURE_DESCRIPTIONS).map(([feature, description]) => (
                <ListItem key={feature} divider>
                  <ListItemText 
                    primary={
                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                        {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </Typography>
                    }
                    secondary={description}
                  />
                  <ListItemSecondaryAction>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={featureStates[feature] || false}
                          onChange={() => handleFeatureToggle(feature)}
                          color="primary"
                        />
                      }
                      label={featureStates[feature] ? 'Enabled' : 'Disabled'}
                      labelPlacement="start"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
          
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              Changes to feature settings take effect immediately but may require a page refresh to fully apply.
            </Alert>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Settings;
