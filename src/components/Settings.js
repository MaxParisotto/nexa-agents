import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchModels, saveSettings } from '../store/actions/settingsActions';
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
  Paper
} from '@mui/material';
import { HelpOutline, Info, ErrorOutline, CheckCircle, Code, Download, ContentCopy, Assessment, Close as CloseIcon } from '@mui/icons-material';
import { addNotification } from '../store/actions/systemActions';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';

const DEFAULT_URLS = {
  lmStudio: 'http://localhost:1234',
  ollama: 'http://localhost:11434'
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
      apiUrl: settings?.projectManager?.apiUrl || DEFAULT_URLS.ollama,
      model: settings?.projectManager?.model || 'deepscaler:7b',
      parameters: settings?.projectManager?.parameters || {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        maxTokens: 1024,
        contextLength: 4096
      }
    },
    nodeEnv: settings?.nodeEnv || 'development',
    port: settings?.port || 5000
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
    
    // Initialize terminal if not already done
    setTimeout(() => {
      if (!terminalInstance.current && terminalContainerRef.current) {
        terminalInstance.current = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
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
        fitAddon.current.fit();
        
        // Clear terminal
        terminalInstance.current.clear();
        terminalInstance.current.write('\x1b[1;32m=== Benchmark Started ===\x1b[0m\r\n\n');
        terminalInstance.current.write(`\x1b[1;36mModel:\x1b[0m ${formData.projectManager.model}\r\n`);
        terminalInstance.current.write(`\x1b[1;36mAPI URL:\x1b[0m ${formData.projectManager.apiUrl}\r\n`);
        terminalInstance.current.write(`\x1b[1;36mParameters:\x1b[0m\r\n`);
        Object.entries(formData.projectManager.parameters).forEach(([key, value]) => {
          terminalInstance.current.write(`  - ${key}: ${value}\r\n`);
        });
        terminalInstance.current.write('\r\n');
      } else if (terminalInstance.current) {
        // Clear terminal
        terminalInstance.current.clear();
        terminalInstance.current.write('\x1b[1;32m=== Benchmark Started ===\x1b[0m\r\n\n');
        terminalInstance.current.write(`\x1b[1;36mModel:\x1b[0m ${formData.projectManager.model}\r\n`);
        terminalInstance.current.write(`\x1b[1;36mAPI URL:\x1b[0m ${formData.projectManager.apiUrl}\r\n`);
        terminalInstance.current.write(`\x1b[1;36mParameters:\x1b[0m\r\n`);
        Object.entries(formData.projectManager.parameters).forEach(([key, value]) => {
          terminalInstance.current.write(`  - ${key}: ${value}\r\n`);
        });
        terminalInstance.current.write('\r\n');
        
        if (fitAddon.current) {
          fitAddon.current.fit();
        }
      }
    }, 100);
    
    try {
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Starting benchmark for model: ${formData.projectManager.model}`));
      
      // Notify user
      dispatch(addNotification({
        type: 'info',
        message: `Benchmarking ${formData.projectManager.model}. This may take a minute...`
      }));
      
      // Check if the Ollama server is available
      if (terminalInstance.current) {
        terminalInstance.current.write(`\x1b[33mChecking Ollama server availability...\x1b[0m\r\n`);
      }
      
      try {
        const serverCheckResponse = await axios.get(`${formData.projectManager.apiUrl}/api/version`);
        
        if (terminalInstance.current) {
          terminalInstance.current.write(`\x1b[32mOllama server is available (version: ${serverCheckResponse.data.version})\x1b[0m\r\n\n`);
        }
      } catch (serverCheckError) {
        if (terminalInstance.current) {
          terminalInstance.current.write(`\x1b[31mError: Ollama server is not available at ${formData.projectManager.apiUrl}\x1b[0m\r\n`);
          terminalInstance.current.write(`\x1b[31mDetails: ${serverCheckError.message}\x1b[0m\r\n\n`);
        }
        
        throw new Error(`Ollama server is not available at ${formData.projectManager.apiUrl}: ${serverCheckError.message}`);
      }
      
      // Check if the model exists
      if (terminalInstance.current) {
        terminalInstance.current.write(`\x1b[33mVerifying model exists...\x1b[0m\r\n`);
      }
      
      try {
        const modelCheckResponse = await axios.get(`${formData.projectManager.apiUrl}/api/tags`);
        const availableModels = modelCheckResponse.data.models.map(model => model.name);
        
        if (!availableModels.includes(formData.projectManager.model)) {
          if (terminalInstance.current) {
            terminalInstance.current.write(`\x1b[31mError: Model "${formData.projectManager.model}" not found in available models.\x1b[0m\r\n`);
            terminalInstance.current.write(`\x1b[33mAvailable models: ${availableModels.join(', ')}\x1b[0m\r\n\n`);
          }
          
          throw new Error(`Model "${formData.projectManager.model}" not found. Available models: ${availableModels.join(', ')}`);
        }
        
        if (terminalInstance.current) {
          terminalInstance.current.write(`\x1b[32mModel verified. Proceeding with benchmark...\x1b[0m\r\n\n`);
        }
      } catch (modelCheckError) {
        if (terminalInstance.current) {
          terminalInstance.current.write(`\x1b[31mError checking model: ${modelCheckError.message}\x1b[0m\r\n\n`);
          terminalInstance.current.write(`\x1b[33mProceeding with benchmark anyway...\x1b[0m\r\n\n`);
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
      
      // Write final results to terminal
      if (terminalInstance.current) {
        terminalInstance.current.write('\x1b[1;32m=== Benchmark Completed ===\x1b[0m\r\n\n');
        terminalInstance.current.write(`\x1b[1;33mOverall Score:\x1b[0m ${results.averageScore.toFixed(1)}/10\r\n`);
        terminalInstance.current.write(`\x1b[1;33mAverage Latency:\x1b[0m ${results.averageLatency.toFixed(0)}ms\r\n`);
        terminalInstance.current.write(`\x1b[1;33mTokens/sec:\x1b[0m ${results.averageTokensPerSecond.toFixed(1)}\r\n`);
        terminalInstance.current.write(`\x1b[1;33mTotal Time:\x1b[0m ${(results.totalTime / 1000).toFixed(1)}s\r\n\n`);
      }
      
      dispatch(addNotification({
        type: 'success',
        message: `Benchmark completed for ${formData.projectManager.model}`
      }));
    } catch (error) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Benchmark failed', error));
      
      // Write error to terminal
      if (terminalInstance.current) {
        terminalInstance.current.write('\x1b[1;31m=== Benchmark Failed ===\x1b[0m\r\n\n');
        terminalInstance.current.write(`\x1b[1;31mError:\x1b[0m ${error.message}\r\n`);
      }
      
      dispatch(addNotification({
        type: 'error',
        message: `Benchmark failed: ${error.message}`
      }));
    } finally {
      setIsBenchmarking(false);
    }
  };
  
  // Run model benchmark
  const runModelBenchmark = async (apiUrl, modelName, parameters) => {
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
      terminalInstance.current.write('\x1b[1;33mRunning Tests:\x1b[0m\r\n');
      tests.forEach((test, index) => {
        terminalInstance.current.write(`  ${index + 1}. ${test.name}\r\n`);
      });
      terminalInstance.current.write('\r\n');
    }
    
    /**
     * Helper function to handle streaming responses from Ollama
     * @param {string} apiUrl - The Ollama API URL
     * @param {string} modelName - The model name
     * @param {string} prompt - The prompt to send
     * @param {object} parameters - The model parameters
     * @returns {Promise<string>} - The concatenated response
     */
    const handleStreamingRequest = async (apiUrl, modelName, prompt, parameters) => {
      if (terminalInstance.current) {
        terminalInstance.current.write(`\x1b[90mAttempting streaming request as fallback...\x1b[0m\r\n`);
      }
      
      try {
        // Make a raw fetch request to handle streaming
        const response = await fetch(`${apiUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            stream: true,
            temperature: parameters?.temperature || 0.7,
            top_p: parameters?.topP || 0.9,
            top_k: parameters?.topK || 40,
            repeat_penalty: parameters?.repeatPenalty || 1.1,
            max_tokens: parameters?.maxTokens || 1024
          })
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
            terminalInstance.current.write('.');
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
          terminalInstance.current.write('\r\x1b[K'); // Clear the line
          terminalInstance.current.write(`\x1b[32mStreaming response received (${extractedText.length} chars)\x1b[0m\r\n`);
        }
        
        return extractedText;
      } catch (error) {
        if (terminalInstance.current) {
          terminalInstance.current.write(`\x1b[31mStreaming request failed: ${error.message}\x1b[0m\r\n`);
        }
        throw error;
      }
    };
    
    // Run each test
    for (const [index, test] of tests.entries()) {
      const testStartTime = Date.now();
      
      // Write test start to terminal
      if (terminalInstance.current) {
        terminalInstance.current.write(`\x1b[1;34m[${index + 1}/${tests.length}] Running test: ${test.name}...\x1b[0m\r\n`);
        terminalInstance.current.write(`\x1b[90mPrompt: ${test.prompt}\x1b[0m\r\n`);
        terminalInstance.current.write(`\x1b[33mWaiting for response...\x1b[0m`);
      }
      
      try {
        // Call Ollama API
        if (terminalInstance.current) {
          terminalInstance.current.write(`\x1b[90mSending request to ${apiUrl}/api/generate...\x1b[0m\r\n`);
        }
        
        // Add a timeout promise to handle cases where the API doesn't respond
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timed out after 30 seconds')), 30000);
        });
        
        let responseText = '';
        let testEndTime;
        
        try {
          // First try with non-streaming request
          // Create the API call promise
          const apiCallPromise = axios.post(
            `${apiUrl}/api/generate`,
            {
              model: modelName,
              prompt: test.prompt,
              temperature: parameters?.temperature || 0.7,
              top_p: parameters?.topP || 0.9,
              top_k: parameters?.topK || 40,
              repeat_penalty: parameters?.repeatPenalty || 1.1,
              max_tokens: parameters?.maxTokens || 1024,
              stream: false // Explicitly disable streaming to get a complete response
            },
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
            terminalInstance.current.write('\r\x1b[K'); // Clear the line
            terminalInstance.current.write(`\x1b[36mDebug - Response structure: ${JSON.stringify(Object.keys(response.data))}\x1b[0m\r\n`);
          }
          
          // Handle different response formats
          
          // Check if response has the expected structure
          if (response.data && response.data.response) {
            // Standard Ollama response format
            responseText = response.data.response;
          } else if (response.data && typeof response.data === 'string') {
            // Plain text response
            responseText = response.data;
          } else if (response.data && Array.isArray(response.data)) {
            // Array of responses (some API versions)
            responseText = response.data.map(item => item.response || '').join('');
          } else if (response.data && typeof response.data === 'object') {
            // If it's a streaming response that was collected as a single object
            if (terminalInstance.current) {
              terminalInstance.current.write(`\x1b[33mWarning: Received unexpected response format. Attempting to extract content.\x1b[0m\r\n`);
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
            throw new Error(`Invalid response structure: ${JSON.stringify(response.data)}`);
          }
        } catch (nonStreamingError) {
          // If non-streaming request fails, try with streaming as fallback
          if (terminalInstance.current) {
            terminalInstance.current.write('\r\x1b[K'); // Clear the line
            terminalInstance.current.write(`\x1b[33mNon-streaming request failed: ${nonStreamingError.message}\x1b[0m\r\n`);
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
              terminalInstance.current.write(`\x1b[90mToken count from API: ${tokensGenerated}\x1b[0m\r\n`);
            }
          } 
          // Otherwise estimate based on whitespace (works for both streaming and non-streaming)
          else if (responseText && typeof responseText === 'string') {
            tokensGenerated = responseText.split(/\s+/).length;
            if (terminalInstance.current) {
              terminalInstance.current.write(`\x1b[90mEstimated token count: ${tokensGenerated}\x1b[0m\r\n`);
            }
          } else {
            // If we can't determine tokens, use a default value
            tokensGenerated = 10;
            if (terminalInstance.current) {
              terminalInstance.current.write(`\x1b[33mWarning: Could not determine token count, using default value\x1b[0m\r\n`);
            }
          }
        } catch (tokenError) {
          // Fallback if token calculation fails
          tokensGenerated = responseText ? Math.ceil(responseText.length / 4) : 10;
          if (terminalInstance.current) {
            terminalInstance.current.write(`\x1b[33mWarning: Error calculating tokens, using estimate: ${tokensGenerated}\x1b[0m\r\n`);
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
              terminalInstance.current.write(`\x1b[33mWarning: Response is not a string, cannot evaluate\x1b[0m\r\n`);
            }
          }
        } catch (evalError) {
          if (terminalInstance.current) {
            terminalInstance.current.write(`\x1b[33mWarning: Error evaluating response: ${evalError.message}\x1b[0m\r\n`);
          }
        }
        
        // Clear the "Waiting for response..." line and write results to terminal
        if (terminalInstance.current) {
          terminalInstance.current.write('\r\x1b[K'); // Clear the line
          terminalInstance.current.write(`\x1b[32mResponse received in ${(latency / 1000).toFixed(2)}s\x1b[0m\r\n`);
          
          // Safely display response text
          if (responseText && typeof responseText === 'string') {
            terminalInstance.current.write(`\x1b[90m${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}\x1b[0m\r\n`);
          } else {
            terminalInstance.current.write(`\x1b[33mWarning: Response is not a string\x1b[0m\r\n`);
            terminalInstance.current.write(`\x1b[90m${JSON.stringify(response.data).substring(0, 100)}...\x1b[0m\r\n`);
          }
          
          // Write score with color based on value
          let scoreColor = '31'; // Red
          if (score >= 8) scoreColor = '32'; // Green
          else if (score >= 5) scoreColor = '33'; // Yellow
          
          terminalInstance.current.write(`\x1b[1;${scoreColor}mScore: ${score}/10\x1b[0m\r\n`);
          terminalInstance.current.write(`Tokens/sec: ${tokensPerSecond.toFixed(1)}\r\n\n`);
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
          terminalInstance.current.write('\r\x1b[K'); // Clear the line
          
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
                  terminalInstance.current.write(`\x1b[33mDetected streaming response. Extracted content:\x1b[0m\r\n`);
                  terminalInstance.current.write(`\x1b[90m${extractedText.substring(0, 200)}${extractedText.length > 200 ? '...' : ''}\x1b[0m\r\n`);
                  
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
                    
                    terminalInstance.current.write(`\x1b[1;${scoreColor}mScore: ${score}/10\x1b[0m\r\n`);
                    terminalInstance.current.write(`Tokens/sec: ${tokensPerSecond.toFixed(1)}\r\n\n`);
                    
                    // Skip the rest of the error handling
                    return;
                  } catch (evalError) {
                    terminalInstance.current.write(`\x1b[33mWarning: Error evaluating extracted response: ${evalError.message}\x1b[0m\r\n`);
                  }
                }
              }
            } catch (parseError) {
              terminalInstance.current.write(`\x1b[33mWarning: Failed to parse streaming response: ${parseError.message}\x1b[0m\r\n`);
            }
          }
          
          terminalInstance.current.write(`\x1b[31mError: ${errorMessage}\x1b[0m\r\n`);
          if (errorDetails) {
            terminalInstance.current.write(`\x1b[31mDetails: ${errorDetails}\x1b[0m\r\n`);
          }
          terminalInstance.current.write('\n');
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
      terminalInstance.current.write('\x1b[1;35m=== Summary ===\x1b[0m\r\n');
      terminalInstance.current.write(`Total time: ${(totalTime / 1000).toFixed(2)}s\r\n`);
      terminalInstance.current.write(`Average score: ${averageScore.toFixed(1)}/10\r\n`);
      terminalInstance.current.write(`Average latency: ${averageLatency.toFixed(0)}ms\r\n`);
      terminalInstance.current.write(`Average tokens/sec: ${averageTokensPerSecond.toFixed(1)}\r\n\n`);
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
    
    // Load saved settings from Redux/localStorage
    const savedNodeEnv = localStorage.getItem('nodeEnv') || 'development';
    const savedPort = localStorage.getItem('port') || '5000';
    
    setFormData(prevState => ({
      ...prevState,
      nodeEnv: savedNodeEnv,
      port: savedPort
    }));
    
    // Try to load config from file
    loadConfigFromFile();
    
    // Generate config from settings as fallback
    generateConfigFromSettings();
    
    // Cleanup function
    return () => {
      // Log when component unmounts
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings component unmounted'));
    };
  }, []);
  
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
        apiUrl: formData.projectManager.apiUrl,
        model: formData.projectManager.model
      },
      nodeEnv: formData.nodeEnv,
      port: formData.port
    };
    
    try {
      if (configFormat === 'json') {
        setConfigValue(JSON.stringify(config, null, 2));
      } else {
        // Simple YAML conversion for demo
        let yamlStr = '';
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'object') {
            yamlStr += `${key}:\n`;
            Object.entries(value).forEach(([subKey, subValue]) => {
              yamlStr += `  ${subKey}: ${subValue || '""'}\n`;
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
    let apiUrl, modelName;
    
    if (provider === 'lmStudio') {
      apiUrl = formData.lmStudio.apiUrl;
      modelName = formData.lmStudio.defaultModel;
    } else if (provider === 'ollama') {
      apiUrl = formData.ollama.apiUrl;
      modelName = formData.ollama.defaultModel;
    } else if (provider === 'projectManager') {
      apiUrl = formData.projectManager.apiUrl;
      modelName = formData.projectManager.model;
    }
    
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
    
    // Dispatch the fetchModels action
    dispatch(fetchModels(provider, apiUrl))
      .then(models => {
        if (models && models.length > 0) {
          // Mark this service as manually loaded
          setServicesManuallyLoaded(prev => ({
            ...prev,
            [provider]: true
          }));
          
          // If no model is selected and we have models, select the first one
          if (!modelName && models.length > 0) {
            if (provider === 'projectManager') {
              // For Project Manager, prefer deepseek-r1:7b if available
              const deepseekModel = models.find(m => m === 'deepseek-r1:7b') || models[0];
              handleInputChange(provider, 'model', deepseekModel);
            } else {
              handleInputChange(provider, 'defaultModel', models[0]);
            }
          }
        }
      });
  };

  const validateForm = () => {
    const errors = {
      lmStudio: { apiUrl: '', defaultModel: '' },
      ollama: { apiUrl: '', defaultModel: '' },
      projectManager: { apiUrl: '', model: '' }
    };
    
    let isValid = true;
    
    // Validate LM Studio
    if (!formData.lmStudio.apiUrl) {
      errors.lmStudio.apiUrl = 'API URL is required';
      isValid = false;
    } else if (!formData.lmStudio.apiUrl.startsWith('http')) {
      errors.lmStudio.apiUrl = 'API URL must start with http:// or https://';
      isValid = false;
    }
    
    // Validate Ollama
    if (!formData.ollama.apiUrl) {
      errors.ollama.apiUrl = 'API URL is required';
      isValid = false;
    } else if (!formData.ollama.apiUrl.startsWith('http')) {
      errors.ollama.apiUrl = 'API URL must start with http:// or https://';
      isValid = false;
    }
    
    // Validate Project Manager
    if (!formData.projectManager.apiUrl) {
      errors.projectManager.apiUrl = 'API URL is required';
      isValid = false;
    } else if (!formData.projectManager.apiUrl.startsWith('http')) {
      errors.projectManager.apiUrl = 'API URL must start with http:// or https://';
      isValid = false;
    }
    
    if (!formData.projectManager.model) {
      errors.projectManager.model = 'Model is required';
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleInputChange = (provider, field, value) => {
    setFormData(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
    
    // Clear validation errors when user types
    setValidationErrors(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: ''
      }
    }));
  };

  const handleSave = () => {
    if (validateForm()) {
      // Only log once, not for each operation
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Saving settings'));
      
      // Update Redux store and save to localStorage
      dispatch(saveSettings(formData));
      
      // Also save to file
      saveConfigToFile();
      
      dispatch(addNotification({
        type: 'success',
        message: 'Settings saved successfully!'
      }));
    } else {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Settings validation failed', validationErrors));
      dispatch(addNotification({
        type: 'error',
        message: 'Please fix validation errors before saving'
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
      setFormData(prev => ({
        ...prev,
        projectManager: {
          apiUrl: DEFAULT_URLS.ollama, // Uses the same URL as Ollama
          model: 'deepscaler:7b'
        }
      }));
    }
  };

  const loadConfigFromFile = async () => {
    // Rate limiting - don't reload if we just loaded in the last 3 seconds
    const now = Date.now();
    if (lastOperation.type === 'load' && now - lastOperation.timestamp < 3000) {
      console.log('Skipping repeated load operation');
      // Use the last result
      if (lastOperation.result) {
        if (configFormat === 'json') {
          setConfigValue(JSON.stringify(lastOperation.result, null, 2));
          updateSettingsFromConfig(lastOperation.result);
        } else {
          setConfigValue(lastOperation.result);
        }
      }
      return;
    }
    
    setIsLoadingFile(true);
    setFileError('');
    
    try {
      // First, check if the server is available
      const serverAvailable = await configService.checkServerAvailability(true);
      
      if (!serverAvailable) {
        throw new Error('Server is not available. Configuration will be loaded from browser storage.');
      }
      
      const config = await configService.loadConfigFromFile(configFormat);
      
      // Update the last operation
      setLastOperation({
        type: 'load',
        timestamp: Date.now(),
        result: config
      });
      
      if (configFormat === 'json') {
        // If it's a JSON config, update the state
        setConfigValue(JSON.stringify(config, null, 2));
        updateSettingsFromConfig(config);
      } else {
        // If it's YAML, it's just the text content
        setConfigValue(config);
      }
      
      dispatch(addNotification({
        type: 'success',
        message: `Configuration loaded from file`
      }));
    } catch (error) {
      // Different handling based on error type
      if (error.message.includes('Server is not available')) {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Server unavailable for configuration loading', error));
        setFileError('Server unavailable - using browser storage');
        
        // Load from localStorage as fallback
        const localConfig = configService.loadConfigFromLocalStorage();
        setConfigValue(JSON.stringify(localConfig, null, 2));
        updateSettingsFromConfig(localConfig);
        
        dispatch(addNotification({
          type: 'warning',
          message: 'Server unavailable - Using settings from browser storage'
        }));
      } else if (error.message === 'Configuration file not found') {
        // For file not found, just use a gentle notification
        dispatch(addNotification({
          type: 'info',
          message: 'Using default configuration (no file found)'
        }));
      } else {
        // For other errors, show more details
        dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Error loading configuration file', error));
        setFileError('Failed to load configuration file: ' + error.message);
        
        dispatch(addNotification({
          type: 'warning',
          message: 'Error loading configuration: ' + error.message
        }));
      }
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
    const isConfigured = formData[provider].apiUrl && 
      (provider === 'projectManager' ? formData[provider].model : formData[provider].defaultModel);

    // Determine which field to use for model selection based on provider
    const modelField = provider === 'projectManager' ? 'model' : 'defaultModel';

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
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="API URL"
                  value={formData[provider].apiUrl}
                  onChange={(e) => handleInputChange(provider, 'apiUrl', e.target.value)}
                  error={!!validationErrors[provider].apiUrl}
                  helperText={validationErrors[provider].apiUrl || 
                    `Example: ${DEFAULT_URLS[provider]}`}
                  sx={{ mr: 1 }}
                />
                <Tooltip title={`Use default URL: ${DEFAULT_URLS[provider]}`}>
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
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ maxWidth: '900px', mx: 'auto', p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Providers" />
          <Tab label="Benchmark" />
          <Tab label="Configuration" />
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
                  <IconButton size="small" onClick={() => setShowTerminal(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box 
                  ref={terminalContainerRef} 
                  sx={{ 
                    height: '300px', 
                    width: '100%', 
                    bgcolor: '#1e1e1e'
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
    </Box>
  );
};

export default Settings;