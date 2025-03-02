import axios from 'axios';

/**
 * LlmDiagnostic utility for testing and troubleshooting LLM server connections
 */
class LlmDiagnostic {
  /**
   * Run full diagnostics on an LM Studio server
   * @param {string} apiUrl Base URL for the server (e.g., http://localhost:1234)
   * @param {string} model Model name to test
   * @returns {Object} Diagnostic results
   */
  async runLmStudioDiagnostic(apiUrl, model) {
    console.log(`Running LM Studio diagnostics on ${apiUrl} with model ${model}`);
    
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    const results = {
      timestamp: new Date().toISOString(),
      apiUrl: baseUrl,
      model: model || 'Not specified',
      serverReachable: false,
      modelsEndpointWorking: false,
      modelList: [],
      modelAvailable: false,
      basicCompletionWorking: false,
      generalStatus: 'failed',
      steps: [],
      errorDetails: null
    };
    
    try {
      // Step 1: Basic connection test
      results.steps.push({
        name: 'Server Connection',
        status: 'running',
        message: `Testing connection to ${baseUrl}`
      });
      
      try {
        const pingResponse = await axios.head(baseUrl, { timeout: 3000 });
        results.serverReachable = pingResponse.status < 400;
        results.steps[0].status = 'success';
        results.steps[0].message = `Server is reachable at ${baseUrl}`;
      } catch (error) {
        results.serverReachable = false;
        results.steps[0].status = 'error';
        results.steps[0].message = `Server unreachable: ${error.message}`;
        throw new Error(`Server unreachable: ${error.message}`);
      }
      
      // Step 2: Models endpoint test
      results.steps.push({
        name: 'Models API',
        status: 'running',
        message: 'Testing models endpoint'
      });
      
      try {
        const modelsResponse = await axios.get(`${baseUrl}/v1/models`, { timeout: 5000 });
        results.modelsEndpointWorking = true;
        
        if (modelsResponse.data && modelsResponse.data.data) {
          results.modelList = modelsResponse.data.data.map(model => model.id);
        }
        
        results.steps[1].status = 'success';
        results.steps[1].message = `Models endpoint responding with ${results.modelList.length} models`;
      } catch (error) {
        results.modelsEndpointWorking = false;
        results.steps[1].status = 'error';
        results.steps[1].message = `Models endpoint error: ${error.message}`;
        throw new Error(`Models endpoint error: ${error.message}`);
      }
      
      // Step 3: Model availability check
      results.steps.push({
        name: 'Model Availability',
        status: 'running',
        message: `Checking if model ${model} is available`
      });
      
      if (model && results.modelList.includes(model)) {
        results.modelAvailable = true;
        results.steps[2].status = 'success';
        results.steps[2].message = `Model ${model} is available`;
      } else {
        results.modelAvailable = false;
        results.steps[2].status = 'warning';
        results.steps[2].message = model 
          ? `Model ${model} not found in available models` 
          : 'No model specified for testing';
          
        if (results.modelList.length > 0) {
          results.steps[2].details = `Available models: ${results.modelList.slice(0, 5).join(', ')}${results.modelList.length > 5 ? '...' : ''}`;
        }
      }
      
      // Step 4: Basic completion test
      results.steps.push({
        name: 'Basic Completion',
        status: 'running',
        message: 'Testing basic completion request'
      });
      
      try {
        // Use first available model if specified model isn't available
        const testModel = results.modelAvailable ? model : (results.modelList[0] || 'unknown');
        
        if (testModel === 'unknown') {
          throw new Error('No model available for testing');
        }
        
        const completionResponse = await axios.post(
          `${baseUrl}/v1/chat/completions`, 
          {
            model: testModel,
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 5,
            temperature: 0.7
          },
          { timeout: 10000 }
        );
        
        if (completionResponse.data?.choices?.length > 0) {
          results.basicCompletionWorking = true;
          results.steps[3].status = 'success';
          results.steps[3].message = 'Basic completion test successful';
          results.steps[3].details = `Response: "${completionResponse.data.choices[0]?.message?.content || 'No content'}"`;
        } else {
          results.basicCompletionWorking = false;
          results.steps[3].status = 'warning';
          results.steps[3].message = 'Completion response received but may be malformed';
          results.steps[3].details = `Response structure: ${JSON.stringify(completionResponse.data).substring(0, 100)}...`;
        }
      } catch (error) {
        results.basicCompletionWorking = false;
        results.steps[3].status = 'error';
        results.steps[3].message = `Completion request failed: ${error.message}`;
        
        // Don't throw here, we want to return partial results
        results.steps[3].details = error.response?.data ? 
          `Server response: ${JSON.stringify(error.response.data)}` : 
          `Error details: ${error.message}`;
      }
      
      // Determine overall status
      if (results.serverReachable && results.modelsEndpointWorking && 
          results.modelAvailable && results.basicCompletionWorking) {
        results.generalStatus = 'success';
      } else if (results.serverReachable && results.modelsEndpointWorking) {
        results.generalStatus = 'warning';
      } else {
        results.generalStatus = 'failed';
      }
      
    } catch (error) {
      results.errorDetails = {
        message: error.message,
        stack: error.stack,
        responseData: error.response?.data
      };
    }
    
    return results;
  }
  
  /**
   * Run full diagnostics on an Ollama server
   * @param {string} apiUrl Base URL for the server (e.g., http://localhost:11434)
   * @param {string} model Model name to test
   * @returns {Object} Diagnostic results
   */
  async runOllamaDiagnostic(apiUrl, model) {
    console.log(`Running Ollama diagnostics on ${apiUrl} with model ${model}`);
    
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    const results = {
      timestamp: new Date().toISOString(),
      apiUrl: baseUrl,
      model: model || 'Not specified',
      serverReachable: false,
      modelsEndpointWorking: false,
      modelList: [],
      modelAvailable: false,
      basicCompletionWorking: false,
      generalStatus: 'failed',
      steps: [],
      errorDetails: null
    };
    
    try {
      // Step 1: Basic connection test
      results.steps.push({
        name: 'Server Connection',
        status: 'running',
        message: `Testing connection to ${baseUrl}`
      });
      
      try {
        const pingResponse = await axios.head(baseUrl, { timeout: 3000 });
        results.serverReachable = pingResponse.status < 400;
        results.steps[0].status = 'success';
        results.steps[0].message = `Server is reachable at ${baseUrl}`;
      } catch (error) {
        // Ollama may not respond to HEAD requests, try GET
        try {
          await axios.get(baseUrl, { timeout: 3000 });
          results.serverReachable = true;
          results.steps[0].status = 'success';
          results.steps[0].message = `Server is reachable at ${baseUrl}`;
        } catch (err) {
          results.serverReachable = false;
          results.steps[0].status = 'error';
          results.steps[0].message = `Server unreachable: ${err.message}`;
          throw new Error(`Server unreachable: ${err.message}`);
        }
      }
      
      // Step 2: Models endpoint test
      results.steps.push({
        name: 'Models API',
        status: 'running',
        message: 'Testing tags endpoint'
      });
      
      try {
        const modelsResponse = await axios.get(`${baseUrl}/api/tags`, { timeout: 5000 });
        results.modelsEndpointWorking = true;
        
        if (modelsResponse.data && modelsResponse.data.models) {
          results.modelList = modelsResponse.data.models.map(model => model.name);
        }
        
        results.steps[1].status = 'success';
        results.steps[1].message = `Tags endpoint responding with ${results.modelList.length} models`;
      } catch (error) {
        results.modelsEndpointWorking = false;
        results.steps[1].status = 'error';
        results.steps[1].message = `Tags endpoint error: ${error.message}`;
        throw new Error(`Tags endpoint error: ${error.message}`);
      }
      
      // Step 3: Model availability check
      results.steps.push({
        name: 'Model Availability',
        status: 'running',
        message: `Checking if model ${model} is available`
      });
      
      if (model && results.modelList.includes(model)) {
        results.modelAvailable = true;
        results.steps[2].status = 'success';
        results.steps[2].message = `Model ${model} is available`;
      } else {
        results.modelAvailable = false;
        results.steps[2].status = 'warning';
        results.steps[2].message = model 
          ? `Model ${model} not found in available models` 
          : 'No model specified for testing';
          
        if (results.modelList.length > 0) {
          results.steps[2].details = `Available models: ${results.modelList.slice(0, 5).join(', ')}${results.modelList.length > 5 ? '...' : ''}`;
        }
      }
      
      // Step 4: Basic generation test
      results.steps.push({
        name: 'Basic Generation',
        status: 'running',
        message: 'Testing basic generation request'
      });
      
      try {
        // Use first available model if specified model isn't available
        const testModel = results.modelAvailable ? model : (results.modelList[0] || 'unknown');
        
        if (testModel === 'unknown') {
          throw new Error('No model available for testing');
        }
        
        const completionResponse = await axios.post(
          `${baseUrl}/api/generate`, 
          {
            model: testModel,
            prompt: 'Hello',
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 10
            }
          },
          { timeout: 10000 }
        );
        
        if (completionResponse.data?.response) {
          results.basicCompletionWorking = true;
          results.steps[3].status = 'success';
          results.steps[3].message = 'Basic generation test successful';
          results.steps[3].details = `Response: "${completionResponse.data.response.substring(0, 50)}${completionResponse.data.response.length > 50 ? '...' : ''}"`;
        } else {
          results.basicCompletionWorking = false;
          results.steps[3].status = 'warning';
          results.steps[3].message = 'Generation response received but may be malformed';
          results.steps[3].details = `Response structure: ${JSON.stringify(completionResponse.data).substring(0, 100)}...`;
        }
      } catch (error) {
        results.basicCompletionWorking = false;
        results.steps[3].status = 'error';
        results.steps[3].message = `Generation request failed: ${error.message}`;
        results.steps[3].details = error.response?.data ? 
          `Server response: ${JSON.stringify(error.response.data)}` : 
          `Error details: ${error.message}`;
      }
      
      // Determine overall status
      if (results.serverReachable && results.modelsEndpointWorking && 
          results.modelAvailable && results.basicCompletionWorking) {
        results.generalStatus = 'success';
      } else if (results.serverReachable && results.modelsEndpointWorking) {
        results.generalStatus = 'warning';
      } else {
        results.generalStatus = 'failed';
      }
      
    } catch (error) {
      results.errorDetails = {
        message: error.message,
        stack: error.stack,
        responseData: error.response?.data
      };
    }
    
    return results;
  }
}

// Export as singleton
const llmDiagnostic = new LlmDiagnostic();
export default llmDiagnostic;
