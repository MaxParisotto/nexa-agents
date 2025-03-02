/**
 * LlmBenchmarkService - Utility for benchmarking LLM models
 * Includes support for tool/function calling capabilities
 */

import axios from 'axios';

class LlmBenchmarkService {
  constructor() {
    this.benchmarkTasks = {
      completion: {
        name: "Text Completion",
        prompts: [
          "Write a brief summary of the main features of deep learning.",
          "Explain how photosynthesis works in plants.",
          "Describe three ways to improve productivity when working from home."
        ]
      },
      coding: {
        name: "Code Generation",
        prompts: [
          "Write a function in JavaScript that sorts an array of numbers.",
          "Create a Python class that represents a simple bank account with deposit and withdraw methods.",
          "Write a SQL query to select all employees who have been at the company for more than 5 years."
        ]
      },
      reasoning: {
        name: "Logical Reasoning",
        prompts: [
          "If all A are B, and some B are C, can we conclude that some A are C? Explain your reasoning.",
          "A bat and ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
          "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?"
        ]
      },
      // New task type for function/tool calling
      toolCalling: {
        name: "Tool Calling",
        prompts: [
          "Find the current weather in New York City.",
          "Calculate the sum of 156 and 842, then multiply the result by 3.",
          "Search for information about electric cars and summarize their advantages."
        ]
      }
    };

    // Tools/functions to use in benchmarks
    this.tools = [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather in a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA"
              },
              unit: {
                type: "string",
                enum: ["celsius", "fahrenheit"],
                description: "The temperature unit to use"
              }
            },
            required: ["location"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calculator",
          description: "Perform mathematical calculations",
          parameters: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                enum: ["add", "subtract", "multiply", "divide"],
                description: "The operation to perform"
              },
              operands: {
                type: "array",
                items: {
                  type: "number"
                },
                description: "The numbers to operate on"
              }
            },
            required: ["operation", "operands"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search",
          description: "Search for information on a topic",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              },
              limit: {
                type: "integer",
                description: "Maximum number of results to return"
              }
            },
            required: ["query"]
          }
        }
      }
    ];
  }

  /**
   * Run a benchmark against a specific LLM API
   * @param {Object} options Configuration for the benchmark
   * @returns {Promise<Object>} Benchmark results
   */
  async runBenchmark(options = {}) {
    const {
      serverType = 'lmStudio',
      apiUrl = 'http://localhost:1234',
      model = 'unknown',
      taskTypes = ['completion'],
      maxPrompts = 1,
      temperature = 0.7,
      maxTokens = 256,
      includeFunctionCalling = true
    } = options;

    console.log(`Starting ${serverType} benchmark for model: ${model}`);
    
    // Storage for results
    const results = {
      serverType,
      apiUrl,
      model,
      startTime: new Date(),
      endTime: null,
      totalDuration: 0,
      tasks: [],
      averageResponseTime: 0,
      tokensPerSecond: 0,
      summary: {},
      functionCallingResults: includeFunctionCalling ? {} : null
    };

    // Select tasks and prompts based on configuration
    const selectedTasks = [];
    
    for (const taskType of taskTypes) {
      if (this.benchmarkTasks[taskType]) {
        const task = this.benchmarkTasks[taskType];
        // Take only the specified number of prompts
        const prompts = task.prompts.slice(0, maxPrompts);
        
        selectedTasks.push({
          type: taskType,
          name: task.name,
          prompts
        });
      }
    }

    // Run each task
    for (const task of selectedTasks) {
      console.log(`Running ${task.name} task...`);
      
      const taskResults = {
        type: task.type,
        name: task.name,
        prompts: [],
        averageResponseTime: 0,
        totalTokens: 0,
        tokensPerSecond: 0
      };
      
      // Process each prompt in the task
      for (const prompt of task.prompts) {
        console.log(`Testing prompt: ${prompt.substring(0, 30)}...`);
        
        const promptResult = await this.testPrompt({
          serverType,
          apiUrl,
          model,
          prompt, 
          temperature,
          maxTokens,
          // Only include tools for toolCalling tasks
          tools: task.type === 'toolCalling' ? this.tools : undefined
        });
        
        taskResults.prompts.push(promptResult);
      }
      
      // Calculate task-level stats
      if (taskResults.prompts.length > 0) {
        taskResults.averageResponseTime = taskResults.prompts.reduce((sum, p) => sum + p.responseTime, 0) / taskResults.prompts.length;
        taskResults.totalTokens = taskResults.prompts.reduce((sum, p) => sum + p.outputTokens, 0);
        
        const totalTimeSeconds = taskResults.prompts.reduce((sum, p) => sum + p.responseTime, 0) / 1000;
        taskResults.tokensPerSecond = totalTimeSeconds > 0 ? taskResults.totalTokens / totalTimeSeconds : 0;
      }
      
      results.tasks.push(taskResults);
    }
    
    // Add function calling benchmark if enabled
    if (includeFunctionCalling) {
      const functionCallingResults = await this.runFunctionCallingBenchmark({
        serverType,
        apiUrl,
        model,
        temperature,
        maxTokens
      });
      
      results.functionCallingResults = functionCallingResults;
    }
    
    // Calculate overall stats
    results.endTime = new Date();
    results.totalDuration = results.endTime - results.startTime;
    
    if (results.tasks.length > 0) {
      // Average response time across all tasks
      results.averageResponseTime = results.tasks.reduce((sum, task) => sum + task.averageResponseTime, 0) / results.tasks.length;
      
      // Average tokens per second
      const totalTokens = results.tasks.reduce((sum, task) => sum + task.totalTokens, 0);
      const totalResponseTimeSeconds = results.tasks.reduce(
        (sum, task) => sum + (task.prompts.reduce((pSum, p) => pSum + p.responseTime, 0) / 1000), 
        0
      );
      
      results.tokensPerSecond = totalResponseTimeSeconds > 0 ? totalTokens / totalResponseTimeSeconds : 0;
      
      // Generate summary
      results.summary = {
        totalPrompts: results.tasks.reduce((sum, task) => sum + task.prompts.length, 0),
        averageResponseTimeMs: Math.round(results.averageResponseTime),
        averageTokensPerSecond: Math.round(results.tokensPerSecond * 10) / 10,
        totalTokensGenerated: totalTokens,
        totalDurationSeconds: Math.round(results.totalDuration / 100) / 10
      };
      
      // Add function calling stats to summary if available
      if (includeFunctionCalling && results.functionCallingResults) {
        results.summary.functionCalling = {
          accuracy: results.functionCallingResults.accuracy,
          responseTime: results.functionCallingResults.averageResponseTime,
          successRate: results.functionCallingResults.successRate
        };
      }
    }
    
    // Save results in localStorage for history
    this.saveResults(results);
    
    return results;
  }
  
  /**
   * Test a specific prompt against the LLM API
   * @private
   */
  async testPrompt({ serverType, apiUrl, model, prompt, temperature, maxTokens, tools }) {
    const startTime = Date.now();
    let response = null;
    let error = null;
    let content = "";
    let outputTokens = 0;
    let toolCalls = null;
    
    try {
      if (serverType === 'lmStudio') {
        response = await this.callLmStudioApi(apiUrl, model, prompt, temperature, maxTokens, tools);
      } else if (serverType === 'ollama') {
        response = await this.callOllamaApi(apiUrl, model, prompt, temperature, maxTokens, tools);
      } else {
        throw new Error(`Unsupported server type: ${serverType}`);
      }
      
      // Extract content and estimate tokens
      content = this.extractContent(response);
      outputTokens = this.estimateTokenCount(content);
      
      // Extract tool calls if present
      toolCalls = this.extractToolCalls(response);
    } catch (err) {
      error = err.message;
      console.error(`Error in prompt test: ${err.message}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      prompt,
      responseTime,
      content: content || "",
      outputTokens,
      toolCalls,
      error,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Run specialized function calling benchmark
   * @private
   */
  async runFunctionCallingBenchmark(options) {
    const { serverType, apiUrl, model, temperature, maxTokens } = options;
    
    // Define specific function calling test cases with expected outcomes
    const testCases = [
      {
        name: "Weather lookup",
        prompt: "What's the weather like in San Francisco today?",
        expectedFunction: "get_weather",
        expectedArgs: { location: "San Francisco" }
      },
      {
        name: "Calculator",
        prompt: "Calculate 235 + 467",
        expectedFunction: "calculator",
        expectedArgs: { operation: "add", operands: [235, 467] }
      },
      {
        name: "Search",
        prompt: "Search for information about SpaceX Starship",
        expectedFunction: "search",
        expectedArgs: { query: "SpaceX Starship" }
      }
    ];
    
    const results = {
      testCases: [],
      successRate: 0,
      accuracy: 0,
      averageResponseTime: 0
    };
    
    let successCount = 0;
    let totalResponseTime = 0;
    
    for (const testCase of testCases) {
      console.log(`Running function calling test: ${testCase.name}`);
      
      const startTime = Date.now();
      let response = null;
      let error = null;
      let toolCalls = null;
      let success = false;
      
      try {
        if (serverType === 'lmStudio') {
          response = await this.callLmStudioApi(
            apiUrl, 
            model, 
            testCase.prompt, 
            temperature, 
            maxTokens, 
            this.tools
          );
        } else if (serverType === 'ollama') {
          response = await this.callOllamaApi(
            apiUrl, 
            model, 
            testCase.prompt, 
            temperature, 
            maxTokens, 
            this.tools
          );
        }
        
        // Extract tool calls
        toolCalls = this.extractToolCalls(response);
        
        // Check if the expected function was called
        if (toolCalls && toolCalls.length > 0) {
          const call = toolCalls[0];
          success = call.function.name === testCase.expectedFunction;
        }
        
        if (success) {
          successCount++;
        }
      } catch (err) {
        error = err.message;
        console.error(`Error in function calling test: ${err.message}`);
      }
      
      const responseTime = Date.now() - startTime;
      totalResponseTime += responseTime;
      
      results.testCases.push({
        name: testCase.name,
        prompt: testCase.prompt,
        expected: {
          function: testCase.expectedFunction,
          args: testCase.expectedArgs
        },
        actual: toolCalls?.[0] || null,
        success,
        responseTime,
        error
      });
    }
    
    // Calculate overall metrics
    results.successRate = testCases.length > 0 ? successCount / testCases.length : 0;
    results.averageResponseTime = testCases.length > 0 ? totalResponseTime / testCases.length : 0;
    
    // Calculate accuracy based on correct function name calls
    results.accuracy = results.successRate; // Simple accuracy for now
    
    return results;
  }
  
  /**
   * Call the LM Studio API with optional tool definitions
   * @private
   */
  async callLmStudioApi(apiUrl, model, prompt, temperature = 0.7, max_tokens = 256, tools = undefined) {
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    const endpoint = '/v1/chat/completions';
    
    // Prepare the request payload
    const payload = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens
    };
    
    // Add tools if provided
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }
    
    const response = await axios.post(
      `${baseUrl}${endpoint}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 seconds
      }
    );
    
    return response.data;
  }
  
  /**
   * Call the Ollama API with optional tool definitions
   * @private
   */
  async callOllamaApi(apiUrl, model, prompt, temperature = 0.7, max_tokens = 256, tools = undefined) {
    const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    
    // Determine which endpoint to use based on whether tools are provided
    const endpoint = tools ? '/api/chat' : '/api/generate';
    
    let payload;
    
    if (tools) {
      // Use the chat endpoint with messages format
      payload = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        num_predict: max_tokens,
        // Ollama specific format for tools
        tools: tools,
        stream: false
      };
    } else {
      // Use the generate endpoint with simple prompt
      payload = {
        model: model,
        prompt: prompt,
        temperature,
        num_predict: max_tokens
      };
    }
    
    const response = await axios.post(
      `${baseUrl}${endpoint}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30 seconds
      }
    );
    
    return response.data;
  }
  
  /**
   * Extract content from API response
   * @private
   */
  extractContent(response) {
    if (!response) return "";
    
    // Handle LM Studio / OpenAI format
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message?.content || 
             response.choices[0].text || 
             "";
    }
    
    // Handle Ollama format
    if (response.response) {
      return response.response;
    }
    
    // Try other common formats
    return response.content || 
           response.output || 
           response.generated_text || 
           response.result || 
           "";
  }
  
  /**
   * Extract tool calls from API response
   * @private
   */
  extractToolCalls(response) {
    if (!response) return null;
    
    // Handle OpenAI-compatible format (LM Studio)
    if (response.choices && response.choices.length > 0 && 
        response.choices[0].message?.tool_calls) {
      return response.choices[0].message.tool_calls;
    }
    
    // Handle Ollama format
    if (response.message?.tool_calls) {
      return response.message.tool_calls;
    }
    
    // Check for tool calls in the content text using regex
    const content = this.extractContent(response);
    if (content) {
      const toolCallMatches = content.match(/```json\s*(\{.*?\})\s*```/gs) || 
                              content.match(/<tool_call>\s*(\{.*?\})\s*<\/tool_call>/gs);
      
      if (toolCallMatches && toolCallMatches.length > 0) {
        try {
          // Try to parse the JSON from the first match
          const jsonStr = toolCallMatches[0].replace(/```json|```|<tool_call>|<\/tool_call>/g, '').trim();
          const toolCall = JSON.parse(jsonStr);
          
          // Convert to standard format
          return [{
            type: "function",
            function: {
              name: toolCall.name || toolCall.function || "unknown_function",
              arguments: JSON.stringify(toolCall.arguments || toolCall.params || {})
            }
          }];
        } catch (error) {
          console.error('Failed to parse tool call from content', error);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Estimate token count from text
   * This is a rough approximation - 1 token ≈ 4 characters in English
   * @private
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Save benchmark results to localStorage
   * @private
   */
  saveResults(results) {
    try {
      // Get existing results
      const existingResultsJson = localStorage.getItem('llmBenchmarkResults');
      let benchmarkHistory = existingResultsJson ? JSON.parse(existingResultsJson) : [];
      
      // Add new results with a unique ID
      results.id = `benchmark-${Date.now()}`;
      
      // Keep only the last 20 benchmark results
      benchmarkHistory = [results, ...benchmarkHistory].slice(0, 20);
      
      // Save back to localStorage
      localStorage.setItem('llmBenchmarkResults', JSON.stringify(benchmarkHistory));
      
      console.log(`Saved benchmark results with ID: ${results.id}`);
    } catch (error) {
      console.error('Failed to save benchmark results:', error);
    }
  }
  
  /**
   * Get benchmark history from localStorage
   */
  getBenchmarkHistory() {
    try {
      const resultsJson = localStorage.getItem('llmBenchmarkResults');
      return resultsJson ? JSON.parse(resultsJson) : [];
    } catch (error) {
      console.error('Failed to load benchmark history:', error);
      return [];
    }
  }
  
  /**
   * Clear benchmark history
   */
  clearBenchmarkHistory() {
    localStorage.removeItem('llmBenchmarkResults');
    return true;
  }
}

// Export singleton instance
const llmBenchmarkService = new LlmBenchmarkService();
export default llmBenchmarkService;
