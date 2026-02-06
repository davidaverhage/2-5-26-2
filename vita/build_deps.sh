#!/bin/bash
set -e

echo "Building dependencies for VitaSDK..."

# Ensure VITASDK is set
if [ -z "$VITASDK" ]; then
    echo "Error: VITASDK environment variable is not set!"
    exit 1
fi

# Build and install vita-portlibs dependencies
echo "Building vita-portlibs (zlib, freetype)..."
cd /tmp
if [ ! -d "vita-portlibs" ]; then
    git clone https://github.com/vitasdk/packages.git vita-portlibs
fi
cd vita-portlibs

echo "Building zlib..."
make zlib
make install-zlib

echo "Building freetype..."
make freetype
make install-freetype

echo "Building libpng..."
make libpng
make install-libpng

echo "Building libjpeg-turbo..."
make libjpeg-turbo
make install-libjpeg-turbo

# Build and install vitaGL
echo "Building vitaGL..."
cd /tmp
if [ ! -d "vitaGL" ]; then
    git clone https://github.com/vitasdk/vitaGL.git
fi
cd vitaGL
make install

# Build and install SDL-1.2-vita
echo "Building SDL-1.2-vita..."
cd /tmp
if [ ! -d "SDL-1.2-vita" ]; then
    git clone https://github.com/vitasdk/sdl-vita.git SDL-1.2-vita
fi
cd SDL-1.2-vita
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
make install

echo "All dependencies built and installed successfully!"
