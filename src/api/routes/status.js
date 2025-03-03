import express from 'express';
import os from 'os';

const router = express.Router();

/**
 * Get server status information
 * GET /api/status
 */
router.get('/', (req, res) => {
  // Collect basic system information
  const statusInfo = {
    online: true,
    uptime: process.uptime(),
    serverTime: new Date().toISOString(),
    hostname: os.hostname(),
    services: {
      api: {
        status: 'running',
        port: process.env.PORT || 3001
      },
      websocket: {
        status: 'running',
        port: process.env.WSS_PORT || 8081
      },
      openaiUplink: {
        status: 'running',
        port: process.env.OPENAI_UPLINK_PORT || 3002
      }
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: {
        free: os.freemem(),
        total: os.totalmem()
      },
      cpus: os.cpus().length
    }
  };
  
  res.json(statusInfo);
});

export default router;
