#!/bin/bash

echo "Checking API health..."

# Check basic API connection
echo "1. Checking /api/status..."
curl -s http://localhost:3001/api/status | jq || { echo "Failed to connect to API status endpoint"; }

# Check metrics endpoint
echo "2. Checking /api/metrics..."
curl -s http://localhost:3001/api/metrics | jq || { echo "Failed to connect to metrics endpoint"; }

# Check system metrics
echo "3. Checking /api/metrics/system..."
curl -s http://localhost:3001/api/metrics/system | jq || { echo "Failed to connect to system metrics endpoint"; }

# Check token metrics
echo "4. Checking /api/metrics/tokens..."
curl -s http://localhost:3001/api/metrics/tokens | jq || { echo "Failed to connect to token metrics endpoint"; }

echo "5. Checking workflows debug endpoint..."
curl -s http://localhost:3001/api/workflows/debug | jq || { echo "Failed to connect to workflows debug endpoint"; }

echo "API health check complete!"
