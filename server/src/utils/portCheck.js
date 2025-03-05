const net = require('net');

const isPortAvailable = (port, host) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, host);
  });
};

module.exports = { isPortAvailable };
