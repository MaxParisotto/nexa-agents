import express from 'express';
import { getSystemMetrics } from '../controllers/metricsController';

const router = express.Router();

router.get('/metrics', getSystemMetrics);

export default router;