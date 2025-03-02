import axios from 'axios';

/**
 * Utility to test LM Studio API endpoints
 */
export const testLmStudioApiEndpoints = async (baseUrl = 'http://localhost:1234') => {
  try {
    const cleanBaseUrl = baseUrl.startsWith('http') 
      ? baseUrl.replace(/\/+$/, '') // Remove trailing slashes
      : `http://${baseUrl}`.replace(/\/+$/, '');
    
    console.log(`Testing LM Studio API at ${cleanBaseUrl}`);
    
    // Test endpoints
    const endpoints = [
      '/v1/models',
      '/v1/chat/completions',
      '/chat/completions', // Alternative format
      '/v1/completions'
    ];
    
    const results = {};
    
    // Test GET on models endpoint
    try {
      console.log(`Testing GET ${cleanBaseUrl}/v1/models`);
      const modelsResponse = await axios.get(`${cleanBaseUrl}/v1/models`, { timeout: 2000 });
      results.models = {
        status: modelsResponse.status,
        success: true,
        data: modelsResponse.data
      };
      console.log('Models endpoint working!', modelsResponse.data);
    } catch (error) {
      results.models = {
        success: false,
        status: error.response?.status,
        error: error.message
      };
      console.error('Models endpoint failed:', error.message);
    }
    
    // Test a simple chat completion request
    const chatPayload = {
      model: "default_model",
      messages: [
        { role: "user", content: "Hello, are you working?" }
      ],
      temperature: 0.7,
      max_tokens: 50
    };
    
    // Try each chat completion endpoint
    for (const endpoint of ['/v1/chat/completions', '/chat/completions']) {
      const key = endpoint.replace(/\//g, '_');
      try {
        console.log(`Testing POST ${cleanBaseUrl}${endpoint}`);
        const chatResponse = await axios.post(
          `${cleanBaseUrl}${endpoint}`,
          chatPayload,
          { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          }
        );
        results[key] = {
          status: chatResponse.status,
          success: true
        };
        console.log(`${endpoint} endpoint working!`, chatResponse.status);
      } catch (error) {
        results[key] = {
          success: false,
          status: error.response?.status,
          error: error.message
        };
        console.error(`${endpoint} endpoint failed:`, error.message);
      }
    }
    
    return {
      success: results.models?.success || results._v1_chat_completions?.success || results._chat_completions?.success,
      results
    };
  } catch (error) {
    console.error('API endpoint testing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  window.testLmStudioApi = testLmStudioApiEndpoints;
  console.log('LM Studio API test utility loaded. Run window.testLmStudioApi() to test endpoints.');
}

export default testLmStudioApiEndpoints;
