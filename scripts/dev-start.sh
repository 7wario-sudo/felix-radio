#!/bin/bash

# Felix Radio - Local Development Start Script

echo "🐱 Felix Radio - Starting Local Development Server"
echo "=================================================="

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from project root"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "apps/web/.env.local" ]; then
    echo "📝 Creating .env.local with Clerk credentials..."
    cat > apps/web/.env.local << 'EOF'
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bGlrZWQtbWFybW9zZXQtOC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_z2rJXG5lIOFotq2TvjBGBKFA2CdymS0FPLUoJxpVzy

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787

# Mock Mode (set to 'true' to use mock data)
NEXT_PUBLIC_USE_MOCK_API=true
EOF
    echo "✅ Created apps/web/.env.local with mock mode enabled"
fi

# Note: Clerk authentication is now always enabled
# Mock mode is controlled via NEXT_PUBLIC_USE_MOCK_API environment variable

# Start development server
echo ""
echo "🚀 Starting Next.js development server..."
echo ""
echo "   📱 Local:    http://localhost:3000"
echo "   🌐 Network:  http://$(ipconfig getifaddr en0 2>/dev/null || echo "unavailable"):3000"
echo ""
echo "   Available pages:"
echo "   - Dashboard:        /dashboard"
echo "   - Schedules:        /dashboard/schedules"
echo "   - Recordings:       /dashboard/recordings"
echo "   - Recording Detail: /dashboard/recordings/1"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""
echo "=================================================="
echo ""

cd apps/web && npm run dev
