const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../../utils/logger').createLogger('network-metrics');

const execAsync = promisify(exec);

class NetworkMetrics {
  constructor() {
    this.metrics = {
      bytesReceived: 0,
      bytesSent: 0,
      connectionsActive: 0,
      latency: new Map(),
      errors: 0,
      requestsPerSecond: 0,
      interfaces: new Map()
    };

    this.lastStats = null;
    this.lastStatsTime = null;
  }

  async getNetworkStats() {
    try {
      const interfaces = os.networkInterfaces();
      const stats = {
        timestamp: Date.now(),
        interfaces: new Map()
      };

      // Get real network interface statistics on Linux
      if (process.platform === 'linux') {
        const { stdout } = await execAsync('cat /proc/net/dev');
        const lines = stdout.split('\n').slice(2); // Skip headers

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 17) { // Valid interface line
            const iface = parts[0].replace(':', '');
            if (iface !== 'lo') { // Skip loopback
              stats.interfaces.set(iface, {
                bytesReceived: parseInt(parts[1], 10),
                bytesSent: parseInt(parts[9], 10),
                packetsReceived: parseInt(parts[2], 10),
                packetsSent: parseInt(parts[10], 10),
                errors: parseInt(parts[3], 10) + parseInt(parts[11], 10),
                drops: parseInt(parts[4], 10) + parseInt(parts[12], 10)
              });
            }
          }
        });
      }

      // Add socket.io specific stats if available
      if (global.io) {
        const engineStats = global.io.engine;
        stats.socketio = {
          connectionsCount: engineStats.clientsCount,
          pollingCount: engineStats.pollCount,
          websocketCount: engineStats.wsCount,
          bytesReceived: engineStats.bytesReceived,
          bytesSent: engineStats.bytesSent
        };
      }

      return stats;
    } catch (error) {
      logger.error('Error getting network stats:', error);
      return null;
    }
  }

  calculateThroughput(currentStats) {
    if (!this.lastStats || !currentStats) return null;

    const timeDiff = (currentStats.timestamp - this.lastStats.timestamp) / 1000;
    const throughput = {
      timestamp: currentStats.timestamp,
      interfaces: new Map()
    };

    // Calculate per-interface throughput
    currentStats.interfaces.forEach((current, iface) => {
      const last = this.lastStats.interfaces.get(iface);
      if (last) {
        throughput.interfaces.set(iface, {
          bytesReceivedPerSec: (current.bytesReceived - last.bytesReceived) / timeDiff,
          bytesSentPerSec: (current.bytesSent - last.bytesSent) / timeDiff,
          packetsReceivedPerSec: (current.packetsReceived - last.packetsReceived) / timeDiff,
          packetsSentPerSec: (current.packetsSent - last.packetsSent) / timeDiff
        });
      }
    });

    // Calculate Socket.IO throughput
    if (currentStats.socketio && this.lastStats.socketio) {
      throughput.socketio = {
        bytesReceivedPerSec: (currentStats.socketio.bytesReceived - this.lastStats.socketio.bytesReceived) / timeDiff,
        bytesSentPerSec: (currentStats.socketio.bytesSent - this.lastStats.socketio.bytesSent) / timeDiff
      };
    }

    return throughput;
  }

  async collect() {
    const currentStats = await this.getNetworkStats();
    const throughput = this.lastStats ? this.calculateThroughput(currentStats) : null;
    this.lastStats = currentStats;

    if (!currentStats) return null;

    // Calculate average latency from stored values
    const latencyValues = Array.from(this.metrics.latency.values());
    const averageLatency = latencyValues.length > 0
      ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length
      : 0;

    // Prepare metrics report
    const report = {
      timestamp: new Date().toISOString(),
      interfaces: {},
      socketio: currentStats.socketio || {},
      summary: {
        connectionsActive: currentStats.socketio?.connectionsCount || 0,
        averageLatency,
        errors: this.metrics.errors,
        requestsPerSecond: this.metrics.requestsPerSecond
      }
    };

    // Add per-interface metrics
    currentStats.interfaces.forEach((stats, iface) => {
      report.interfaces[iface] = {
        ...stats,
        throughput: throughput?.interfaces.get(iface) || {}
      };
    });

    // Add Socket.IO throughput if available
    if (throughput?.socketio) {
      report.socketio.throughput = throughput.socketio;
    }

    return report;
  }

  trackRequest(path, method, startTime, bytes) {
    const endTime = Date.now();
    const latency = endTime - startTime;

    // Update latency metrics
    this.updateLatencyMetrics(path, latency);

    // Update request rate
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    this.metrics.requests = (this.metrics.requests || [])
      .filter(req => req.timestamp > oneSecondAgo)
      .concat([{ timestamp: now, path, method }]);
    
    this.metrics.requestsPerSecond = this.metrics.requests.length;
    this.metrics.bytesReceived += bytes || 0;
  }

  trackResponse(bytes) {
    this.metrics.bytesSent += bytes || 0;
  }

  trackError(error) {
    this.metrics.errors++;
    logger.error('Network error:', error);
  }

  updateLatencyMetrics(path, latency) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old latency records
    for (const [timestamp] of this.metrics.latency) {
      if (timestamp < oneMinuteAgo) {
        this.metrics.latency.delete(timestamp);
      }
    }

    // Add new latency record
    this.metrics.latency.set(now, { path, latency });
  }

  reset() {
    this.metrics = {
      bytesReceived: 0,
      bytesSent: 0,
      connectionsActive: 0,
      latency: new Map(),
      errors: 0,
      requestsPerSecond: 0,
      interfaces: new Map()
    };
    this.lastStats = null;
  }
}

module.exports = NetworkMetrics;
