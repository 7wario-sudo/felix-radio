#!/bin/bash
set -e

echo "Starting Cloudflare Workers with R2 binding..."

cd "$(dirname "$0")"

# Start wrangler dev in the background
pnpm dev > /tmp/wrangler-r2-test.log 2>&1 &
WRANGLER_PID=$!

echo "Waiting for server to start (PID: $WRANGLER_PID)..."
sleep 12

# Test health endpoint
echo ""
echo "Testing /health endpoint:"
curl -s http://localhost:8787/health | jq '.'

# Clean up
echo ""
echo "Stopping server..."
kill $WRANGLER_PID 2>/dev/null || true
wait $WRANGLER_PID 2>/dev/null || true

echo "Test complete!"
