#!/bin/bash
echo "Installing Nexa Agents dependencies..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "npm not found, please install Node.js and npm first"
    exit 1
fi

# Install dependencies
echo "Running npm install..."
npm install

# Double-check that systeminformation is installed
if ! npm list systeminformation | grep -q systeminformation; then
    echo "Installing systeminformation package specifically..."
    npm install systeminformation
fi

echo "Dependencies installed successfully!"
echo "You can now run './start.sh' to start the development server"
