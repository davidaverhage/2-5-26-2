#!/bin/bash
set -e

echo "Packaging Wagic VPK for PS Vita..."

# Ensure VITASDK is set
if [ -z "$VITASDK" ]; then
    echo "Error: VITASDK environment variable is not set!"
    exit 1
fi

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$REPO_ROOT/build-vita"

# Check if wagic.elf exists
if [ ! -f "$BUILD_DIR/wagic.elf" ]; then
    echo "Error: wagic.elf not found! Please run build.sh first."
    exit 1
fi

cd "$BUILD_DIR"

# Create VPK root structure
VPK_ROOT="$BUILD_DIR/vpk_root"
rm -rf "$VPK_ROOT"
mkdir -p "$VPK_ROOT/sce_sys"

echo "Creating VELF from ELF..."
vita-elf-create wagic.elf wagic.velf

echo "Creating FSELF (eboot.bin)..."
vita-make-fself -c wagic.velf "$VPK_ROOT/eboot.bin"

echo "Creating param.sfo..."
vita-mksfoex -s TITLE_ID=WAGIC00001 "Wagic" "$VPK_ROOT/sce_sys/param.sfo"

# Create icon if needed
echo "Preparing icon..."
ICON_SOURCE="$REPO_ROOT/wagic-upstream/projects/mtg/icon.png"
ICON_DEST="$VPK_ROOT/sce_sys/icon0.png"

if [ -f "$ICON_SOURCE" ]; then
    # Check if ImageMagick is available to resize
    if command -v convert &> /dev/null; then
        echo "Resizing icon to 128x128..."
        convert "$ICON_SOURCE" -resize 128x128 "$ICON_DEST"
    else
        echo "ImageMagick not found, copying icon as-is..."
        cp "$ICON_SOURCE" "$ICON_DEST"
    fi
else
    echo "Warning: Icon not found at $ICON_SOURCE"
    # Create a simple placeholder icon if source doesn't exist
    if command -v convert &> /dev/null; then
        echo "Creating placeholder icon..."
        convert -size 128x128 xc:blue -pointsize 24 -fill white \
            -gravity center -annotate +0+0 "Wagic" "$ICON_DEST"
    else
        echo "Cannot create icon without ImageMagick"
    fi
fi

# Copy game resources
echo "Copying game resources..."
RES_SOURCE="$REPO_ROOT/wagic-upstream/projects/mtg/bin/Res"
RES_DEST="$VPK_ROOT/Res"

if [ -d "$RES_SOURCE" ]; then
    cp -r "$RES_SOURCE" "$RES_DEST"
    echo "Resources copied successfully"
else
    echo "Warning: Resources not found at $RES_SOURCE"
    mkdir -p "$RES_DEST"
fi

# Create VPK
echo "Creating VPK archive..."
cd "$VPK_ROOT"
zip -r "$BUILD_DIR/Wagic.vpk" ./*

echo "VPK created successfully: $BUILD_DIR/Wagic.vpk"
ls -lh "$BUILD_DIR/Wagic.vpk"
