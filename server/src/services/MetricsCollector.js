const os = require('os');

class MetricsCollector {
    constructor() {
        this.metrics = {
            summary: {},
            llm: {
                models: {},
                tokensPerSecond: 0,
                requestCount: 0
            },
            network: {
                summary: {
                    requestsPerSecond: 0,
                    connectionsActive: 0,
                    averageLatency: 0
                },
                detailed: {
                    connections: { http: 0, websocket: 0 },
                    latency: { min: 0, max: 0 },
                    traffic: { rateIn: 0, rateOut: 0, bytesIn: 0, bytesOut: 0 },
                    errors: { byType: {} }
                }
            },
            system: {
                cpu: 0,
                memory: {
                    total: os.totalmem(),
                    used: 0,
                    free: 0
                },
                uptime: 0
            }
        };
    }

    collectMetrics() {
        // Update system metrics
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
        const usedMem = os.totalmem() - os.freemem();

        this.metrics.system = {
            cpu: cpuUsage,
            memory: {
                total: os.totalmem(),
                used: usedMem,
                free: os.freemem()
            },
            uptime: process.uptime()
        };

        // Simulate LLM metrics (replace with real data in production)
        this.metrics.llm = {
            models: {
                'gpt-4': { totalTokens: 150000, totalCost: 2.50, errors: 0 },
                'gpt-3.5-turbo': { totalTokens: 500000, totalCost: 1.25, errors: 2 }
            },
            tokensPerSecond: Math.floor(Math.random() * 100) + 50,
            requestCount: Math.floor(Math.random() * 1000)
        };

        // Simulate network metrics (replace with real data in production)
        this.metrics.network = {
            summary: {
                requestsPerSecond: Math.floor(Math.random() * 50) + 10,
                connectionsActive: Math.floor(Math.random() * 100),
                averageLatency: Math.random() * 100
            },
            detailed: {
                connections: { 
                    http: Math.floor(Math.random() * 80),
                    websocket: Math.floor(Math.random() * 20)
                },
                latency: {
                    min: Math.random() * 50,
                    max: Math.random() * 200 + 50
                },
                traffic: {
                    rateIn: Math.random() * 1024 * 1024,
                    rateOut: Math.random() * 1024 * 1024,
                    bytesIn: Math.random() * 1024 * 1024 * 1024,
                    bytesOut: Math.random() * 1024 * 1024 * 1024
                },
                errors: {
                    byType: {
                        '404': Math.floor(Math.random() * 10),
                        '500': Math.floor(Math.random() * 5)
                    }
                }
            }
        };

        return this.metrics;
    }
}

module.exports = new MetricsCollector();
