import express from 'express';
const router = express.Router();

/**
 * Simple ping endpoint for checking if server is running
 * GET /api/test/ping
 */
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

/**
 * Test route to identify path-to-regexp issues
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

export default router;
