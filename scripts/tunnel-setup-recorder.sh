#!/bin/bash

# Felix Radio - Tunnel Recorder Setup Script
# This script configures the Vultr recorder server to use the local API via Cloudflare Tunnel

echo "🌐 Felix Radio - Configure Recorder for Tunnel"
echo "================================================"

# Check if tunnel URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Tunnel URL required"
    echo "Usage: ./scripts/tunnel-setup-recorder.sh <tunnel-url>"
    echo ""
    echo "Example:"
    echo "  ./scripts/tunnel-setup-recorder.sh https://abc-def-123.trycloudflare.com"
    echo ""
    echo "To get the tunnel URL:"
    echo "  tail -f /tmp/felix-tunnel.log | grep https://"
    exit 1
fi

TUNNEL_URL=$1

echo "📋 Configuration:"
echo "   Tunnel URL: $TUNNEL_URL"
echo "   Server: root@158.247.206.183"
echo ""
echo "⏳ Updating recorder server configuration..."

# Update .env file on recorder server
ssh root@158.247.206.183 "cat > felix-radio/packages/recorder/.env << 'EOF'
# Workers API Configuration (using local tunnel)
WORKERS_API_URL=$TUNNEL_URL
INTERNAL_API_KEY=dev_api_key_12345

# OpenAI Whisper API
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=ed20098766cafda6a8821fcc3be0ac43
R2_ACCESS_KEY_ID=4972687ffcb2b717819580b75bffd463
R2_SECRET_ACCESS_KEY=0452e5853a5c20bb833f2ae132ba9875731df49a970ffb2a1bc5fa11b425246f
R2_BUCKET_NAME=felix-radio-recordings
R2_ENDPOINT=https://ed20098766cafda6a8821fcc3be0ac43.r2.cloudflarestorage.com

# Configuration
TZ=Asia/Seoul
LOG_LEVEL=info
EOF
"

echo "✅ Configuration updated"
echo ""
echo "🔄 Restarting recorder service..."

# Restart recorder service
ssh root@158.247.206.183 "cd felix-radio/packages/recorder && docker-compose down && docker-compose up -d --build"

echo ""
echo "✅ Recorder server configured and restarted"
echo ""
echo "📋 To verify:"
echo "   ssh root@158.247.206.183 'cd felix-radio/packages/recorder && docker-compose logs --tail=20'"
echo ""
echo "⚠️  Important:"
echo "   - Keep your local server running (./scripts/dev-start.sh --tunnel)"
echo "   - If you restart dev-start.sh, the tunnel URL will change"
echo "   - Run this script again with the new tunnel URL"
echo ""
