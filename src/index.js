// Load environment variables
require('dotenv').config();

/**
 * Nexa Agents Backend Server - Main entry point
 * This file now uses the more complete API implementation from src/api/index.js
 */
const { app, server, io } = require('./api/index');

// Export the app, server, and io for testing
module.exports = { app, server, io };
