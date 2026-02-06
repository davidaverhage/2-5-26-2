#!/usr/bin/env bash
#
# build-macos.sh — Build and run Wagic the Homebrew on macOS
#
# Usage:
#   ./scripts/build-macos.sh          # build + run
#   ./scripts/build-macos.sh build    # build only
#   ./scripts/build-macos.sh run      # run only (must build first)
#   ./scripts/build-macos.sh deps     # install dependencies only
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WAGIC_DIR="$ROOT_DIR/wagic"
BUILD_DIR="$ROOT_DIR/wagic-build"
CORE_URL="https://github.com/WagicProject/wagic/releases/download/wagic-v0.25.5/Wagic-core-0255.zip"
WAGIC_REPO="https://github.com/WagicProject/wagic.git"

info()  { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
ok()    { echo -e "\033[1;32m[OK]\033[0m    $*"; }
err()   { echo -e "\033[1;31m[ERR]\033[0m   $*" >&2; }

install_deps() {
    info "Installing build dependencies via Homebrew..."
    if ! command -v brew &>/dev/null; then
        err "Homebrew not found. Install from https://brew.sh"
        exit 1
    fi
    brew install qt@5 freetype jpeg giflib libpng git git-lfs wget || true
    brew link qt@5 --force 2>/dev/null || true
    ok "Dependencies installed."
}

clone_source() {
    if [ -d "$WAGIC_DIR/.git" ]; then
        info "Wagic source already cloned. Pulling latest..."
        cd "$WAGIC_DIR"
        git pull --ff-only || true
        git lfs pull || true
        cd "$ROOT_DIR"
    else
        info "Cloning Wagic source..."
        git clone --depth 1 "$WAGIC_REPO" "$WAGIC_DIR"
        cd "$WAGIC_DIR"
        git lfs pull || true
        cd "$ROOT_DIR"
    fi
    ok "Source ready at $WAGIC_DIR"
}

build_wagic() {
    clone_source

    info "Building Wagic (Qt GUI release)..."
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    cd "$BUILD_DIR"

    QMAKE_BIN=""
    if command -v qmake &>/dev/null; then
        QMAKE_BIN="qmake"
    elif [ -x "/usr/local/opt/qt@5/bin/qmake" ]; then
        QMAKE_BIN="/usr/local/opt/qt@5/bin/qmake"
    elif [ -x "/opt/homebrew/opt/qt@5/bin/qmake" ]; then
        QMAKE_BIN="/opt/homebrew/opt/qt@5/bin/qmake"
    else
        err "qmake not found. Install Qt5 first (run: $0 deps)"
        exit 1
    fi

    info "Using qmake: $QMAKE_BIN"
    $QMAKE_BIN "$WAGIC_DIR/projects/mtg/wagic-qt.pro" CONFIG+=release CONFIG+=graphics
    make -j"$(sysctl -n hw.ncpu)"
    ok "Build complete."
}

download_core() {
    local RES_DIR="$WAGIC_DIR/projects/mtg/bin/Res"
    if [ -d "$RES_DIR" ] && [ "$(ls -A "$RES_DIR" 2>/dev/null)" ]; then
        info "Resource directory already populated."
        return
    fi

    info "Downloading Wagic core resources..."
    local CORE_ZIP="$ROOT_DIR/Wagic-core.zip"
    if [ ! -f "$CORE_ZIP" ]; then
        wget -q --show-progress -O "$CORE_ZIP" "$CORE_URL"
    fi
    mkdir -p "$RES_DIR"
    unzip -o -q "$CORE_ZIP" -d "$RES_DIR"
    ok "Core resources extracted to $RES_DIR"
}

run_wagic() {
    local BIN="$BUILD_DIR/wagic"
    if [ -d "$BUILD_DIR/wagic.app" ]; then
        BIN="$BUILD_DIR/wagic.app/Contents/MacOS/wagic"
    fi
    if [ ! -x "$BIN" ]; then
        err "Wagic binary not found. Build first: $0 build"
        exit 1
    fi

    download_core

    info "Launching Wagic..."
    cd "$WAGIC_DIR/projects/mtg"
    "$BIN"
}

case "${1:-all}" in
    deps)
        install_deps
        ;;
    build)
        build_wagic
        ;;
    run)
        run_wagic
        ;;
    all)
        install_deps
        build_wagic
        run_wagic
        ;;
    *)
        echo "Usage: $0 {deps|build|run|all}"
        exit 1
        ;;
esac
