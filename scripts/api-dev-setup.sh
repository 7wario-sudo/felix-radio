#!/bin/bash

# Felix Radio - API Development Setup Script
# This script initializes the local D1 database and prepares the API for development

echo "🐱 Felix Radio - API Development Setup"
echo "======================================"

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from project root"
    exit 1
fi

# Navigate to API directory
cd apps/api

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🗄️  Initializing local D1 database..."
# The local D1 database will be created automatically when wrangler dev runs
# We'll apply migrations using the local D1
pnpm wrangler d1 execute felix-radio-db --local --file=migrations/0001_initial_schema.sql 2>/dev/null || {
    echo "   Note: Database will be initialized on first run"
}

echo ""
echo "✅ API development environment is ready!"
echo ""
echo "To start the API server, run:"
echo "   cd apps/api && pnpm dev"
echo ""
echo "The API will be available at: http://localhost:8787"
echo "======================================"
