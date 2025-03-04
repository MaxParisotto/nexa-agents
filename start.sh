#!/bin/bash

# Enhanced development environment setup script

# Configuration
FRONTEND_PROCESS="node src/server/index.js"
METRICS_PROCESS="nexa-metrics"
LOG_FILE="dev.log"

# Initialize logging
echo "Starting Nexa Agents development environment - $(date)" > $LOG_FILE

# Cleanup existing processes
echo "Cleaning up existing processes..." | tee -a $LOG_FILE
pkill -f "$FRONTEND_PROCESS" >> $LOG_FILE 2>&1 || true
pkill -f "$METRICS_PROCESS" >> $LOG_FILE 2>&1 || true

# Start development servers
echo "Starting frontend and backend development servers..." | tee -a $LOG_FILE
npm run dev &
DEV_PID=$!

# Cleanup function
cleanup() {
    echo "Shutting down services..." | tee -a $LOG_FILE
    kill $DEV_PID 2>/dev/null || true
    echo "Development environment stopped - $(date)" >> $LOG_FILE
    exit 0
}

# Register cleanup for termination signals
trap cleanup SIGINT SIGTERM EXIT

# Wait for child processes
wait
