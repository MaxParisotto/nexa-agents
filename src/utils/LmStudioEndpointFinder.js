/**
 * LM Studio Endpoint Finder
 * 
 * Utility to detect and validate the correct endpoint for LM Studio
 * Different versions of LM Studio may use different endpoint structures
 */
import axios from 'axios';

/**
 * Possible endpoint patterns for LM Studio
 * Listed in order of priority/likelihood
 */
const ENDPOINT_PATTERNS = [
  '/v1/chat/completions',    // Standard OpenAI format
  '/chat/completions',       // Alternative format used in some versions
  '/v1/completions',         // Legacy format for chat in some versions
  '/completions',            // Simple completions endpoint
  '/api/chat/completions',   // Another possible format
  '/v1/generate',            // Some local LLM servers use this
  '/generate',               // Simple generate endpoint
  '/api/generate',           // Another variation
  '/api/v1/generate',        // Yet another variation
  '/v1/inference',           // Some LM Studio versions use this
  '/inference',              // Simple inference endpoint
  '/api/inference',          // Another variation
  '/chat'                    // Minimal format used in some versions
];

/**
 * Find a working chat completions endpoint for LM Studio
 * 
 * @param {string} baseUrl - The base URL for LM Studio (e.g., http://localhost:1234)
 * @param {boolean} debug - Whether to output detailed debug information
 * @returns {Promise<Object>} Object with endpoint and validation results
 */
export const findWorkingEndpoint = async (baseUrl, debug = true) => {
  // Ensure the base URL has the correct format
  const cleanBaseUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
  const normalizedBaseUrl = cleanBaseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  
  console.log(`[EndpointFinder] Testing LM Studio endpoints at ${normalizedBaseUrl}`);
  
  // First check if server is responding at all
  try {
    await axios.get(`${normalizedBaseUrl}`, { 
      timeout: 2000,
      validateStatus: () => true  // Accept any status code as evidence server is running
    });
    console.log('[EndpointFinder] Server is responding to basic requests');
  } catch (error) {
    console.error('[EndpointFinder] Server is not responding at all:', error.message);
    return { 
      success: false, 
      endpoint: null,
      error: 'Server not reachable',
      message: `Could not connect to LM Studio at ${normalizedBaseUrl}. Make sure it's running and accessible.`,
      details: error.message
    };
  }
  
  // Check if models endpoint is accessible
  let modelsEndpointWorking = false;
  let modelsData = null;
  
  // Try each possible models endpoint
  const modelEndpoints = [
    '/v1/models',
    '/models',
    '/api/models',
    '/api/v1/models'
  ];
  
  for (const modelEndpoint of modelEndpoints) {
    try {
      const response = await axios.get(`${normalizedBaseUrl}${modelEndpoint}`, { 
        timeout: 3000,
        validateStatus: () => true // Accept any response status
      });
      
      if (debug) {
        console.log(`[EndpointFinder] Model endpoint ${modelEndpoint} response:`, {
          status: response.status,
          statusText: response.statusText,
          data: response.data ? 'Present' : 'Empty'
        });
      }
      
      if (response.status === 200 && response.data) {
        modelsEndpointWorking = true;
        modelsData = response.data;
        console.log(`[EndpointFinder] Models endpoint working at ${modelEndpoint}!`, 
          response.data?.data?.length || 0, 'models found');
        break;
      }
    } catch (error) {
      if (debug) {
        console.log(`[EndpointFinder] Models endpoint ${modelEndpoint} failed:`, error.message);
      }
    }
  }
  
  // Test direct API connectivity with a simple request to verify the server is an LLM server
  let isLlmServer = false;
  try {
    // Try a health check endpoint that many LLM servers provide
    const response = await axios.get(`${normalizedBaseUrl}/health`, { 
      timeout: 2000,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      isLlmServer = true;
      console.log('[EndpointFinder] Server responded to health check endpoint');
    }
  } catch (error) {
    // Not an error, just means there's no health endpoint
  }
  
  // If we couldn't validate via health or models, check for any API info endpoint
  if (!isLlmServer && !modelsEndpointWorking) {
    try {
      // Try common API info endpoints
      const infoEndpoints = ['/v1', '/api', '/info', '/v1/info'];
      
      for (const infoEndpoint of infoEndpoints) {
        try {
          const response = await axios.get(`${normalizedBaseUrl}${infoEndpoint}`, { 
            timeout: 2000,
            validateStatus: () => true
          });
          
          if (response.status === 200 || response.status === 404) {
            isLlmServer = true;
            console.log(`[EndpointFinder] Server responded to ${infoEndpoint} endpoint`);
            break;
          }
        } catch (error) {
          // Continue to next endpoint
        }
      }
    } catch (error) {
      // Not critical
    }
  }
  
  // If we can't detect any LLM server endpoints, the server might not be an LLM server at all
  if (!modelsEndpointWorking && !isLlmServer) {
    console.warn('[EndpointFinder] Server is responding but does not appear to be an LLM server');
    return { 
      success: false, 
      endpoint: null,
      error: 'Not an LLM server',
      message: `The server at ${normalizedBaseUrl} does not appear to be an LLM server. Make sure the URL is correct.`,
      details: 'No LLM server endpoints detected'
    };
  }
  
  // Prepare model name for testing - either from models data or use a generic one
  let modelToUse = 'gpt-3.5-turbo'; // Generic default
  
  if (modelsData?.data && modelsData.data.length > 0) {
    // Use the first available model
    modelToUse = modelsData.data[0].id;
    console.log(`[EndpointFinder] Using detected model for testing: ${modelToUse}`);
  }
  
  // Prepare a minimal test payload for chat completions
  const chatPayload = {
    model: modelToUse,
    messages: [
      { role: "user", content: "Hello, test." }
    ],
    max_tokens: 5,
    temperature: 0.7
  };
  
  // Prepare a minimal test payload for completions-style endpoints
  const completionsPayload = {
    model: modelToUse,
    prompt: "Hello, test.",
    max_tokens: 5,
    temperature: 0.7
  };
  
  console.log('[EndpointFinder] Testing LLM endpoints with model:', modelToUse);
  
  // Try each endpoint pattern with appropriate payload
  const results = {};
  let foundWorkingEndpoint = false;
  
  for (const endpointPattern of ENDPOINT_PATTERNS) {
    const fullEndpoint = `${normalizedBaseUrl}${endpointPattern}`;
    console.log(`[EndpointFinder] Testing endpoint: ${fullEndpoint}`);
    
    try {
      // Choose payload based on endpoint type
      const isCompletionsEndpoint = endpointPattern.includes('completions') || endpointPattern.includes('generate');
      const payload = isCompletionsEndpoint ? chatPayload : completionsPayload;
      
      const response = await axios.post(
        fullEndpoint,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000, // 5 second timeout for testing
          validateStatus: () => true // Accept any response status
        }
      );
      
      results[endpointPattern] = {
        status: response.status,
        statusText: response.statusText,
        data: Boolean(response.data),
        error: null
      };
      
      if (debug) {
        console.log(`[EndpointFinder] Endpoint ${endpointPattern} response:`, {
          status: response.status, 
          statusText: response.statusText,
          data: response.data ? 'Has data' : 'No data'
        });
      }
      
      // This means the endpoint exists but might return an error about other things
      // like invalid model name, which is still useful - we found the right endpoint
      if (response.status !== 404) {
        console.log(`[EndpointFinder] Endpoint ${endpointPattern} exists (status ${response.status})`);
        
        // If we got a successful response
        if (response.status >= 200 && response.status < 300 && response.data) {
          console.log(`[EndpointFinder] Found working endpoint: ${endpointPattern}`);
          
          // Cache the successful endpoint
          try {
            localStorage.setItem('lmStudioEndpoint', endpointPattern);
            localStorage.setItem('lmStudioEndpointChecked', Date.now().toString());
          } catch (e) {
            console.warn('[EndpointFinder] Failed to cache endpoint:', e);
          }
          
          foundWorkingEndpoint = true;
          
          return {
            success: true,
            endpoint: endpointPattern,
            fullUrl: fullEndpoint,
            message: `Found working LM Studio endpoint: ${endpointPattern}`,
            testResponse: response.data
          };
        }
        // Non-404 response might mean this is the right endpoint but with config issues
        else if (response.status !== 404) {
          // Check for specific errors - with type safety
          const responseErrorString = typeof response.data?.error === 'string' 
            ? response.data.error 
            : JSON.stringify(response.data?.error || '');
          
          const responseErrorMsg = typeof response.data?.error?.message === 'string'
            ? response.data.error.message
            : '';
          
          // Check if this is a loading model error
          if (responseErrorString.includes('loading') || 
              responseErrorMsg.includes('loading') || 
              JSON.stringify(response.data).includes('Loading')) {
            
            console.log(`[EndpointFinder] Found likely endpoint ${endpointPattern} - model is loading`);
            
            try {
              localStorage.setItem('lmStudioEndpoint', endpointPattern);
              localStorage.setItem('lmStudioEndpointChecked', Date.now().toString());
            } catch (e) {
              console.warn('[EndpointFinder] Failed to cache endpoint:', e);
            }
            
            // Return this as a "successful" endpoint, but include the loading status
            return {
              success: true,
              endpoint: endpointPattern,
              fullUrl: fullEndpoint,
              message: `Found likely LM Studio endpoint: ${endpointPattern} (model is loading)`,
              modelLoading: true,
              testResponse: response.data
            };
          }
          
          // Check for model not found errors
          if (responseErrorString.includes('model_not_found') ||
              responseErrorMsg.includes('model') && responseErrorMsg.includes('not found')) {
            console.log(`[EndpointFinder] Found likely endpoint ${endpointPattern} - model error but endpoint works`);
            
            try {
              localStorage.setItem('lmStudioEndpoint', endpointPattern);
              localStorage.setItem('lmStudioEndpointChecked', Date.now().toString());
            } catch (e) {
              console.warn('[EndpointFinder] Failed to cache endpoint:', e);
            }
            
            // Return this as a "successful" endpoint, but include the model error info
            return {
              success: true,
              endpoint: endpointPattern,
              fullUrl: fullEndpoint,
              message: `Found likely LM Studio endpoint: ${endpointPattern} (has model error)`,
              modelError: true,
              testResponse: response.data
            };
          }
        }
      }
    } catch (error) {
      // Log but continue to next endpoint pattern
      if (debug) {
        console.log(`[EndpointFinder] Endpoint ${endpointPattern} failed:`, 
          error.response?.status || error.message);
      }
      
      results[endpointPattern] = {
        status: error.response?.status || 0,
        statusText: error.response?.statusText || error.message,
        data: false,
        error: error.message
      };
    }
  }
  
  console.error('[EndpointFinder] No working endpoints found, results:', results);

  // If server is reachable but no endpoint works, the API might be enabled but model not loaded
  if (modelsEndpointWorking || isLlmServer) {
    return {
      success: false,
      endpoint: null,
      error: 'No working endpoints',
      message: 'LM Studio API server is running, but no chat endpoints responded correctly. Make sure a model is loaded in LM Studio.',
      results
    };
  }
  
  // No working endpoints found and no evidence of LLM server
  return {
    success: false,
    endpoint: null,
    error: 'No working endpoints',
    message: 'Could not find a working LM Studio API endpoint. Check if the server URL is correct and LM Studio is running with API server enabled.',
    results
  };
};

/**
 * Get the most likely LM Studio endpoint to use
 * First tries cached value, then does endpoint discovery if needed
 */
export const getBestEndpoint = async (baseUrl, forceFresh = false) => {
  // Check for cached endpoint first (less than 10 minutes old)
  const cachedEndpoint = localStorage.getItem('lmStudioEndpoint');
  const lastChecked = parseInt(localStorage.getItem('lmStudioEndpointChecked') || '0');
  const TEN_MINUTES = 10 * 60 * 1000;
  
  if (!forceFresh && cachedEndpoint && (Date.now() - lastChecked) < TEN_MINUTES) {
    console.log('[EndpointFinder] Using cached endpoint:', cachedEndpoint);
    return {
      success: true,
      endpoint: cachedEndpoint,
      cached: true
    };
  }
  
  // No valid cache or forced refresh, so find the endpoint
  return findWorkingEndpoint(baseUrl);
};

/**
 * Run a diagnostic test on the server connection
 */
export const runDiagnostics = async (baseUrl) => {
  console.log(`[EndpointFinder] Running diagnostics for ${baseUrl}`);
  
  const results = {
    serverReachable: false,
    modelsEndpoint: false,
    chatEndpoint: false,
    detectedEndpoint: null,
    modelCount: 0,
    models: [],
    errors: [],
    rawResponses: {}
  };
  
  // Format base URL
  const cleanBaseUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
  const normalizedBaseUrl = cleanBaseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  
  try {
    // Test basic connectivity
    try {
      const response = await axios.get(normalizedBaseUrl, { 
        timeout: 3000,
        validateStatus: () => true
      });
      
      results.serverReachable = true;
      results.serverStatus = response.status;
      results.rawResponses.root = {
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      results.errors.push(`Server not reachable: ${error.message}`);
      results.rawResponses.root = { error: error.message };
    }
    
    // Test models endpoint
    if (results.serverReachable) {
      const modelEndpoints = ['/v1/models', '/models', '/api/models'];
      
      for (const endpoint of modelEndpoints) {
        try {
          const response = await axios.get(`${normalizedBaseUrl}${endpoint}`, { 
            timeout: 3000,
            validateStatus: () => true
          });
          
          results.rawResponses[endpoint] = {
            status: response.status,
            statusText: response.statusText,
            hasData: Boolean(response.data)
          };
          
          if (response.status === 200 && response.data) {
            results.modelsEndpoint = endpoint;
            results.modelCount = response.data.data?.length || 0;
            results.models = response.data.data?.map(m => m.id) || [];
            break;
          }
        } catch (error) {
          results.rawResponses[endpoint] = { error: error.message };
        }
      }
    }
    
    // Test chat endpoints
    if (results.serverReachable) {
      // Use a real model name if available
      let modelName = results.models.length > 0 ? results.models[0] : 'gpt-3.5-turbo';
      
      // Test each endpoint
      for (const endpoint of ENDPOINT_PATTERNS.slice(0, 4)) { // Test first 4 only for speed
        const url = `${normalizedBaseUrl}${endpoint}`;
        try {
          const payload = {
            model: modelName,
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 5
          };
          
          const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 3000,
            validateStatus: () => true
          });
          
          results.rawResponses[endpoint] = {
            status: response.status,
            statusText: response.statusText,
            hasData: Boolean(response.data)
          };
          
          // Any non-404 response indicates this endpoint exists
          if (response.status !== 404) {
            results.detectedEndpoint = endpoint;
            
            // 200 indicates it's probably working
            if (response.status === 200) {
              results.chatEndpoint = endpoint;
              break;
            }
            // Other status might indicate model issues but endpoint is right
            else if (response.data?.error?.code === 'model_not_found') {
              results.chatEndpoint = endpoint;
              results.modelError = true;
              break;
            }
          }
        } catch (error) {
          results.rawResponses[endpoint] = { error: error.message };
        }
      }
    }
    
    return results;
  } catch (error) {
    results.errors.push(`Diagnostic error: ${error.message}`);
    return results;
  }
};

export default {
  findWorkingEndpoint,
  getBestEndpoint,
  runDiagnostics
};
