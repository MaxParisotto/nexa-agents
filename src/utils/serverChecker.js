/**
 * Server Checker Utility
 * Checks if the backend server is running and attempts to start it if needed
 */

/**
 * Checks if the server is running by making a request to the test endpoint
 * @returns {Promise<boolean>} True if server is running, false otherwise
 */
export const isServerRunning = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/test/test', {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Attempts to start the server using the child_process API in Electron
 * Note: This only works in Electron environments with proper permissions
 * @returns {Promise<boolean>} True if server was started, false otherwise
 */
export const startServer = async () => {
  try {
    // Check if we're in an Electron environment
    if (window.require) {
      const { exec } = window.require('child_process');
      const path = window.require('path');
      
      // Get the project root path
      const isDevMode = process.env.NODE_ENV === 'development';
      const projectRoot = isDevMode 
        ? process.cwd()
        : path.join(process.resourcesPath, 'app');
      
      // Start the server in the background
      const serverPath = path.join(projectRoot, 'src', 'server', 'index.js');
      const logPath = path.join(projectRoot, 'logs', 'server.log');
      
      // Use nohup to keep the server running even if the parent process exits
      const command = `nohup node ${serverPath} > ${logPath} 2>&1 &`;
      
      return new Promise((resolve) => {
        exec(command, (error) => {
          if (error) {
            resolve(false);
          } else {
            // Wait a bit for the server to initialize
            setTimeout(async () => {
              // Verify the server is running
              const running = await isServerRunning();
              resolve(running);
            }, 2000);
          }
        });
      });
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Checks if the server is running and attempts to start it if not
 * @returns {Promise<boolean>} True if server is running or was started successfully
 */
export const ensureServerRunning = async () => {
  // First check if the server is already running
  const serverRunning = await isServerRunning();
  
  if (serverRunning) {
    return true;
  }
  
  // Server is not running, try to start it
  const started = await startServer();
  return started;
};

export default {
  isServerRunning,
  startServer,
  ensureServerRunning
}; 