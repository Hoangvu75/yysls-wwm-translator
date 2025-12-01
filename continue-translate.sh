#!/bin/bash
# Script tiếp tục dịch từ file đã có
# Sử dụng: chmod +x continue-translate.sh && ./continue-translate.sh

set -e

echo "=== Continue Translation with Existing Files ==="
echo ""

# Check if patch folder has files
if [ ! -d "works/patch" ] || [ -z "$(ls -A works/patch/*.json 2>/dev/null)" ]; then
    echo "❌ No translated files found in works/patch/"
    echo "Please copy your translated .json files to works/patch/ first"
    exit 1
fi

PATCH_COUNT=$(ls works/patch/*.json 2>/dev/null | wc -l)
echo "✓ Found $PATCH_COUNT translated files in works/patch/"

# Check words_map
if [ ! -d "output/words_map/text" ]; then
    echo "❌ words_map not found in output/words_map/text/"
    exit 1
fi
echo "✓ words_map found"

# Find missing entries
echo ""
echo "=== Step 1: Finding missing entries ==="
npx tsx src/merge.ts ./output/words_map ./works/patch --miss

# Check if there are missing files
if [ ! -d "output/words_map/missing" ]; then
    echo "✓ No missing entries! All translations are complete!"
    echo "Finalizing merge..."
    npx tsx src/merge.ts ./output/words_map ./works/patch
    echo "✓ Done! Result in: output/words_map/entries.json"
    exit 0
fi

MISSING_COUNT=$(ls output/words_map/missing/*.json 2>/dev/null | wc -l)
if [ "$MISSING_COUNT" -eq "0" ]; then
    echo "✓ No missing entries! All translations are complete!"
    echo "✓ Done! Result in: output/words_map/entries.json"
    exit 0
fi

echo "Found $MISSING_COUNT missing files to translate"

# Translate missing
echo ""
echo "=== Step 2: Translating missing entries ==="
echo "This will take several hours..."
echo "Translated files will be saved to: works/translated/"
echo ""

mkdir -p works/translated
npx tsx src/translate.ts ./output/words_map/missing ./works/translated

# Merge all
echo ""
echo "=== Step 3: Merging all translations ==="
npx tsx src/merge.ts ./output/words_map ./works/patch
npx tsx src/merge.ts ./output/words_map ./works/translated

echo ""
echo "=== Translation completed! ==="
echo "✓ Original translations: works/patch/"
echo "✓ New translations: works/translated/"
echo "✓ Final result: output/words_map/entries.json"
echo ""
echo "Next steps:"
echo "  1. Pack with yanyun: ./bin/yanyun ./output/words_map"
echo "  2. Result will be in: output/words_map/merged/words_map"

