import express from 'express';
import modelsRouter from './models.js';
import metricsRouter from './metrics.js';
import settingsRouter from './settings.js';
import statusRouter from './status.js';
import uplinkRouter from './uplink.js';
import workflowsRouter from './workflows.js';

const router = express.Router();

// Mount all routes
router.use('/models', modelsRouter);
router.use('/metrics', metricsRouter);
router.use('/settings', settingsRouter);
router.use('/status', statusRouter);
router.use('/uplink', uplinkRouter);
router.use('/workflows', workflowsRouter);

export default router;