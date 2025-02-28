/**
 * Test route to identify path-to-regexp issues
 */

const express = require('express');
const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

module.exports = router; 