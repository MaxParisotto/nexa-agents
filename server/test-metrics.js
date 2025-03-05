const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Import our metrics handlers
const MetricsHandler = require('./src/websocket/MetricsHandler');

// Serve static files
app.use(express.static(path.join(__dirname, 'src/public')));

// Initialize metrics handler
new MetricsHandler(io);

// Start server
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Metrics dashboard running at http://localhost:${PORT}`);
});
