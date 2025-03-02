#!/bin/bash

echo "Cleaning up existing processes..."
pkill -f "node src/server/index.js" || true
pkill -f "nexa-metrics" || true

echo "Starting Nexa Agents development servers..."

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "Cargo not found. Metrics service will not be available."
    echo "Starting in fallback mode without metrics service."
    SKIP_RUST=true
else
    SKIP_RUST=false
fi

if [ "$SKIP_RUST" = "false" ]; then
    # Build and start the Rust API proxy service
    echo "Building metrics & API proxy service..."
    cd metrics-service
    
    # Check if build directory exists
    if [ ! -d "target" ]; then
        mkdir -p target/debug
    fi
    
    cargo build

    # Check if the build was successful
    if [ -f "target/debug/nexa-metrics" ]; then
        echo "Starting metrics service..."
        ./target/debug/nexa-metrics &
        PROXY_PID=$!
        echo "API Proxy started with PID $PROXY_PID"
        echo "Proxy server available at http://localhost:3005"
    else
        echo "Failed to build metrics service. Starting in fallback mode."
        SKIP_RUST=true
    fi
    cd ..
    sleep 1 # Give proxy time to start
fi

# Start the frontend development server with the backend
# Instead of starting the backend separately, we use the dev script directly
echo "Starting frontend and backend development servers..."
npm run dev

# Define cleanup function
cleanup() {
    echo "Shutting down services..."
    if [ "$SKIP_RUST" = "false" ] && [ -n "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null || true
    fi
    exit 0
}

# Register cleanup function for termination signals
trap cleanup SIGINT SIGTERM EXIT

# Wait for child processes
wait
