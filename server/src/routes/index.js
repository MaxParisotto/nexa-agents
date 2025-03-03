const express = require("express");
const modelsRouter = require("./models.js");
const metricsRouter = require("./metrics.js");
const settingsRouter = require("./settings.js");
const statusRouter = require("./status.js");
const uplinkRouter = require("./uplink.js");
const workflowsRouter = require("./workflows.js");

const router = express.Router();

// Mount all routes
router.use('/models', modelsRouter);
router.use('/metrics', metricsRouter);
router.use('/settings', settingsRouter);
router.use('/status', statusRouter);
router.use('/uplink', uplinkRouter);
router.use('/workflows', workflowsRouter);

module.exports = router;