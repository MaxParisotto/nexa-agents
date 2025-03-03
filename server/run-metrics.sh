#!/bin/bash

# Run the metrics service without needing to wait for Rust to compile
echo "🚀 Starting metrics service..."

# Check if we already have a compiled binary
if [ -f "src/gateway/target/release/nexa-metrics" ]; then
  echo "✅ Found existing binary, running..."
  ./src/gateway/target/release/nexa-metrics
  exit $?
fi

if [ -f "src/gateway/target/debug/nexa-metrics" ]; then
  echo "✅ Found debug binary, running..."
  ./src/gateway/target/debug/nexa-metrics
  exit $?
fi

# If no binary exists, create a fake metrics service using Node.js
echo "❌ No metrics binary found. Creating temporary Node.js metrics service..."

# Create temporary Node.js metrics service
mkdir -p tmp

cat > tmp/metrics-service.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/api/metrics/system') {
    // Generate fake metrics
    const metrics = {
      cpu_usage: Math.random() * 100,
      memory_used: Math.floor(Math.random() * 8 * 1024 * 1024 * 1024),
      memory_total: 16 * 1024 * 1024 * 1024,
      uptime: Math.floor(Math.random() * 100000),
      processes: Math.floor(Math.random() * 200),
      timestamp: Date.now() / 1000
    };
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(metrics));
  } else if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    res.writeHead(204, { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.METRICS_PORT || 3005;
server.listen(PORT, () => {
  console.log(`🔄 Temporary metrics service running on http://localhost:${PORT}`);
  console.log('For a real metrics service, please install Rust and build the gateway.');
});
EOF

# Run the temporary metrics service
node tmp/metrics-service.js
