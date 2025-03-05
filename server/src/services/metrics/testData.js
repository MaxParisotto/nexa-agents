function generateTestMetrics() {
    return {
        llm: {
            tokensPerSecond: Math.floor(Math.random() * 100),
            requestCount: Math.floor(Math.random() * 1000),
            models: {
                'gpt-4': {
                    totalTokens: Math.floor(Math.random() * 10000),
                    totalCost: Math.random() * 10,
                    errors: Math.random() > 0.9 ? 1 : 0
                },
                'gpt-3.5-turbo': {
                    totalTokens: Math.floor(Math.random() * 50000),
                    totalCost: Math.random() * 5,
                    errors: Math.random() > 0.95 ? 1 : 0
                }
            }
        },
        network: {
            summary: {
                requestsPerSecond: Math.floor(Math.random() * 50),
                connectionsActive: Math.floor(Math.random() * 10),
                errorRate: Math.random() * 2,
                averageLatency: Math.random() * 100
            },
            detailed: {
                connections: {
                    http: Math.floor(Math.random() * 8),
                    websocket: Math.floor(Math.random() * 3)
                },
                traffic: {
                    bytesIn: Math.floor(Math.random() * 1024 * 1024),
                    bytesOut: Math.floor(Math.random() * 1024 * 1024),
                    rateIn: Math.floor(Math.random() * 1024),
                    rateOut: Math.floor(Math.random() * 1024)
                },
                latency: {
                    min: Math.random() * 50,
                    max: 50 + Math.random() * 150,
                    average: Math.random() * 100
                },
                requests: {
                    byMethod: {
                        GET: Math.floor(Math.random() * 100),
                        POST: Math.floor(Math.random() * 50),
                        PUT: Math.floor(Math.random() * 20),
                        DELETE: Math.floor(Math.random() * 10)
                    }
                },
                errors: {
                    byType: {
                        400: Math.floor(Math.random() * 5),
                        500: Math.floor(Math.random() * 2)
                    }
                }
            }
        },
        system: {
            cpu: Math.random() * 100,
            memory: {
                used: Math.floor(Math.random() * 8 * 1024 * 1024 * 1024),
                total: 16 * 1024 * 1024 * 1024
            },
            uptime: Math.floor(Math.random() * 86400)
        }
    };
}

module.exports = { generateTestMetrics };
