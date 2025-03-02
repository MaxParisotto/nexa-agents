/**
 * Central routes configuration to properly order route handlers
 */
import express from 'express';
import settingsRoutes from './settings.js';
import modelsRoutes from './models.js';
import testRoutes from './test.js';
import statusRoutes from './status.js';
import metricsRoutes from './metrics.js';
import { createUplinkRouter } from './uplink.js';

export function configureRoutes(app, io) {
  // API Routes with proper ordering
  app.use('/api/metrics', metricsRoutes); // First, because it's causing issues
  app.use('/api/settings', settingsRoutes);
  app.use('/api/models', modelsRoutes);
  app.use('/api/test', testRoutes);
  app.use('/api/status', statusRoutes);
  
  // Initialize uplink router with io instance
  const uplinkRouter = createUplinkRouter(io);
  app.use('/api/uplink', uplinkRouter);
  
  // Add catch-all route for 404 API endpoints
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `API endpoint not found: ${req.originalUrl}`
    });
  });
}
