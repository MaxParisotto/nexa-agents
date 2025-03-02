#!/bin/bash

echo "Cleaning up existing processes..."
# Kill any existing processes
pkill -f "node src/server/index.js" || true
pkill -f "vite" || true
sleep 1

# Check if the systeminformation package exists
if ! npm list systeminformation | grep -q systeminformation; then
    echo "The systeminformation package is not installed."
    echo "Running installation script..."
    bash ./install-deps.sh
fi

echo "Starting Nexa Agents development servers..."
# Start the development server
npm run dev
