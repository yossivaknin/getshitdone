#!/bin/bash

# Generate Electron Icons Script
# This script generates .icns and .ico files from a PNG image

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎨 Electron Icon Generator${NC}"
echo ""

# Check if input file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No input file provided${NC}"
    echo ""
    echo "Usage: ./scripts/generate-electron-icons.sh <path-to-png>"
    echo "Example: ./scripts/generate-electron-icons.sh logo.png"
    exit 1
fi

INPUT_FILE="$1"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ Error: File not found: $INPUT_FILE${NC}"
    exit 1
fi

# Check if it's a PNG
if [[ ! "$INPUT_FILE" =~ \.(png|PNG)$ ]]; then
    echo -e "${YELLOW}⚠️  Warning: File doesn't appear to be a PNG${NC}"
    echo "Continuing anyway..."
fi

# Create build directory if it doesn't exist
mkdir -p build

echo -e "${GREEN}📦 Creating icon files...${NC}"
echo ""

# Generate macOS .icns file
echo "Generating macOS icon (.icns)..."
ICONSET_DIR="build/icon.iconset"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Generate all required sizes for .icns
sips -z 16 16     "$INPUT_FILE" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
sips -z 32 32     "$INPUT_FILE" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
sips -z 32 32     "$INPUT_FILE" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
sips -z 64 64     "$INPUT_FILE" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
sips -z 128 128   "$INPUT_FILE" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
sips -z 256 256   "$INPUT_FILE" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   "$INPUT_FILE" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
sips -z 512 512   "$INPUT_FILE" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   "$INPUT_FILE" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
sips -z 1024 1024 "$INPUT_FILE" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

# Convert to .icns
iconutil -c icns "$ICONSET_DIR" -o build/icon.icns

# Clean up iconset directory
rm -rf "$ICONSET_DIR"

echo -e "${GREEN}✅ Created: build/icon.icns${NC}"

# Generate Windows .ico file (if ImageMagick is available)
if command -v convert &> /dev/null; then
    echo "Generating Windows icon (.ico)..."
    convert "$INPUT_FILE" -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
    echo -e "${GREEN}✅ Created: build/icon.ico${NC}"
else
    echo -e "${YELLOW}⚠️  ImageMagick not found. Skipping .ico generation.${NC}"
    echo "   Install with: brew install imagemagick"
    echo "   Or use online tool: https://cloudconvert.com/png-to-ico"
fi

echo ""
echo -e "${GREEN}✅ Icon generation complete!${NC}"
echo ""
echo "Files created:"
echo "  - build/icon.icns (macOS)"
if [ -f "build/icon.ico" ]; then
    echo "  - build/icon.ico (Windows)"
fi
echo ""
echo "Next steps:"
echo "  1. Rebuild Electron app: npm run electron:build"
echo "  2. Check the icon in dist/SITREP-*.dmg"

