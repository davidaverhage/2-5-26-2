#!/bin/bash
set -e

echo "Building Wagic for PS Vita..."

# Ensure VITASDK is set
if [ -z "$VITASDK" ]; then
    echo "Error: VITASDK environment variable is not set!"
    exit 1
fi

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Repository root: $REPO_ROOT"

# Create build directory
BUILD_DIR="$REPO_ROOT/build-vita"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with CMake
echo "Configuring with CMake..."
cmake "$REPO_ROOT/vita" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_TOOLCHAIN_FILE="$VITASDK/share/vita.toolchain.cmake" \
    -G Ninja

# Build
echo "Building..."
ninja -v

echo "Build completed successfully!"
echo "Output: $BUILD_DIR/wagic.elf"
