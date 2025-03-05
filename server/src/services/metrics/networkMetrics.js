const logger = require('../../utils/logger').createLogger('networkMetrics');

class NetworkMetrics {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                perSecond: 0,
                byMethod: {},
                byPath: {}
            },
            traffic: {
                bytesIn: 0,
                bytesOut: 0,
                rateIn: 0,
                rateOut: 0
            },
            connections: {
                active: 0,
                total: 0,
                websocket: 0,
                http: 0
            },
            latency: {
                values: [],
                average: 0,
                min: Infinity,
                max: 0
            },
            errors: {
                count: 0,
                byType: {}
            }
        };

        // Start periodic calculations
        setInterval(() => this.calculateRates(), 1000);
    }

    trackRequest(path, method, startTime, bytesIn = 0) {
        this.metrics.requests.total++;
        this.metrics.traffic.bytesIn += bytesIn;
        
        // Track by method
        this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
        
        // Track by path (group similar paths)
        const pathGroup = this.groupPath(path);
        this.metrics.requests.byPath[pathGroup] = (this.metrics.requests.byPath[pathGroup] || 0) + 1;
    }

    trackResponse(bytesOut, statusCode = 200, duration = 0) {
        this.metrics.traffic.bytesOut += bytesOut;

        // Track latency
        if (duration > 0) {
            this.metrics.latency.values.push(duration);
            this.metrics.latency.min = Math.min(this.metrics.latency.min, duration);
            this.metrics.latency.max = Math.max(this.metrics.latency.max, duration);
            
            // Keep only last 1000 latency values
            if (this.metrics.latency.values.length > 1000) {
                this.metrics.latency.values.shift();
            }
        }

        // Track errors
        if (statusCode >= 400) {
            this.metrics.errors.count++;
            const errorType = Math.floor(statusCode / 100) * 100;
            this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
        }
    }

    trackConnection(type = 'http', isConnect = true) {
        if (isConnect) {
            this.metrics.connections.active++;
            this.metrics.connections.total++;
            this.metrics.connections[type]++;
        } else {
            this.metrics.connections.active--;
            this.metrics.connections[type]--;
        }
    }

    getMetrics() {
        return {
            summary: {
                requestsPerSecond: this.metrics.requests.perSecond,
                connectionsActive: this.metrics.connections.active,
                errorRate: this.calculateErrorRate(),
                averageLatency: this.calculateAverageLatency()
            },
            detailed: {
                requests: this.metrics.requests,
                traffic: this.metrics.traffic,
                connections: this.metrics.connections,
                latency: {
                    average: this.metrics.latency.average,
                    min: this.metrics.latency.min,
                    max: this.metrics.latency.max
                },
                errors: this.metrics.errors
            }
        };
    }

    // Private methods
    calculateRates() {
        const now = Date.now();
        if (!this.lastCalculation) {
            this.lastCalculation = now;
            this.lastRequests = this.metrics.requests.total;
            this.lastBytesIn = this.metrics.traffic.bytesIn;
            this.lastBytesOut = this.metrics.traffic.bytesOut;
            return;
        }

        const timeDiff = (now - this.lastCalculation) / 1000;
        const requestDiff = this.metrics.requests.total - this.lastRequests;
        const bytesInDiff = this.metrics.traffic.bytesIn - this.lastBytesIn;
        const bytesOutDiff = this.metrics.traffic.bytesOut - this.lastBytesOut;

        this.metrics.requests.perSecond = Math.round(requestDiff / timeDiff);
        this.metrics.traffic.rateIn = Math.round(bytesInDiff / timeDiff);
        this.metrics.traffic.rateOut = Math.round(bytesOutDiff / timeDiff);

        this.lastCalculation = now;
        this.lastRequests = this.metrics.requests.total;
        this.lastBytesIn = this.metrics.traffic.bytesIn;
        this.lastBytesOut = this.metrics.traffic.bytesOut;
    }

    calculateErrorRate() {
        if (this.metrics.requests.total === 0) return 0;
        return (this.metrics.errors.count / this.metrics.requests.total * 100).toFixed(2);
    }

    calculateAverageLatency() {
        if (this.metrics.latency.values.length === 0) return 0;
        const sum = this.metrics.latency.values.reduce((a, b) => a + b, 0);
        this.metrics.latency.average = sum / this.metrics.latency.values.length;
        return this.metrics.latency.average.toFixed(2);
    }

    groupPath(path) {
        // Group similar paths (e.g., /users/123 and /users/456 become /users/:id)
        return path.replace(/\/\d+/g, '/:id')
                  .replace(/\/[0-9a-f]{24}/g, '/:id')  // MongoDB IDs
                  .replace(/\/[0-9a-f-]{36}/g, '/:id'); // UUIDs
    }

    reset() {
        this.metrics = new NetworkMetrics().metrics;
    }
}

module.exports = new NetworkMetrics();
