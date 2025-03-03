#!/bin/bash

# Make sure we're in the project root directory
cd "$(dirname "$0")"

echo "🚀 Starting migration from project root..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install it first."
    exit 1
fi

# Check if migrate.js exists
if [ ! -f "migrate.js" ]; then
    echo "❌ Error: migrate.js not found in the current directory."
    exit 1
fi

# Run the migration script
echo "Running migration script..."
node migrate.js

# Check if migration was successful
if [ $? -ne 0 ]; then
    echo "❌ Migration failed."
    exit 1
fi

# Make the metrics build script executable
if [ -f "server/src/gateway/build-minimal-metrics.sh" ]; then
    chmod +x server/src/gateway/build-minimal-metrics.sh
    echo "✅ Made metrics script executable."
fi

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. cd client && npm install"
echo "2. cd ../server && npm install"
echo "3. Open the VS Code workspace: code nexa-workspace.code-workspace"
