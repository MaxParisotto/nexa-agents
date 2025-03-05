import express from 'express';
import os from 'os';

export const getSystemMetrics = (req: express.Request, res: express.Response) => {
  try {
    const metrics = {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      uptime: process.uptime(),
      osUptime: os.uptime(),
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version
    };

    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system metrics' });
  }
};
