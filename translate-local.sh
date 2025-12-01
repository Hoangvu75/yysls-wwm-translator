#!/bin/bash
# Script dịch local cho Linux/Mac
# Sử dụng: chmod +x translate-local.sh && ./translate-local.sh

set -e

echo "=== WWM Locale Translator - Local Mode ==="
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js >= 18.0.0"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✓ Node.js: $NODE_VERSION"

# Check .env file
echo "Checking .env file..."
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Creating .env from template..."
    cp env.example .env
    echo "⚠️ Please edit .env file and add your GEMINI_API_KEY"
    echo "Run: nano .env"
    exit 1
fi
echo "✓ .env file found"

# Install dependencies
echo "Installing dependencies..."
npm install --silent
echo "✓ Dependencies installed"

# Create directories
echo "Creating directories..."
mkdir -p works/patch
mkdir -p works/translated
mkdir -p output/words_map
echo "✓ Directories created"

# Check if words_map exists
echo ""
echo "=== Step 1: Prepare words_map ==="
if [ ! -d "output/words_map/text" ]; then
    echo "⚠️ words_map not found!"
    echo "Please:"
    echo "  1. Download unpacked_words_map.zip from GitHub Release"
    echo "  2. Extract to output/words_map/ folder"
    echo "  3. Or place words_map file and run: ./bin/yanyun path/to/words_map"
    exit 1
fi
echo "✓ words_map found"

# Create missing files
echo ""
echo "=== Step 2: Create missing files ==="
echo "Creating empty patch..."
echo "{}" > works/patch/empty.json

echo "Running merge to find missing entries..."
npx tsx src/merge.ts ./output/words_map ./works/patch --miss

if [ ! -d "output/words_map/missing" ]; then
    echo "❌ No missing files created!"
    exit 1
fi

MISSING_COUNT=$(ls output/words_map/missing/*.json 2>/dev/null | wc -l)
echo "✓ Found $MISSING_COUNT missing files to translate"

# Translate
echo ""
echo "=== Step 3: Translate missing files ==="
echo "Starting translation..."
echo "This will take several hours. You can run in tmux/screen to keep it running."
echo "Translated files will be saved to: works/translated/"
echo ""

npx tsx src/translate.ts ./output/words_map/missing ./works/translated

echo ""
echo "=== Translation completed! ==="
echo "Translated files are in: works/translated/"
echo ""
echo "Next steps:"
echo "  1. Merge translated files: npx tsx src/merge.ts ./output/words_map ./works/translated"
echo "  2. Pack with yanyun: ./bin/yanyun ./output/words_map"
echo "  3. Result will be in: output/words_map/merged/words_map"

