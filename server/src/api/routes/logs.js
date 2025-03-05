const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger').createLogger('logs');

const LOG_DIR = path.join(__dirname, '../../../data/logs');

// Ensure logs directory exists
async function ensureLogDir() {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (error) {
        logger.error('Error creating logs directory:', error);
    }
}

// Create test logs if none exist
async function createTestLogs(type) {
    const logFile = path.join(LOG_DIR, `${type}.log`);
    try {
        const stats = await fs.stat(logFile);
        if (stats.size === 0) {
            throw new Error('Empty file');
        }
    } catch (error) {
        // Generate more realistic sample logs
        const services = ['api-server', 'llm-service', 'agent-manager', 'workflow-engine', 'database'];
        const levels = ['info', 'warn', 'error', 'debug'];
        const sampleLogs = [];

        // Generate 20 sample logs with varying timestamps
        for (let i = 0; i < 20; i++) {
            const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Last 24 hours
            const service = services[Math.floor(Math.random() * services.length)];
            const level = levels[Math.floor(Math.random() * levels.length)];

            let message, metadata;
            switch (type) {
                case 'error':
                    message = `Error ${level === 'error' ? 'executing' : 'processing'} ${service} operation`;
                    metadata = {
                        errorCode: Math.floor(Math.random() * 500),
                        stack: level === 'error' ? 'Error: Something went wrong\n    at Function.execute' : null,
                        service
                    };
                    break;
                case 'api':
                    message = `API ${level === 'error' ? 'failed' : 'processed'} request to ${service}`;
                    metadata = {
                        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
                        path: `/api/${service}/endpoint`,
                        duration: Math.random() * 1000,
                        status: level === 'error' ? 500 : 200
                    };
                    break;
                case 'performance':
                    message = `Performance metrics for ${service}`;
                    metadata = {
                        cpu: Math.random() * 100,
                        memory: Math.random() * 1024,
                        latency: Math.random() * 500,
                        requests: Math.floor(Math.random() * 1000)
                    };
                    break;
                case 'security':
                    message = `Security ${level === 'error' ? 'alert' : 'event'} in ${service}`;
                    metadata = {
                        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
                        user: `user${Math.floor(Math.random() * 100)}`,
                        action: ['login', 'logout', 'access', 'modify'][Math.floor(Math.random() * 4)],
                        success: level !== 'error'
                    };
                    break;
            }

            sampleLogs.push({
                timestamp: timestamp.toISOString(),
                level,
                service,
                message,
                metadata
            });
        }

        // Sort by timestamp
        sampleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        await fs.writeFile(
            logFile,
            sampleLogs.map(log => JSON.stringify(log)).join('\n') + '\n'
        );
    }
}

// Initialize logs
router.get('/init', async (req, res) => {
    try {
        await ensureLogDir();
        
        // Create test logs for each type
        const logTypes = ['error', 'api', 'performance', 'security'];
        await Promise.all(logTypes.map(type => createTestLogs(type)));
        
        res.json({ message: 'Logs initialized successfully' });
    } catch (error) {
        logger.error('Error initializing logs:', error);
        res.status(500).json({ error: 'Failed to initialize logs' });
    }
});

router.get('/:type', async (req, res) => {
    try {
        await ensureLogDir(); // Ensure directory exists before reading

        const { type } = req.params;
        const { page = 1, pageSize = 50, level = 'all', service = 'all', search = '' } = req.query;

        const logFile = path.join(LOG_DIR, `${type}.log`);
        
        // Create test logs if file doesn't exist
        await createTestLogs(type);
        
        const logs = await readAndParseLogs(logFile);

        // Apply filters
        let filteredLogs = logs;
        if (level !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level.toLowerCase() === level.toLowerCase());
        }
        if (service !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.service === service);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchLower) ||
                JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
            );
        }

        // Calculate pagination
        const start = (page - 1) * pageSize;
        const paginatedLogs = filteredLogs.slice(start, start + pageSize);

        // Calculate stats
        const stats = {
            total: filteredLogs.length,
            errorRate: calculateErrorRate(filteredLogs),
            avgResponseTime: calculateAvgResponseTime(filteredLogs)
        };

        res.json({
            logs: paginatedLogs,
            total: filteredLogs.length,
            stats
        });
    } catch (error) {
        logger.error('Error retrieving logs:', error);
        res.status(500).json({ error: 'Failed to retrieve logs' });
    }
});

async function readAndParseLogs(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content.split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
        logger.error(`Error reading log file ${filePath}:`, error);
        return [];
    }
}

function calculateErrorRate(logs) {
    if (!logs.length) return 0;
    const errorCount = logs.filter(log => log.level.toLowerCase() === 'error').length;
    return ((errorCount / logs.length) * 100).toFixed(2);
}

function calculateAvgResponseTime(logs) {
    const responseTimes = logs
        .filter(log => log.metadata && log.metadata.duration)
        .map(log => log.metadata.duration);
    
    if (!responseTimes.length) return 0;
    return (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2);
}

module.exports = router;
