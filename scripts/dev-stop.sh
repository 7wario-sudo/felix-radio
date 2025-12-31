#!/bin/bash

# Felix Radio - Local Development Stop Script

echo "🐱 Felix Radio - Stopping Local Development Server"
echo "=================================================="

# Find and kill Next.js dev server (port 3000)
echo "🔍 Looking for Next.js development server..."
PID=$(lsof -ti:3000)

if [ -z "$PID" ]; then
    echo "ℹ️  No server running on port 3000"
else
    echo "🛑 Stopping Next.js server (PID: $PID)..."
    kill -9 $PID 2>/dev/null
    echo "✅ Next.js server stopped successfully"
fi

# Find and kill API server (port 8787)
echo "🔍 Looking for API server..."
API_PID=$(lsof -ti:8787)

if [ -z "$API_PID" ]; then
    echo "ℹ️  No API server running on port 8787"
else
    echo "🛑 Stopping API server (PID: $API_PID)..."
    kill -9 $API_PID 2>/dev/null
    echo "✅ API server stopped successfully"
fi

# Clean up PID file
if [ -f "/tmp/felix-api.pid" ]; then
    rm /tmp/felix-api.pid
    echo "🧹 Cleaned up PID file"
fi

# Clean up log file
if [ -f "/tmp/felix-api.log" ]; then
    rm /tmp/felix-api.log
    echo "🧹 Cleaned up log file"
fi

# Also kill any node processes running next dev
NODE_PIDS=$(pgrep -f "next dev")
if [ ! -z "$NODE_PIDS" ]; then
    echo "🧹 Cleaning up additional Next.js processes..."
    echo "$NODE_PIDS" | xargs kill -9 2>/dev/null
    echo "✅ Cleanup completed"
fi

# Kill any wrangler dev processes
WRANGLER_PIDS=$(pgrep -f "wrangler dev")
if [ ! -z "$WRANGLER_PIDS" ]; then
    echo "🧹 Cleaning up Wrangler processes..."
    echo "$WRANGLER_PIDS" | xargs kill -9 2>/dev/null
    echo "✅ Wrangler cleanup completed"
fi

echo ""
echo "=================================================="
echo "✨ All development servers stopped"
echo ""
