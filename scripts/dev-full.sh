#!/bin/bash

# Felix Radio - Full Stack Development Server
# Starts both frontend (Next.js) and backend (Workers API) in parallel

echo "🐱 Felix Radio - Full Stack Development"
echo "========================================"

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from project root"
    exit 1
fi

echo ""
echo "🚀 Starting development servers..."
echo ""
echo "   Frontend (Next.js):  http://localhost:3000"
echo "   Backend (Workers):   http://localhost:8787"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo ""
echo "========================================"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    jobs -p | xargs kill 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Workers API in background
echo "Starting Workers API..."
cd apps/api && pnpm dev &
API_PID=$!

# Wait a bit for API to start
sleep 2

# Start Next.js frontend in background
echo "Starting Next.js frontend..."
cd ../web && npm run dev &
WEB_PID=$!

# Wait for both processes
wait $API_PID $WEB_PID
