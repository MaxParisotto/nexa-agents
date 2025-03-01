import express from 'express';
const router = express.Router();

/**
 * Test route to identify path-to-regexp issues
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

export default router;
