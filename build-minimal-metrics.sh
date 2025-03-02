#!/bin/bash

echo "Building Minimal Metrics Service..."
cd "$(dirname "$0")/metrics-service"

# Back up original main.rs if it exists
if [ -f "src/main.rs" ]; then
    cp src/main.rs src/main.rs.original
fi

# Copy the minimal version
if [ -f "src/main_minimal.rs" ]; then
    cp src/main_minimal.rs src/main.rs
    
    echo "Building minimal metrics service..."
    cargo build
    
    # Check if build was successful
    if [ $? -eq 0 ]; then
        echo "Build successful! Starting service..."
        ./target/debug/nexa-metrics &
        echo $! > .metrics.pid
        echo "Service running with PID $(cat .metrics.pid)"
    else
        echo "Build failed."
    fi
    
    # Restore original main.rs
    if [ -f "src/main.rs.original" ]; then
        mv src/main.rs.original src/main.rs
    fi
else
    echo "Error: minimal metrics source not found at src/main_minimal.rs"
    exit 1
fi
