/**
 * Test script for configuration saving and loading
 * Tests the server's rate limiting for configuration operations
 * 
 * Usage:
 * node src/scripts/test-config.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API endpoint
const API_ENDPOINT = 'http://localhost:3001';

// Test configuration
const testConfig = {
  lmStudio: {
    apiUrl: 'http://localhost:1234',
    defaultModel: 'test-model'
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    defaultModel: 'llama2'
  },
  nodeEnv: 'development',
  port: 3001
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test saving configuration
 */
async function testSave() {
  console.log(`${colors.cyan}Testing configuration saving...${colors.reset}`);
  
  try {
    // First save - should work
    console.log(`${colors.yellow}First save attempt...${colors.reset}`);
    const response1 = await axios.post(`${API_ENDPOINT}/api/config/save`, {
      format: 'json',
      content: JSON.stringify(testConfig, null, 2)
    });
    
    console.log(`${colors.green}✓ First save successful:${colors.reset}`, response1.data);
    
    // Rapid second save - should still work but might be rate limited by server
    console.log(`${colors.yellow}Immediate second save attempt...${colors.reset}`);
    const response2 = await axios.post(`${API_ENDPOINT}/api/config/save`, {
      format: 'json',
      content: JSON.stringify({ ...testConfig, test: 'updated' }, null, 2)
    });
    
    console.log(`${colors.green}✓ Second save response:${colors.reset}`, response2.data);
    
    // Test rate limiting - rapid saves
    console.log(`${colors.magenta}Testing rate limiting with 10 rapid saves...${colors.reset}`);
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        const response = await axios.post(`${API_ENDPOINT}/api/config/save`, {
          format: 'json',
          content: JSON.stringify({ ...testConfig, test: `update-${i}` }, null, 2)
        });
        results.push({ success: true, data: response.data });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.response ? error.response.data : error.message 
        });
      }
      
      // Small delay to make this not completely simultaneous
      await sleep(50);
    }
    
    console.log(`${colors.cyan}Results of 10 rapid saves:${colors.reset}`);
    results.forEach((result, i) => {
      if (result.success) {
        console.log(`${colors.green}✓ Save ${i+1} successful${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Save ${i+1} failed:${colors.reset}`, result.error);
      }
    });
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error testing save:${colors.reset}`, 
      error.response ? error.response.data : error);
    return false;
  }
}

/**
 * Test loading configuration
 */
async function testLoad() {
  console.log(`\n${colors.cyan}Testing configuration loading...${colors.reset}`);
  
  try {
    // First load - should work
    console.log(`${colors.yellow}First load attempt...${colors.reset}`);
    const response1 = await axios.get(`${API_ENDPOINT}/api/config/load?format=json`);
    
    console.log(`${colors.green}✓ First load successful${colors.reset}`);
    console.log(`Config content: ${response1.data.content.substring(0, 50)}...`);
    
    // Test rate limiting - rapid loads
    console.log(`${colors.magenta}Testing rate limiting with 10 rapid loads...${colors.reset}`);
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        const response = await axios.get(`${API_ENDPOINT}/api/config/load?format=json`);
        results.push({ success: true });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.response ? error.response.data : error.message 
        });
      }
      
      // Small delay to make this not completely simultaneous
      await sleep(100);
    }
    
    console.log(`${colors.cyan}Results of 10 rapid loads:${colors.reset}`);
    let successCount = 0;
    results.forEach((result, i) => {
      if (result.success) {
        successCount++;
        console.log(`${colors.green}✓ Load ${i+1} successful${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Load ${i+1} failed:${colors.reset}`, result.error);
      }
    });
    
    console.log(`${colors.cyan}Summary: ${successCount} of 10 rapid loads succeeded${colors.reset}`);
    console.log(`${colors.yellow}This demonstrates the rate limiting in action${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error testing load:${colors.reset}`, 
      error.response ? error.response.data : error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log(`${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.magenta}  CONFIGURATION SERVICE TEST SUITE  ${colors.reset}`);
  console.log(`${colors.magenta}====================================${colors.reset}`);
  
  // Check if server is running
  try {
    await axios.get(`${API_ENDPOINT}/api/config/load?format=json`, { timeout: 2000 });
    console.log(`${colors.green}✓ Server is running at ${API_ENDPOINT}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Server not running or unreachable at ${API_ENDPOINT}${colors.reset}`);
    console.log(`${colors.yellow}Please start the server using 'node start-server.js' first.${colors.reset}`);
    process.exit(1);
  }
  
  // Run tests
  const saveSuccess = await testSave();
  const loadSuccess = await testLoad();
  
  // Report overall success
  console.log(`\n${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.magenta}            TEST RESULTS            ${colors.reset}`);
  console.log(`${colors.magenta}====================================${colors.reset}`);
  console.log(`Save tests: ${saveSuccess ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`Load tests: ${loadSuccess ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  
  if (saveSuccess && loadSuccess) {
    console.log(`\n${colors.green}All tests passed!${colors.reset}`);
    console.log(`${colors.yellow}Note: You may see some rate limiting in action, which is expected behavior.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}Some tests failed.${colors.reset}`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
}); 