import express from 'express';
import { saveConfig, restartServer, initializeUplinkController } from '../controllers/uplinkController.js';

const router = express.Router();

// Save uplink configuration
router.post('/config', saveConfig);

// Restart WebSocket server
router.post('/restart', restartServer);

export const createUplinkRouter = (io) => {
  initializeUplinkController(io);
  return router;
};
