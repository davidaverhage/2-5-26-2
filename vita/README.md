# Wagic PS Vita Build System

This directory contains the build system and scripts for compiling Wagic for PlayStation Vita.

## Purpose

Building Wagic (a portable Magic: The Gathering engine) for PS Vita using VitaSDK toolchain. The build process creates a `.vpk` file that can be installed on a PS Vita console.

## Prerequisites

### For Local Builds

To build Wagic for PS Vita locally, you need:

1. **VitaSDK** - PS Vita development kit
   - Install from: https://vitasdk.org/
   - Ensure `VITASDK` environment variable is set (e.g., `export VITASDK=/usr/local/vitasdk`)

2. **Build Tools**
   - CMake (3.19 or later)
   - Ninja build system
   - GCC/Clang compiler
   - Git
   - Python 3
   - zip utility
   - ImageMagick (optional, for icon conversion)

3. **VitaSDK Dependencies**
   - The `build_deps.sh` script will automatically build and install:
     - vita-portlibs (zlib, freetype, libpng, libjpeg-turbo)
     - vitaGL
     - SDL-1.2-vita

## Building Locally

### 1. Build Dependencies (First Time Only)

```bash
cd vita
./build_deps.sh
```

This script will:
- Clone and build vita-portlibs (zlib, freetype, libpng, libjpeg-turbo)
- Clone and build vitaGL
- Clone and build SDL-1.2-vita
- Install all libraries into your VitaSDK directory

**Note:** This step only needs to be run once unless you clean your VitaSDK installation.

### 2. Build Wagic

```bash
cd vita
./build.sh
```

This script will:
- Configure the project with CMake using the VitaSDK toolchain
- Build the project using Ninja
- Output `wagic.elf` to `build-vita/` directory

### 3. Package VPK

```bash
cd vita
./package_vpk.sh
```

This script will:
- Convert the ELF to VELF format
- Create the FSELF (eboot.bin)
- Generate param.sfo with title metadata
- Prepare the icon (128x128 PNG)
- Copy game resources from `wagic-upstream/projects/mtg/bin/Res`
- Create the final `Wagic.vpk` file in `build-vita/`

### Complete Build Process

To run all steps in sequence:

```bash
cd vita
./build_deps.sh  # First time only
./build.sh
./package_vpk.sh
```

The final VPK will be located at `build-vita/Wagic.vpk`.

## CI/CD Workflow

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/build-vita.yml`) that automatically builds the VPK on every push.

**Workflow Details:**
- **Trigger:** Runs on all pushes, pull requests, and can be manually triggered
- **Container:** Uses `vitasdk/vitasdk:latest` Docker image
- **Steps:**
  1. Checkout repository with submodules
  2. Install host dependencies (git, cmake, ninja, build-essential, python3, zip, imagemagick)
  3. Build VitaSDK dependencies
  4. Build Wagic
  5. Package VPK
  6. Upload artifact

### Finding Build Artifacts

After a successful CI build:

1. Go to the Actions tab in the GitHub repository
2. Click on the latest workflow run
3. Scroll down to the "Artifacts" section
4. Download the "Wagic-VPK" artifact
5. Extract the ZIP file to get `Wagic.vpk`

## VPK Contents

The generated VPK file contains:

- `eboot.bin` - The executable binary
- `sce_sys/param.sfo` - Title metadata (Title ID: WAGIC00001)
- `sce_sys/icon0.png` - Application icon (128x128)
- `Res/` - Game resources (graphics, data files, etc.)

## Troubleshooting

### Build Fails with "VITASDK not set"

Ensure the `VITASDK` environment variable points to your VitaSDK installation:

```bash
export VITASDK=/usr/local/vitasdk
```

Add this to your `~/.bashrc` or `~/.zshrc` to make it permanent.

### CMake Cannot Find VitaSDK Toolchain

Verify that `$VITASDK/share/vita.toolchain.cmake` exists. If not, reinstall VitaSDK.

### Linking Errors

If you encounter undefined reference errors during linking:
1. Ensure all dependencies were built and installed correctly
2. Re-run `./build_deps.sh`
3. Clean the build directory: `rm -rf build-vita && ./build.sh`

### Icon Not Found

If the icon is missing from the upstream source:
- The script will create a simple placeholder icon (if ImageMagick is installed)
- Alternatively, provide your own 128x128 PNG at `wagic-upstream/projects/mtg/icon.png`

### Resources Not Found

Ensure `wagic-upstream/projects/mtg/bin/Res` exists and contains game data. If the upstream repository doesn't include resources, you may need to obtain them separately.

## Project Structure

```
vita/
├── CMakeLists.txt      # CMake build configuration
├── build_deps.sh       # Script to build VitaSDK dependencies
├── build.sh            # Script to build Wagic
├── package_vpk.sh      # Script to package VPK
└── README.md           # This file

wagic-upstream/         # Wagic source code (from upstream)
├── projects/mtg/       # Main Wagic project
│   ├── src/            # Source files
│   ├── include/        # Header files
│   └── bin/Res/        # Game resources
└── JGE/                # JGE game engine
    ├── src/            # Engine source
    ├── include/        # Engine headers
    └── Dependencies/   # Third-party libraries

build-vita/             # Build output directory (generated)
└── Wagic.vpk          # Final installable VPK
```

## Credits

- Wagic Project: https://github.com/WagicProject/wagic
- VitaSDK: https://vitasdk.org/
