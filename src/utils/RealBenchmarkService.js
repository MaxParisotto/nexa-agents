/**
 * RealBenchmarkService - Comprehensive benchmark utility for LLM models
 * Evaluates actual response quality against expected answers or criteria
 */

import axios from 'axios';

class RealBenchmarkService {
  constructor() {
    // Define benchmark tasks with prompts and expected answers or evaluation criteria
    this.benchmarkTasks = {
      factual: {
        name: "Factual Knowledge",
        prompts: [
          {
            prompt: "What is the capital of France?",
            expectedAnswer: "Paris",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "Who wrote 'Pride and Prejudice'?",
            expectedAnswer: "Jane Austen",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "What year did World War II end?",
            expectedAnswer: "1945",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "What is the chemical symbol for gold?",
            expectedAnswer: "Au",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "What is the largest planet in our solar system?",
            expectedAnswer: "Jupiter",
            evaluationMethod: "exactMatch"
          }
        ]
      },
      reasoning: {
        name: "Logical Reasoning",
        prompts: [
          {
            prompt: "If all A are B, and some B are C, can we conclude that some A are C?",
            expectedAnswer: "No",
            explanation: "This is a logical fallacy. While all A are B, and some B are C, the B that are C might not include any A.",
            evaluationMethod: "logicalAnalysis"
          },
          {
            prompt: "A bat and ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
            expectedAnswer: "0.05",
            explanation: "If the ball costs x, then the bat costs x + 1.00. Together they cost 1.10, so x + (x + 1.00) = 1.10. Solving for x: 2x + 1.00 = 1.10, 2x = 0.10, x = 0.05.",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
            expectedAnswer: "5",
            explanation: "Each machine makes 1 widget in 5 minutes. So 100 machines would make 100 widgets in 5 minutes.",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "Mary's father has five daughters: 1. Nana, 2. Nene, 3. Nini, 4. Nono. What is the name of the fifth daughter?",
            expectedAnswer: "Mary",
            explanation: "The question states that Mary's father has five daughters, so Mary must be one of them.",
            evaluationMethod: "exactMatch"
          },
          {
            prompt: "A farmer has 15 sheep, and all but 8 die. How many sheep are left?",
            expectedAnswer: "8",
            explanation: "The phrase 'all but 8' means that 8 sheep remain.",
            evaluationMethod: "exactMatch"
          }
        ]
      },
      coding: {
        name: "Code Generation",
        prompts: [
          {
            prompt: "Write a JavaScript function that checks if a string is a palindrome.",
            evaluationCriteria: [
              "Function correctly identifies palindromes",
              "Handles case sensitivity",
              "Handles spaces and special characters",
              "Has proper error handling"
            ],
            testCases: [
              { input: "racecar", expected: true },
              { input: "hello", expected: false },
              { input: "A man a plan a canal Panama", expected: true }
            ],
            evaluationMethod: "codeEvaluation"
          },
          {
            prompt: "Write a Python function to find the second largest number in a list.",
            evaluationCriteria: [
              "Function correctly finds the second largest number",
              "Handles duplicate values",
              "Handles empty lists or lists with one element",
              "Has proper error handling"
            ],
            testCases: [
              { input: "[1, 2, 3, 4, 5]", expected: 4 },
              { input: "[5, 5, 4, 3, 2]", expected: 4 },
              { input: "[1]", expected: "Error or None" }
            ],
            evaluationMethod: "codeEvaluation"
          },
          {
            prompt: "Write a SQL query to find the top 5 customers who have spent the most money.",
            evaluationCriteria: [
              "Query correctly selects top 5 customers",
              "Uses appropriate aggregation functions",
              "Includes proper sorting",
              "Handles ties appropriately"
            ],
            expectedElements: [
              "SELECT", "FROM", "GROUP BY", "ORDER BY", "LIMIT"
            ],
            evaluationMethod: "sqlEvaluation"
          }
        ]
      },
      creativity: {
        name: "Creativity & Writing",
        prompts: [
          {
            prompt: "Write a short poem about artificial intelligence.",
            evaluationCriteria: [
              "Relevance to the topic",
              "Creative use of language",
              "Coherence and structure",
              "Originality"
            ],
            evaluationMethod: "creativityEvaluation"
          },
          {
            prompt: "Write a brief story about a time traveler who accidentally changes history.",
            evaluationCriteria: [
              "Narrative coherence",
              "Character development",
              "Creative plot elements",
              "Engagement and interest"
            ],
            evaluationMethod: "creativityEvaluation"
          },
          {
            prompt: "Describe a new invention that could solve a common everyday problem.",
            evaluationCriteria: [
              "Innovation and originality",
              "Practicality and feasibility",
              "Clear description of the problem and solution",
              "Consideration of potential impacts"
            ],
            evaluationMethod: "creativityEvaluation"
          }
        ]
      },
      toolCalling: {
        name: "Tool Calling",
        prompts: [
          {
            prompt: "What's the weather like in New York City today?",
            expectedTool: "get_weather",
            expectedArgs: { location: "New York City" },
            evaluationMethod: "toolCallEvaluation"
          },
          {
            prompt: "Calculate 235 + 467 and then multiply by 3.",
            expectedTool: "calculator",
            expectedArgs: { operation: "add", operands: [235, 467] },
            followUpTool: { operation: "multiply", operands: [702, 3] },
            evaluationMethod: "toolCallEvaluation"
          },
          {
            prompt: "Search for information about SpaceX Starship.",
            expectedTool: "search",
            expectedArgs: { query: "SpaceX Starship" },
            evaluationMethod: "toolCallEvaluation"
          }
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
   * Run a comprehensive benchmark against a specific LLM API
   * @param {Object} options Configuration for the benchmark
   * @returns {Promise<Object>} Benchmark results
   */
  async runBenchmark(options = {}) {
    const {
      serverType = 'lmStudio',
      apiUrl = 'http://localhost:1234',
      model = 'unknown',
      taskTypes = ['factual'],
      maxPrompts = 3,
      temperature = 0.7,
      maxTokens = 256,
      includeFunctionCalling = true
    } = options;

    console.log(`Starting real benchmark for ${model} (${serverType})`);
    
    // Storage for results
    const results = {
      serverType,
      apiUrl,
      model,
      startTime: new Date(),
      endTime: null,
      totalDuration: 0,
      tasks: [],
      overallScore: 0,
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
        averageScore: 0,
        averageResponseTime: 0
      };
      
      // Process each prompt in the task
      for (const promptData of task.prompts) {
        console.log(`Testing prompt: ${promptData.prompt.substring(0, 30)}...`);
        
        const promptResult = await this.testPrompt({
          serverType,
          apiUrl,
          model,
          promptData, 
          temperature,
          maxTokens,
          // Only include tools for toolCalling tasks
          tools: task.type === 'toolCalling' ? this.tools : undefined
        });
        
        taskResults.prompts.push(promptResult);
      }
      
      // Calculate task-level stats
      if (taskResults.prompts.length > 0) {
        taskResults.averageScore = taskResults.prompts.reduce((sum, p) => sum + p.score, 0) / taskResults.prompts.length;
        taskResults.averageResponseTime = taskResults.prompts.reduce((sum, p) => sum + p.responseTime, 0) / taskResults.prompts.length;
      }
      
      results.tasks.push(taskResults);
    }
    
    // Add function calling benchmark if enabled
    if (includeFunctionCalling && this.benchmarkTasks.toolCalling) {
      const functionCallingResults = await this.runToolCallingBenchmark({
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
      // Calculate overall score as weighted average of task scores
      const taskWeights = {
        factual: 1.0,
        reasoning: 1.2,
        coding: 1.5,
        creativity: 0.8,
        toolCalling: 1.0
      };
      
      let totalWeight = 0;
      let weightedScoreSum = 0;
      
      for (const task of results.tasks) {
        const weight = taskWeights[task.type] || 1.0;
        weightedScoreSum += task.averageScore * weight;
        totalWeight += weight;
      }
      
      results.overallScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;
      
      // Generate summary
      results.summary = {
        totalPrompts: results.tasks.reduce((sum, task) => sum + task.prompts.length, 0),
        averageScore: Math.round(results.overallScore * 10) / 10,
        averageResponseTimeMs: Math.round(results.tasks.reduce((sum, task) => sum + task.averageResponseTime, 0) / results.tasks.length),
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
   * Test a specific prompt against the LLM API and evaluate the response
   * @private
   */
  async testPrompt({ serverType, apiUrl, model, promptData, temperature, maxTokens, tools }) {
    const startTime = Date.now();
    let response = null;
    let error = null;
    let content = "";
    let toolCalls = null;
    let score = 0;
    let evaluationDetails = {};
    
    try {
      // Call the appropriate API based on server type
      if (serverType === 'lmStudio') {
        response = await this.callLmStudioApi(apiUrl, model, promptData.prompt, temperature, maxTokens, tools);
      } else if (serverType === 'ollama') {
        response = await this.callOllamaApi(apiUrl, model, promptData.prompt, temperature, maxTokens, tools);
      } else {
        throw new Error(`Unsupported server type: ${serverType}`);
      }
      
      // Extract content and tool calls from response
      content = this.extractContent(response);
      toolCalls = this.extractToolCalls(response);
      
      // Evaluate the response based on the evaluation method
      const evaluationResult = await this.evaluateResponse(promptData, content, toolCalls);
      score = evaluationResult.score;
      evaluationDetails = evaluationResult.details;
      
    } catch (err) {
      error = err.message;
      console.error(`Error in prompt test: ${err.message}`);
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      prompt: promptData.prompt,
      responseTime,
      content: content || "",
      toolCalls,
      score,
      evaluationDetails,
      error,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Evaluate a response based on the evaluation method
   * @private
   */
  async evaluateResponse(promptData, content, toolCalls) {
    const { evaluationMethod } = promptData;
    let score = 0;
    let details = {};
    
    switch (evaluationMethod) {
      case 'exactMatch':
        return this.evaluateExactMatch(promptData, content);
      
      case 'logicalAnalysis':
        return this.evaluateLogicalReasoning(promptData, content);
      
      case 'codeEvaluation':
        return this.evaluateCode(promptData, content);
      
      case 'sqlEvaluation':
        return this.evaluateSql(promptData, content);
      
      case 'creativityEvaluation':
        return this.evaluateCreativity(promptData, content);
      
      case 'toolCallEvaluation':
        return this.evaluateToolCall(promptData, toolCalls);
      
      default:
        // Default evaluation - simple text matching
        const normalizedContent = content.toLowerCase().trim();
        const normalizedExpected = promptData.expectedAnswer ? promptData.expectedAnswer.toLowerCase().trim() : '';
        
        if (normalizedContent.includes(normalizedExpected)) {
          score = 80; // Basic match
        } else {
          score = 0;
        }
        
        return { score, details: { method: 'default' } };
    }
  }
  
  /**
   * Evaluate exact match responses
   * @private
   */
  evaluateExactMatch(promptData, content) {
    const { expectedAnswer } = promptData;
    let score = 0;
    let details = { method: 'exactMatch' };
    
    if (!content || !expectedAnswer) {
      return { score: 0, details };
    }
    
    // Normalize both strings for comparison
    const normalizedContent = content.toLowerCase().trim();
    const normalizedExpected = expectedAnswer.toLowerCase().trim();
    
    // Check for exact match
    if (normalizedContent === normalizedExpected) {
      score = 100;
      details.match = 'exact';
    } 
    // Check if the content contains the expected answer
    else if (normalizedContent.includes(normalizedExpected)) {
      score = 80;
      details.match = 'partial';
    }
    // Check for close match (e.g., "5 cents" instead of "0.05")
    else if (expectedAnswer === "0.05" && (normalizedContent.includes("5 cent") || normalizedContent.includes("$0.05"))) {
      score = 90;
      details.match = 'semantic';
    }
    // Other special cases
    else {
      score = 0;
      details.match = 'none';
    }
    
    return { score, details };
  }
  
  /**
   * Evaluate logical reasoning responses
   * @private
   */
  evaluateLogicalReasoning(promptData, content) {
    const { expectedAnswer, explanation } = promptData;
    let score = 0;
    let details = { method: 'logicalReasoning' };
    
    if (!content) {
      return { score: 0, details };
    }
    
    // Normalize content
    const normalizedContent = content.toLowerCase().trim();
    const normalizedExpected = expectedAnswer.toLowerCase().trim();
    
    // Check if the answer is correct
    const hasCorrectAnswer = normalizedContent.includes(normalizedExpected);
    
    // Check for explanation quality
    const explanationKeywords = explanation.toLowerCase().split(' ').filter(word => word.length > 4);
    let explanationScore = 0;
    
    for (const keyword of explanationKeywords) {
      if (normalizedContent.includes(keyword)) {
        explanationScore += 5; // 5 points per matching keyword
      }
    }
    
    // Cap explanation score at 70
    explanationScore = Math.min(explanationScore, 70);
    
    // Final score: 30% for correct answer, 70% for explanation quality
    score = (hasCorrectAnswer ? 30 : 0) + explanationScore;
    
    details.hasCorrectAnswer = hasCorrectAnswer;
    details.explanationScore = explanationScore;
    
    return { score, details };
  }
  
  /**
   * Evaluate code responses
   * @private
   */
  evaluateCode(promptData, content) {
    const { evaluationCriteria, testCases } = promptData;
    let score = 0;
    let details = { method: 'codeEvaluation', criteriaScores: {} };
    
    if (!content) {
      return { score: 0, details };
    }
    
    // Extract code block if present
    const codeBlockRegex = /```(?:javascript|python|js|py)?\s*([\s\S]*?)```/;
    const codeMatch = content.match(codeBlockRegex);
    const code = codeMatch ? codeMatch[1].trim() : content;
    
    // Check for presence of function definition
    const hasFunctionDef = /function\s+\w+\s*\(|def\s+\w+\s*\(/.test(code);
    
    // Check for basic syntax elements
    const hasReturnStatement = /return/.test(code);
    const hasErrorHandling = /try|catch|except|if\s+.*?error|if\s+.*?invalid/.test(code);
    
    // Evaluate against criteria
    let criteriaScore = 0;
    
    if (evaluationCriteria) {
      // Function definition (25%)
      if (hasFunctionDef) {
        criteriaScore += 25;
        details.criteriaScores.functionDefinition = 25;
      } else {
        details.criteriaScores.functionDefinition = 0;
      }
      
      // Return statement (15%)
      if (hasReturnStatement) {
        criteriaScore += 15;
        details.criteriaScores.returnStatement = 15;
      } else {
        details.criteriaScores.returnStatement = 0;
      }
      
      // Error handling (15%)
      if (hasErrorHandling) {
        criteriaScore += 15;
        details.criteriaScores.errorHandling = 15;
      } else {
        details.criteriaScores.errorHandling = 0;
      }
      
      // Logic completeness (45%) - based on keywords specific to the task
      let logicScore = 0;
      
      // Check for task-specific keywords
      if (promptData.prompt.includes("palindrome")) {
        const hasReversal = /reverse|split.*reverse.*join/.test(code);
        const hasComparison = /===|==|equals|toLowerCase/.test(code);
        
        if (hasReversal) logicScore += 25;
        if (hasComparison) logicScore += 20;
        
        details.criteriaScores.taskSpecificLogic = logicScore;
      } 
      else if (promptData.prompt.includes("second largest")) {
        const hasSorting = /sort\(|sorted\(/.test(code);
        const hasIndexing = /\[\s*-2\s*\]|\[\s*1\s*\]|second|2nd/.test(code);
        
        if (hasSorting) logicScore += 25;
        if (hasIndexing) logicScore += 20;
        
        details.criteriaScores.taskSpecificLogic = logicScore;
      }
      else {
        // Generic logic score for other tasks
        logicScore = 30;
        details.criteriaScores.taskSpecificLogic = logicScore;
      }
      
      criteriaScore += logicScore;
    }
    
    score = criteriaScore;
    details.overallCriteriaScore = criteriaScore;
    
    return { score, details };
  }
  
  /**
   * Evaluate SQL responses
   * @private
   */
  evaluateSql(promptData, content) {
    const { expectedElements } = promptData;
    let score = 0;
    let details = { method: 'sqlEvaluation', elementScores: {} };
    
    if (!content || !expectedElements) {
      return { score: 0, details };
    }
    
    // Extract SQL query if present
    const sqlBlockRegex = /```(?:sql)?\s*([\s\S]*?)```/;
    const sqlMatch = content.match(sqlBlockRegex);
    const sql = sqlMatch ? sqlMatch[1].trim() : content;
    
    // Normalize SQL for comparison
    const normalizedSql = sql.toLowerCase();
    
    // Check for each expected element
    let elementScore = 0;
    const totalElements = expectedElements.length;
    
    for (const element of expectedElements) {
      const normalizedElement = element.toLowerCase();
      if (normalizedSql.includes(normalizedElement)) {
        const points = 100 / totalElements;
        elementScore += points;
        details.elementScores[element] = points;
      } else {
        details.elementScores[element] = 0;
      }
    }
    
    // Additional points for correct structure and syntax
    if (normalizedSql.includes("select") && normalizedSql.includes("from")) {
      // Basic SQL structure is correct
      elementScore = Math.min(elementScore + 10, 100);
    }
    
    score = elementScore;
    
    return { score, details };
  }
  
  /**
   * Evaluate creativity responses
   * @private
   */
  evaluateCreativity(promptData, content) {
    const { evaluationCriteria } = promptData;
    let score = 0;
    let details = { method: 'creativityEvaluation', criteriaScores: {} };
    
    if (!content || !evaluationCriteria) {
      return { score: 0, details };
    }
    
    // Length-based scoring (longer responses generally show more effort)
    const lengthScore = Math.min(content.length / 50, 20); // Up to 20 points for length
    details.criteriaScores.length = lengthScore;
    
    // Structure-based scoring
    let structureScore = 0;
    
    // Check for paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      structureScore += 10;
    }
    
    // Check for formatting elements
    if (/\*\*|\*|_|#|##|###/.test(content)) {
      structureScore += 5;
    }
    
    details.criteriaScores.structure = structureScore;
    
    // Relevance to prompt
    let relevanceScore = 0;
    const promptKeywords = promptData.prompt.toLowerCase().split(' ')
      .filter(word => word.length > 4)
      .map(word => word.replace(/[.,?!;:]/g, ''));
    
    const uniqueKeywords = [...new Set(promptKeywords)];
    const normalizedContent = content.toLowerCase();
    
    for (const keyword of uniqueKeywords) {
      if (normalizedContent.includes(keyword)) {
        relevanceScore += 40 / uniqueKeywords.length;
      }
    }
    
    details.criteriaScores.relevance = Math.min(relevanceScore, 40);
    
    // Creativity score (subjective, based on variety of sentence structures)
    const sentences = content.split(/[.!?]+/);
    const sentenceLengths = sentences.map(s => s.trim().split(' ').length);
    const uniqueLengths = new Set(sentenceLengths).size;
    
    const creativityScore = Math.min(uniqueLengths * 5, 25);
    details.criteriaScores.creativity = creativityScore;
    
    // Calculate total score
    score = lengthScore + structureScore + details.criteriaScores.relevance + creativityScore;
    
    return { score, details };
  }
  
  /**
   * Evaluate tool call responses
   * @private
   */
  evaluateToolCall(promptData, toolCalls) {
    const { expectedTool, expectedArgs } = promptData;
    let score = 0;
    let details = { method: 'toolCallEvaluation' };
    
    if (!toolCalls || toolCalls.length === 0 || !expectedTool) {
      return { score: 0, details: { ...details, reason: 'No tool calls found' } };
    }
    
    // Get the first tool call
    const toolCall = toolCalls[0];
    
    // Check if the correct tool was called
    const correctTool = toolCall.function && toolCall.function.name === expectedTool;
    
    if (!correctTool) {
      return { 
        score: 0, 
        details: { 
          ...details, 
          reason: `Wrong tool called: ${toolCall.function?.name} instead of ${expectedTool}` 
        } 
      };
    }
    
    // Parse arguments
    let args = {};
    try {
      if (toolCall.function.arguments) {
        args = JSON.parse(toolCall.function.arguments);
      }
    } catch (error) {
      return { 
        score: 50, 
        details: { 
          ...details, 
          reason: 'Correct tool but invalid arguments format',
          correctTool: true,
          correctArgs: false
        } 
      };
    }
    
    // Check arguments
    let argScore = 0;
    const expectedArgKeys = Object.keys(expectedArgs);
    
    for (const key of expectedArgKeys) {
      if (args[key]) {
        // For string arguments, check if they contain the expected value
        if (typeof expectedArgs[key] === 'string' && typeof args[key] === 'string') {
          const normalizedExpected = expectedArgs[key].toLowerCase();
          const normalizedActual = args[key].toLowerCase();
          
          if (normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual)) {
            argScore += 50 / expectedArgKeys.length;
          }
        }
        // For exact matches (numbers, booleans)
        else if (args[key] === expectedArgs[key]) {
          argScore += 50 / expectedArgKeys.length;
        }
      }
    }
    
    score = 50 + argScore; // 50 for correct tool, up to 50 for correct args
    
    details.correctTool = true;
    details.argScore = argScore;
    
    return { score, details };
  }
  
  /**
   * Run specialized tool calling benchmark
   * @private
   */
  async runToolCallingBenchmark(options) {
    const { serverType, apiUrl, model, temperature, maxTokens } = options;
    
    // Use the tool calling prompts from the benchmark tasks
    const testCases = this.benchmarkTasks.toolCalling.prompts;
    
    const results = {
      testCases: [],
      successRate: 0,
      accuracy: 0,
      averageResponseTime: 0,
      averageScore: 0
    };
    
    let successCount = 0;
    let totalResponseTime = 0;
    let totalScore = 0;
    
    for (const testCase of testCases) {
      console.log(`Running tool calling test: ${testCase.prompt.substring(0, 30)}...`);
      
      const promptResult = await this.testPrompt({
        serverType,
        apiUrl,
        model,
        promptData: testCase,
        temperature,
        maxTokens,
        tools: this.tools
      });
      
      // A test is successful if the score is at least 50 (correct tool called)
      const success = promptResult.score >= 50;
      if (success) {
        successCount++;
      }
      
      totalResponseTime += promptResult.responseTime;
      totalScore += promptResult.score;
      
      results.testCases.push({
        prompt: testCase.prompt,
        expectedTool: testCase.expectedTool,
        expectedArgs: testCase.expectedArgs,
        actualToolCalls: promptResult.toolCalls,
        score: promptResult.score,
        success,
        responseTime: promptResult.responseTime,
        error: promptResult.error
      });
    }
    
    // Calculate overall metrics
    const testCount = testCases.length;
    results.successRate = testCount > 0 ? successCount / testCount : 0;
    results.averageResponseTime = testCount > 0 ? totalResponseTime / testCount : 0;
    results.averageScore = testCount > 0 ? totalScore / testCount : 0;
    results.accuracy = results.successRate; // Simple accuracy for now
    
    return results;
  }
  
  /**
   * Call the LM Studio API with optional tool definitions
   * @private
   */
  async callLmStudioApi(apiUrl, model, prompt, temperature = 0.7, max_tokens = 256, tools = undefined) {
    // Ensure we have a clean base URL without trailing slashes
    let baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // Check if the baseUrl already includes /v1
    const endpoint = baseUrl.includes('/v1') ? '/chat/completions' : '/v1/chat/completions';
    
    console.log(`Calling LM Studio API at ${baseUrl}${endpoint}`);
    
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
    
    try {
      const response = await axios.post(
        `${baseUrl}${endpoint}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // 30 seconds
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error calling LM Studio API: ${error.message}`);
      throw error;
    }
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
    
    try {
      const response = await axios.post(
        `${baseUrl}${endpoint}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // 30 seconds
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error calling Ollama API: ${error.message}`);
      throw error;
    }
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
   * Save benchmark results to localStorage
   * @private
   */
  saveResults(results) {
    try {
      // Get existing results
      const existingResultsJson = localStorage.getItem('realBenchmarkResults');
      let benchmarkHistory = existingResultsJson ? JSON.parse(existingResultsJson) : [];
      
      // Add new results with a unique ID
      results.id = `benchmark-${Date.now()}`;
      
      // Keep only the last 20 benchmark results
      benchmarkHistory = [results, ...benchmarkHistory].slice(0, 20);
      
      // Save back to localStorage
      localStorage.setItem('realBenchmarkResults', JSON.stringify(benchmarkHistory));
      
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
      const resultsJson = localStorage.getItem('realBenchmarkResults');
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
    localStorage.removeItem('realBenchmarkResults');
    return true;
  }
}

// Export singleton instance
const realBenchmarkService = new RealBenchmarkService();
export default realBenchmarkService;
