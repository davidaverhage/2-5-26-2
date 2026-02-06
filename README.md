# Wagic the Homebrew — Build & Run

Automated scripts to clone, build, and run **[Wagic, the Homebrew](https://github.com/WagicProject/wagic)** on your computer.

Wagic is an open-source C++ card game engine that lets you play Magic: The Gathering–style card games against an AI. It supports over 25,000 cards and is highly customizable — create your own cards, decks, themes, and rules.

## Quick Start

### Linux (Ubuntu / Debian)

```bash
git clone https://github.com/davidaverhage/2-5-26-2.git wagic-builder
cd wagic-builder
./scripts/build-linux.sh
```

This single command will:
1. Install all required build dependencies (Qt5, freetype, OpenGL, etc.)
2. Clone the Wagic source code
3. Build Wagic using qmake/make
4. Download the game's core resource pack (~55 MB)
5. Launch Wagic

You can also run individual steps:

```bash
./scripts/build-linux.sh deps    # Install dependencies only
./scripts/build-linux.sh build   # Build only
./scripts/build-linux.sh run     # Run only (must build first)
```

### macOS

```bash
git clone https://github.com/davidaverhage/2-5-26-2.git wagic-builder
cd wagic-builder
./scripts/build-macos.sh
```

Requires [Homebrew](https://brew.sh). The script will install Qt5, freetype, and other dependencies via `brew`.

```bash
./scripts/build-macos.sh deps    # Install dependencies only
./scripts/build-macos.sh build   # Build only
./scripts/build-macos.sh run     # Run only (must build first)
```

### Windows

```powershell
git clone https://github.com/davidaverhage/2-5-26-2.git wagic-builder
cd wagic-builder
.\scripts\build-windows.ps1
```

Requires:
- [Git for Windows](https://git-scm.com/download/win)
- [Visual Studio 2019 or 2022](https://visualstudio.microsoft.com/downloads/) with the **Desktop development with C++** workload

```powershell
.\scripts\build-windows.ps1 -Action deps    # Check dependencies
.\scripts\build-windows.ps1 -Action build   # Build only
.\scripts\build-windows.ps1 -Action run     # Run only
```

If no build environment is available, the Windows script will automatically download and run the pre-built release binary from the official Wagic GitHub releases.

## What Gets Built

| Platform | Build System | Output |
|----------|-------------|--------|
| Linux    | qmake + make (Qt5) | `wagic-build/wagic` |
| macOS    | qmake + make (Qt5) | `wagic-build/wagic` or `wagic-build/wagic.app` |
| Windows  | MSBuild (Visual Studio) | `wagic/projects/mtg/bin/Release/wagic.exe` |

## Project Structure

```
├── README.md                   # This file
├── scripts/
│   ├── build-linux.sh          # Linux build & run script
│   ├── build-macos.sh          # macOS build & run script
│   └── build-windows.ps1       # Windows build & run script
├── wagic/                      # (created at build time) Wagic source clone
└── wagic-build/                # (created at build time) Qt build output
```

## Game Controls

Once running, Wagic uses:
- **Arrow keys** — Navigate menus and cards
- **Enter / Space** — Select / Confirm
- **Escape** — Cancel / Back
- **Mouse** — Point and click (desktop builds)

## Upstream Project

- **Repository**: <https://github.com/WagicProject/wagic>
- **Latest Release**: [v0.25.5 — Tarkir: Dragonstorm](https://github.com/WagicProject/wagic/releases/tag/wagic-v0.25.5)
- **Community**: [Wagic MTG Game Discord](https://discord.com/invite/JHK5pVaK5p)
- **License**: Wagic is released under the BSD License

## Troubleshooting

### Linux: `qmake` not found
```bash
sudo apt-get install qt5-qmake qtbase5-dev
```

### macOS: Qt not linked
```bash
brew link qt@5 --force
```

### Windows: MSBuild not found
Install Visual Studio with the "Desktop development with C++" workload, or use the [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022).

### Build fails with missing headers
Ensure all dependencies are installed by running the `deps` step first:
```bash
./scripts/build-linux.sh deps    # Linux
./scripts/build-macos.sh deps    # macOS
```

## License

The build scripts in this repository are provided under the [MIT License](LICENSE). Wagic itself is licensed under the [BSD License](https://github.com/WagicProject/wagic/blob/master/LICENSE).