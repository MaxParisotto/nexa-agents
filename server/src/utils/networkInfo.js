/**
 * Network information utility
 */
const os = require('os');
const logger = require('./logger').createLogger('network');

/**
 * Get all available network interfaces and IP addresses
 */
function getNetworkInterfaces() {
  try {
    const interfaces = os.networkInterfaces();
    const results = {};
    
    // Process each network interface
    for (const [name, netInterface] of Object.entries(interfaces)) {
      // Filter for IPv4 addresses only
      const ipv4Interfaces = netInterface.filter(iface => iface.family === 'IPv4');
      
      if (ipv4Interfaces.length > 0) {
        results[name] = ipv4Interfaces;
      }
    }
    
    return results;
  } catch (error) {
    logger.error('Error getting network interfaces:', error);
    return {};
  }
}

/**
 * Returns the IP addresses where the dashboard can be accessed
 * @param {number} port - The port number to use in URLs
 */
function getDashboardAddresses(port = 3001) {
  try {
    // Use the provided port parameter instead of trying to load from config
    const interfaces = getNetworkInterfaces();
    const addresses = [];
    
    // Create URLs for each network interface
    for (const [name, netInterfaces] of Object.entries(interfaces)) {
      for (const iface of netInterfaces) {
        if (!iface.internal) {
          addresses.push({
            name: name,
            url: `http://${iface.address}:${port}`,
            internal: false
          });
        }
      }
    }
    
    // Also add localhost for local access
    addresses.push({
      name: 'localhost',
      url: `http://localhost:${port}`,
      internal: true
    });
    
    return addresses;
  } catch (error) {
    logger.error('Error getting dashboard addresses:', error);
    return [{
      name: 'localhost',
      url: `http://localhost:${port || 3001}`,
      internal: true
    }];
  }
}

module.exports = {
  getNetworkInterfaces,
  getDashboardAddresses
};
