#!/bin/bash

# Kill any existing processes on ports 3000 and 5000
echo "Cleaning up existing processes..."
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:5000) 2>/dev/null || true

# Start the development servers
echo "Starting Nexa Agents development servers..."
npm run dev
