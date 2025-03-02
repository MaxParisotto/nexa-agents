#!/bin/bash

echo "Restarting Nexa Agents server..."
echo "Stopping running processes..."

# Kill the server process and any running server processes
pkill -f "node src/server/index.js" || true
sleep 2

# Verify all processes are stopped
if pgrep -f "node src/server/index.js" > /dev/null; then
    echo "Forcefully stopping remaining server processes..."
    pkill -9 -f "node src/server/index.js" || true
    sleep 1
fi

# Start the server
echo "Starting server..."
npm run server &

# Wait for server to initialize
echo "Waiting for server to initialize..."
sleep 3

# Check if server is running
if pgrep -f "node src/server/index.js" > /dev/null; then
    echo "Server is running."
    echo "API should be available at http://localhost:3001/api"
else
    echo "Server failed to start."
fi
