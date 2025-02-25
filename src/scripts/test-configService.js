/**
 * Simple test script for the configuration service
 * 
 * Usage:
 * node --experimental-vm-modules src/scripts/test-configService.js
 */

// We need to use dynamic import to load ES modules in CommonJS
const path = require('path');

async function runTest() {
  console.log('Testing configuration service...');
  
  // Dynamically import the module
  const configServicePath = path.resolve(__dirname, '../services/configService.js');
  
  try {
    // Import the module
    const { default: configService } = await import('file://' + configServicePath);
    
    // Test 1: Check if saveConfig exists
    console.log('\nTest 1: Verifying saveConfig function exists');
    if (typeof configService.saveConfig === 'function') {
      console.log('✅ saveConfig function exists');
    } else {
      console.log('❌ saveConfig function does not exist');
      console.log('Available methods:', Object.keys(configService));
      return;
    }
    
    // Test config
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
    
    // Test 2: Try saving config
    console.log('\nTest 2: Saving configuration');
    try {
      const result = await configService.saveConfig(testConfig);
      console.log('✅ saveConfig executed successfully:', result);
    } catch (error) {
      console.log('❌ saveConfig failed:', error.message);
    }
    
    // Test 3: Try loading config
    console.log('\nTest 3: Loading configuration');
    try {
      const config = await configService.loadConfig();
      console.log('✅ loadConfig executed successfully');
      console.log('Loaded config:', config);
    } catch (error) {
      console.log('❌ loadConfig failed:', error.message);
    }
    
  } catch (importError) {
    console.error('Failed to import configuration service:', importError);
  }
}

// Run tests
runTest().catch(error => {
  console.error('Unhandled error:', error);
}); 