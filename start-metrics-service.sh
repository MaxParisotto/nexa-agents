#!/bin/bash

echo "Starting Nexa Metrics Service..."

# Check if the metrics service directory exists
METRICS_DIR="./metrics-service"
if [ ! -d "$METRICS_DIR" ]; then
  echo "Error: Metrics service directory not found at $METRICS_DIR"
  exit 1
fi

cd "$METRICS_DIR" || exit 1

# Check if cargo exists
if ! command -v cargo &> /dev/null; then
  echo "Error: Rust/Cargo not found. Please install Rust: https://www.rust-lang.org/tools/install"
  exit 1
fi

# Build and run the metrics service
echo "Building metrics service..."
cargo build --release

echo "Starting metrics service..."
cargo run --release &

# Store the PID
echo $! > .metrics.pid

echo "Metrics service started on http://localhost:3005"
echo "PID: $(cat .metrics.pid)"
