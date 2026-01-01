#!/bin/bash

# Capacitor Setup Script
# This script helps set up Capacitor for mobile and desktop apps
# Requires Node.js >= 22.0.0

echo "🚀 Setting up Capacitor for SITREP..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js version 22 or higher is required"
    echo "Current version: $(node -v)"
    echo "Please upgrade Node.js and try again"
    exit 1
fi

echo "✅ Node.js version check passed: $(node -v)"

# Initialize Capacitor if not already done
if [ ! -f "capacitor.config.ts" ]; then
    echo "📝 Initializing Capacitor..."
    npx cap init "SITREP" "com.sitrep.app" --web-dir="out"
else
    echo "✅ Capacitor config already exists"
fi

# Add iOS platform (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ ! -d "ios" ]; then
        echo "📱 Adding iOS platform..."
        npx cap add ios
    else
        echo "✅ iOS platform already added"
    fi
else
    echo "⏭️  Skipping iOS (macOS only)"
fi

# Add Android platform
if [ ! -d "android" ]; then
    echo "🤖 Adding Android platform..."
    npx cap add android
else
    echo "✅ Android platform already added"
fi

# Install iOS dependencies (macOS only)
if [[ "$OSTYPE" == "darwin"* ]] && [ -d "ios/App" ]; then
    echo "📦 Installing iOS dependencies..."
    cd ios/App
    pod install
    cd ../..
fi

echo ""
echo "✅ Capacitor setup complete!"
echo ""
echo "Next steps:"
echo "1. Build your Next.js app: npm run build"
echo "2. Sync with Capacitor: npm run cap:sync"
echo "3. Open in IDE:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   - iOS: npm run cap:open:ios"
fi
echo "   - Android: npm run cap:open:android"
echo ""
echo "For more details, see CAPACITOR_SETUP.md"

