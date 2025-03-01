import express from 'express';
import { saveConfig, restartServer } from '../controllers/uplinkController.js';

const router = express.Router();

// Save uplink configuration
router.post('/config', saveConfig);

// Restart WebSocket server
router.post('/restart', restartServer);

export default router;
