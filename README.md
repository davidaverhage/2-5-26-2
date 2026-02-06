# Wagic VPK Builder for DigitalOcean App Platform

Build [Wagic, the Homebrew?!](https://github.com/WagicProject/wagic) as a
PS Vita `.vpk` package, automatically, using DigitalOcean App Platform.

## What this does

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Docker build — stage 1 installs [VitaSDK](https://vitasdk.org/) and compiles Wagic; stage 2 runs a lightweight Python HTTP server to serve the resulting `.vpk`. |
| `build.sh` | Orchestrates the CMake build inside the VitaSDK container. Falls back to producing a stub `.vpk` when the full build encounters errors (Wagic has no official Vita port yet). |
| `vita/CMakeLists.txt` | CMake configuration that targets the PS Vita via VitaSDK, compiling both the JGE engine and the Wagic MTG project, then packaging the output as a `.vpk`. |
| `server.py` | Python HTTP server (port 8080) that provides a landing page, a `/wagic.vpk` download endpoint, and a `/health` health-check. |
| `.do/app.yaml` | DigitalOcean App Platform spec — tells the platform to build the Docker image and expose the HTTP service. |

## Quick start

### Deploy to DigitalOcean App Platform

1. Fork or push this repository to GitHub.
2. Edit `.do/app.yaml` and replace `<your-github-username>/<your-repo-name>`
   with your actual GitHub repository path.
3. In the [DigitalOcean control panel](https://cloud.digitalocean.com/apps),
   choose **Apps → Create App**.
4. Select the repository and branch. App Platform will detect the
   `.do/app.yaml` and Dockerfile automatically.
5. Once deployed, open the app URL to download `wagic.vpk`.

### Build locally with Docker

```bash
docker build -t wagic-vpk-builder .
docker run -p 8080:8080 wagic-vpk-builder
# Open http://localhost:8080 in your browser
```

### Build locally with VitaSDK (no Docker)

```bash
# Ensure VITASDK is installed and on your PATH
export VITASDK=/usr/local/vitasdk
export PATH=$VITASDK/bin:$PATH

git clone https://github.com/WagicProject/wagic.git /tmp/wagic
cp vita/CMakeLists.txt /tmp/wagic/projects/mtg/vita/CMakeLists.txt
mkdir -p /tmp/wagic/projects/mtg/vita/build
cd /tmp/wagic/projects/mtg/vita/build
cmake .. -DCMAKE_TOOLCHAIN_FILE=$VITASDK/share/vita.toolchain.cmake \
         -DWAGIC_SRC=/tmp/wagic
make -j$(nproc)
# Output: wagic_vita.vpk
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│         DigitalOcean App Platform                │
│  ┌────────────────────────────────────────────┐  │
│  │  Docker Container                          │  │
│  │                                            │  │
│  │  Stage 1 (build):                          │  │
│  │    gnuton/vitasdk-docker                   │  │
│  │    ├── clone WagicProject/wagic            │  │
│  │    ├── cmake + make (vita/CMakeLists.txt)  │  │
│  │    └── output: wagic.vpk                   │  │
│  │                                            │  │
│  │  Stage 2 (serve):                          │  │
│  │    python:3.12-slim                        │  │
│  │    └── server.py on :8080                  │  │
│  │        GET /           → landing page      │  │
│  │        GET /wagic.vpk  → download          │  │
│  │        GET /health     → health check      │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Notes on the Vita port

Wagic was originally written for PSP, Android, and desktop (Qt/SDL).
There is **no official PS Vita port**. The `vita/CMakeLists.txt` in this
repository is a best-effort build configuration that:

- Compiles the JGE engine and Wagic MTG sources with the VitaSDK ARM
  cross-compiler.
- Links against Vita system stubs (`SceDisplay`, `SceCtrl`, `SceAudio`, etc.)
  and VitaSDK-packaged libraries (`vita2d`, `freetype`, `libpng`, etc.).
- Packages the result into a `.vpk` using `vita_create_self` and
  `vita_create_vpk`.

Because Wagic's rendering and input code targets PSP-specific APIs, a full
working port would also require:

1. A vita2d or vitaGL back-end for `JGE/src/JGfx.cpp`.
2. SceAudio replacements for PSP audio calls.
3. SceCtrl / SceTouch input handling.
4. File-system path adjustments (`ux0:data/wagic/`).

If the full build does not succeed, `build.sh` automatically creates a stub
`.vpk` so the deployment pipeline still produces a downloadable artifact.

## License

This build configuration is provided under the MIT License.
Wagic itself is licensed under its own terms — see the
[Wagic repository](https://github.com/WagicProject/wagic) for details.