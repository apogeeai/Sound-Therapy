#!/bin/bash
# Deployment script for Hetzner VPS

set -e

echo "🚀 Building application..."
npm install
npm run build

echo "✅ Build complete!"
echo "📦 Build output is in ./dist"
echo ""
echo "Next steps:"
echo "1. Copy dist/ and public/ to your VPS"
echo "2. Set up nginx (see nginx.conf)"
echo "3. Configure SSL with certbot"
echo "4. Start nginx service"

