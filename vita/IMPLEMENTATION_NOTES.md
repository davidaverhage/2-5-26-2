# Implementation Notes

## What Was Implemented

This implementation adds a complete build system for compiling Wagic (Magic: The Gathering card game engine) for PlayStation Vita, with automated CI/CD via GitHub Actions.

### Files Created

1. **vita/CMakeLists.txt** (3KB)
   - CMake build configuration for VitaSDK
   - Compiles Wagic MTG project sources (~115 .cpp files)
   - Compiles JGE engine sources with SDL backend
   - Includes bundled libpng and libjpeg from Dependencies
   - Links against VitaSDK libraries (SDL, vitaGL, freetype, SCE stubs)
   - Produces wagic.elf executable

2. **vita/build_deps.sh** (1.2KB, executable)
   - Builds and installs VitaSDK dependencies
   - Handles: vita-portlibs (zlib, freetype, libpng, libjpeg-turbo)
   - Handles: vitaGL graphics library
   - Handles: SDL-1.2-vita port
   - Only needs to run once per VitaSDK installation

3. **vita/build.sh** (705B, executable)
   - Configures project with CMake + Ninja
   - Runs build process
   - Outputs wagic.elf to build-vita/ directory

4. **vita/package_vpk.sh** (2.3KB, executable)
   - Converts ELF → VELF → FSELF (eboot.bin)
   - Creates param.sfo with Title ID WAGIC00001
   - Prepares 128x128 icon (resizes if needed)
   - Copies game resources from wagic-upstream/projects/mtg/bin/Res
   - Packages everything into Wagic.vpk

5. **.github/workflows/build-vita.yml** (1.2KB)
   - GitHub Actions workflow using vitasdk/vitasdk:latest container
   - Runs on all pushes and pull requests
   - Installs host dependencies
   - Executes build_deps.sh → build.sh → package_vpk.sh
   - Uploads Wagic.vpk as artifact named "Wagic-VPK"

6. **vita/README.md** (5KB)
   - Comprehensive documentation
   - Local build prerequisites and instructions
   - CI/CD workflow explanation
   - Troubleshooting guide
   - Project structure overview

7. **.gitignore**
   - Excludes build-vita/ directory
   - Excludes build artifacts (.elf, .velf, .self, .o, .a, etc.)
   - Excludes VPK intermediate files

8. **wagic-upstream/** (imported via git subtree)
   - Full Wagic source tree from https://github.com/WagicProject/wagic
   - Includes projects/mtg (main game), JGE (engine), Dependencies

## Design Decisions

### CMake Configuration
- Uses VitaSDK's official toolchain file
- Explicitly excludes platform-specific files (Qt, iOS, Android, PSP, Windows)
- Uses GLOB_RECURSE for MTG sources (all cpp files in projects/mtg/src)
- Uses filtered GLOB for JGE sources (excludes unwanted main files)
- Includes PC backend files (pc/JGfx.cpp, pc/JSfx.cpp) as they're SDL-based
- Bundles codec libraries (libpng, libjpeg) from JGE/Dependencies

### Build Scripts
- All scripts verify VITASDK environment variable
- Scripts are idempotent where possible
- build_deps.sh clones to /tmp to avoid cluttering repo
- package_vpk.sh gracefully handles missing icon (creates placeholder)
- package_vpk.sh warns if game resources are missing

### CI/CD Workflow
- Uses official VitaSDK Docker container for consistency
- Installs ImageMagick for icon resizing
- Runs all three scripts in sequence
- Always lists build outputs (even on failure)
- Shows VPK contents for verification

## Known Limitations

1. **First Workflow Run**: May require manual approval in GitHub Actions settings
   - This is a GitHub security feature for new workflow files
   - User needs to go to Actions tab and approve the workflow

2. **Build Time**: Building dependencies takes several minutes
   - Consider caching /tmp/vita-portlibs, /tmp/vitaGL, /tmp/SDL-1.2-vita in CI
   - Currently not implemented to keep workflow simple

3. **Icon Handling**: Assumes icon exists in upstream source
   - Falls back to placeholder if ImageMagick is available
   - No icon if both source missing and ImageMagick unavailable

4. **Resources**: Assumes Res directory exists in upstream
   - Creates empty Res/ if missing but game won't run properly

## Testing Status

- [x] All files created and formatted correctly
- [x] Scripts have correct execute permissions
- [x] YAML workflow file is valid
- [x] CMakeLists.txt uses proper VitaSDK conventions
- [ ] Workflow awaiting GitHub Actions approval (automated testing blocked)
- [ ] Full build cycle not yet tested (will test once workflow runs)
- [ ] VPK not yet verified (pending first successful build)

## Next Steps

After workflow approval:

1. **Monitor First Build**: Check for compiler/linker errors
   - May need to adjust include paths
   - May need to add/remove SCE library stubs
   - May need to handle missing symbols

2. **Common Issues to Watch For**:
   - Missing header files → adjust include_directories
   - Undefined references → add missing libraries to target_link_libraries
   - Conflicting symbols → may need to exclude more source files
   - Codec library issues → may need to use VitaSDK versions instead of bundled

3. **Potential Fixes**:
   - If bundled codecs fail: remove LIBPNG_SOURCES/LIBJPEG_SOURCES, rely on VitaSDK's
   - If PC backend has issues: may need to create vita-specific JGfx/JSfx
   - If SDL issues: verify SDL-1.2-vita build flags (SDL_VITAGL=1 is set)

4. **VPK Verification**: Once built successfully
   - Download artifact from GitHub Actions
   - Verify contents: eboot.bin, sce_sys/, Res/
   - Test on actual Vita or emulator

## Acceptance Criteria Status

- ✅ All files created and committed
- ✅ Workflow configuration is valid YAML
- ✅ Build scripts are properly formatted and executable
- ✅ VPK structure will contain: eboot.bin, sce_sys/param.sfo, sce_sys/icon0.png, Res/
- ✅ PR includes clear documentation and local build instructions
- ⏳ If build fails during CI, iterate on errors until green (awaiting approval)
