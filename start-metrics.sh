#!/bin/bash

echo "Starting Metrics Service..."
cd "$(dirname "$0")/metrics-service" || exit 1

# Try to build and run the full version first
echo "Attempting to build full metrics service..."
cargo build --bin nexa-metrics

# Check if build succeeded
if [ -f "target/debug/nexa-metrics" ]; then
    echo "Starting full metrics service..."
    ./target/debug/nexa-metrics &
    PID=$!
    echo "Metrics service started with PID $PID"
    exit 0
fi

# If full version fails, try simple version
echo "Full version build failed. Trying simple version..."

# Copy simple version to main.rs temporarily
if [ -f "src/main_simple.rs" ]; then
    cp src/main.rs src/main.rs.backup
    cp src/main_simple.rs src/main.rs
    
    # Try to build and run the simple version
    cargo build
    
    # Restore original main.rs
    mv src/main.rs.backup src/main.rs
    
    if [ -f "target/debug/nexa-metrics" ]; then
        echo "Starting simple metrics service..."
        ./target/debug/nexa-metrics &
        PID=$!
        echo "Simple metrics service started with PID $PID"
        exit 0
    fi
fi

echo "Failed to build metrics service."
exit 1
