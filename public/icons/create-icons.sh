#!/bin/bash
# Generate extension icons from Think main application logo
# Uses macOS sips command (built-in, no dependencies needed)

set -e  # Exit on error

echo "🎨 Generating Think extension icons..."
echo "================================================"

# Source icon - use the main app icon (512x512 PNG)
SOURCE_ICON="../../../public/icons/think-os-agent.png"

# Check if source exists
if [ ! -f "$SOURCE_ICON" ]; then
  echo "❌ Error: Source icon not found at $SOURCE_ICON"
  echo "   Expected: Think main app icon (512x512 PNG)"
  exit 1
fi

echo "✓ Source icon found: $SOURCE_ICON"

# Verify source dimensions
SOURCE_SIZE=$(sips -g pixelWidth "$SOURCE_ICON" | tail -1 | awk '{print $2}')
echo "✓ Source size: ${SOURCE_SIZE}x${SOURCE_SIZE}px"

# Required sizes for Chrome extension
SIZES=(16 32 48 128)

# Generate each size
for size in "${SIZES[@]}"; do
  OUTPUT="icon-${size}.png"
  echo ""
  echo "Creating ${OUTPUT} (${size}x${size}px)..."

  # Use sips to resize
  sips -z "$size" "$size" "$SOURCE_ICON" --out "$OUTPUT" > /dev/null 2>&1

  if [ -f "$OUTPUT" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
    echo "✓ Created: $OUTPUT ($FILE_SIZE)"
  else
    echo "❌ Failed to create $OUTPUT"
    exit 1
  fi
done

echo ""
echo "================================================"
echo "✅ All extension icons generated successfully!"
echo ""
echo "Generated files:"
ls -lh icon-*.png | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to copy icons to dist/"
echo "2. Run 'npm run package' to create distribution ZIP"
echo "3. Load extension in Chrome to see new icons!"
