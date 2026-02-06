###############################################################################
# CMakeLists.txt – Build Wagic for PS Vita and produce a .vpk
#
# Usage (inside a VitaSDK environment):
#   mkdir build && cd build
#   cmake .. -DCMAKE_TOOLCHAIN_FILE=$VITASDK/share/vita.toolchain.cmake \
#            -DWAGIC_SRC=/path/to/wagic
#   make
#
# The resulting wagic_vita.vpk can be installed on a PS Vita with HENkaku.
###############################################################################
cmake_minimum_required(VERSION 3.16)

# ---------- toolchain fallback ----------
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    if(DEFINED ENV{VITASDK})
        set(CMAKE_TOOLCHAIN_FILE
            "$ENV{VITASDK}/share/vita.toolchain.cmake"
            CACHE PATH "Vita toolchain file")
    else()
        message(FATAL_ERROR
            "Please define VITASDK to point to your SDK path!")
    endif()
endif()

project(wagic_vita C CXX)

include("${VITASDK}/share/vita.cmake" REQUIRED)

# ---------- Application meta-data ----------
set(VITA_APP_NAME   "Wagic")
set(VITA_TITLEID    "WAGIC0001")
set(VITA_VERSION    "01.00")
set(VITA_MKSFOEX_FLAGS "${VITA_MKSFOEX_FLAGS} -d PARENTAL_LEVEL=1")

# ---------- Wagic source root (pass -DWAGIC_SRC=…) ----------
if(NOT DEFINED WAGIC_SRC)
    # Default: assume we are inside wagic/projects/mtg/vita/
    get_filename_component(WAGIC_SRC "${CMAKE_CURRENT_SOURCE_DIR}/../../.." ABSOLUTE)
endif()

set(JGE_DIR   "${WAGIC_SRC}/JGE")
set(MTG_DIR   "${WAGIC_SRC}/projects/mtg")
set(BOOST_DIR "${WAGIC_SRC}/Boost")

# ---------- Include paths ----------
include_directories(
    ${JGE_DIR}/include
    ${JGE_DIR}/src
    ${JGE_DIR}/src/zipFS
    ${MTG_DIR}/include
    ${BOOST_DIR}
)

# ---------- Compiler flags ----------
add_definitions(
    -DVITA
    -DTIXML_USE_STL
    -DUSE_PRECOMPILED_HEADERS=0
)

set(CMAKE_C_FLAGS   "${CMAKE_C_FLAGS}   -O2 -Wall -Wno-unused -Wno-deprecated-declarations")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2 -Wall -Wno-unused -Wno-deprecated-declarations -std=c++11")

###############################################################################
# JGE engine sources (platform-independent subset)
###############################################################################
file(GLOB JGE_CORE_SRC
    ${JGE_DIR}/src/JGE.cpp
    ${JGE_DIR}/src/JGfx.cpp
    ${JGE_DIR}/src/JAnimator.cpp
    ${JGE_DIR}/src/JApp.cpp
    ${JGE_DIR}/src/JAudio.cpp
    ${JGE_DIR}/src/JDistortionMesh.cpp
    ${JGE_DIR}/src/JFileSystem.cpp
    ${JGE_DIR}/src/JGBKFont.cpp
    ${JGE_DIR}/src/JGameObject.cpp
    ${JGE_DIR}/src/JGui.cpp
    ${JGE_DIR}/src/JLBFont.cpp
    ${JGE_DIR}/src/JLogger.cpp
    ${JGE_DIR}/src/JMD2Model.cpp
    ${JGE_DIR}/src/JOBJModel.cpp
    ${JGE_DIR}/src/JParticle.cpp
    ${JGE_DIR}/src/JParticleEffect.cpp
    ${JGE_DIR}/src/JParticleEmitter.cpp
    ${JGE_DIR}/src/JParticleSystem.cpp
    ${JGE_DIR}/src/JResourceManager.cpp
    ${JGE_DIR}/src/JSfx.cpp
    ${JGE_DIR}/src/JSpline.cpp
    ${JGE_DIR}/src/JSprite.cpp
    ${JGE_DIR}/src/JTTFont.cpp
    ${JGE_DIR}/src/Vector2D.cpp
    ${JGE_DIR}/src/Encoding.cpp
    ${JGE_DIR}/src/Downloader.cpp
    ${JGE_DIR}/src/JNetwork.cpp
    ${JGE_DIR}/src/JSocket.cpp
)

# TinyXML (bundled)
file(GLOB JGE_TINYXML_SRC ${JGE_DIR}/src/tinyxml/*.cpp)

# zipFS / unzip helpers
file(GLOB JGE_ZIPFS_SRC
    ${JGE_DIR}/src/zipFS/*.c
    ${JGE_DIR}/src/zipFS/*.cpp
)

# HGE helpers
file(GLOB JGE_HGE_SRC ${JGE_DIR}/src/hge/*.cpp)

###############################################################################
# Wagic MTG game sources
###############################################################################
file(GLOB MTG_SRC ${MTG_DIR}/src/*.cpp)

###############################################################################
# Build the executable
###############################################################################
add_executable(${PROJECT_NAME}
    ${JGE_CORE_SRC}
    ${JGE_TINYXML_SRC}
    ${JGE_ZIPFS_SRC}
    ${JGE_HGE_SRC}
    ${MTG_SRC}
)

target_link_libraries(${PROJECT_NAME}
    # Vita system stubs
    SceDisplay_stub
    SceCtrl_stub
    SceTouch_stub
    SceAudio_stub
    SceGxm_stub
    SceSysmodule_stub
    SceCommonDialog_stub
    SceAppMgr_stub
    SceLibKernel_stub
    ScePower_stub
    SceIofilemgr_stub
    SceNet_stub
    SceNetCtl_stub
    SceHttp_stub
    SceSsl_stub
    # Third-party libraries (provided by VitaSDK packages)
    vita2d
    freetype
    png
    jpeg
    z
    m
    stdc++
    pthread
)

###############################################################################
# Create .self and .vpk
###############################################################################
vita_create_self(${PROJECT_NAME}.self ${PROJECT_NAME})

vita_create_vpk(${PROJECT_NAME}.vpk ${VITA_TITLEID} ${PROJECT_NAME}.self
    VERSION ${VITA_VERSION}
    NAME    ${VITA_APP_NAME}
)
