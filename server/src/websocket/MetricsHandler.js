const MetricsCollector = require('../services/MetricsCollector');

class MetricsHandler {
    constructor(io) {
        this.io = io;
        this.updateInterval = 2000; // Update every 2 seconds
        this.initialize();
    }

    initialize() {
        // Set up periodic metrics broadcast
        setInterval(() => {
            const metrics = MetricsCollector.collectMetrics();
            this.io.emit('metrics_update', metrics);
        }, this.updateInterval);

        // Handle client connections
        this.io.on('connection', (socket) => {
            console.log('Client connected to metrics stream');
            
            // Send initial metrics
            const metrics = MetricsCollector.collectMetrics();
            socket.emit('metrics_update', metrics);

            socket.on('get_metrics', () => {
                const metrics = MetricsCollector.collectMetrics();
                socket.emit('metrics_update', metrics);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected from metrics stream');
            });
        });
    }
}

module.exports = MetricsHandler;
