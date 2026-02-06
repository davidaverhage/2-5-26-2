cmake_minimum_required(VERSION 3.19)

# Set VitaSDK toolchain
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    if(DEFINED ENV{VITASDK})
        set(CMAKE_TOOLCHAIN_FILE "$ENV{VITASDK}/share/vita.toolchain.cmake" CACHE PATH "toolchain file")
    else()
        message(FATAL_ERROR "Please define VITASDK to point to your SDK path!")
    endif()
endif()

project(wagic)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 11)

# Include VitaSDK modules
include("$ENV{VITASDK}/share/vita.cmake" REQUIRED)

# Set title info
set(VITA_APP_NAME "Wagic")
set(VITA_TITLEID  "WAGIC00001")
set(VITA_VERSION  "01.00")

# Paths
set(WAGIC_ROOT "${CMAKE_SOURCE_DIR}/../wagic-upstream")
set(MTG_SRC "${WAGIC_ROOT}/projects/mtg/src")
set(JGE_SRC "${WAGIC_ROOT}/JGE/src")
set(JGE_INC "${WAGIC_ROOT}/JGE/include")
set(JGE_DEP "${WAGIC_ROOT}/JGE/Dependencies")

# Include directories
include_directories(
    "${WAGIC_ROOT}/projects/mtg/include"
    "${JGE_INC}"
    "${JGE_SRC}"
    "${JGE_DEP}/include"
    "$ENV{VITASDK}/arm-vita-eabi/include/SDL"
    "$ENV{VITASDK}/arm-vita-eabi/include/freetype2"
)

# Collect MTG source files
file(GLOB_RECURSE MTG_SOURCES "${MTG_SRC}/*.cpp")

# Collect JGE source files (excluding platform-specific files)
file(GLOB JGE_SOURCES 
    "${JGE_SRC}/*.cpp"
    "${JGE_SRC}/tinyxml/*.cpp"
    "${JGE_SRC}/zipFS/*.cpp"
    "${JGE_SRC}/pc/JGfx.cpp"
    "${JGE_SRC}/pc/JSfx.cpp"
)

# Exclude unwanted files
list(FILTER JGE_SOURCES EXCLUDE REGEX ".*/(winmain|Xmain|main)\\.cpp$")
list(FILTER JGE_SOURCES EXCLUDE REGEX ".*/qt/.*")
list(FILTER JGE_SOURCES EXCLUDE REGEX ".*/iOS/.*")
list(FILTER JGE_SOURCES EXCLUDE REGEX ".*/android/.*")
list(FILTER JGE_SOURCES EXCLUDE REGEX ".*/psp/.*")
list(FILTER JGE_SOURCES EXCLUDE REGEX ".*/winphone/.*")

# Collect codec sources from Dependencies
file(GLOB LIBPNG_SOURCES "${JGE_DEP}/libpng/*.c")
file(GLOB LIBJPEG_SOURCES "${JGE_DEP}/libjpeg/*.c")

# Exclude example/test files from codec sources
list(FILTER LIBPNG_SOURCES EXCLUDE REGEX ".*/(example|pngtest)\\.c$")
list(FILTER LIBJPEG_SOURCES EXCLUDE REGEX ".*/(example|jpegtran|cjpeg|djpeg|rdjpgcom|wrjpgcom)\\.c$")

# Create executable target
add_executable(wagic
    ${MTG_SOURCES}
    ${JGE_SOURCES}
    ${LIBPNG_SOURCES}
    ${LIBJPEG_SOURCES}
)

# Link libraries
target_link_libraries(wagic
    SDL
    vita2d
    vitagl
    vitaGL
    vitashark
    SceShaccCgExt
    taihen_stub
    freetype
    png
    jpeg
    z
    m
    SceDisplay_stub
    SceGxm_stub
    SceCtrl_stub
    SceTouch_stub
    SceAudio_stub
    SceAudioIn_stub
    SceSysmodule_stub
    SceCommonDialog_stub
    ScePgf_stub
    SceAppMgr_stub
    SceAppUtil_stub
    ScePower_stub
    SceIofilemgr_stub
    SceKernelModulemgr_stub
    SceHid_stub
    SceMotion_stub
)

# Compile definitions
target_compile_definitions(wagic PRIVATE
    PSP
    _PSP
)

# Create Vita executable
vita_create_self(wagic.self wagic)

# Create ELF
add_custom_target(wagic.elf ALL
    DEPENDS wagic
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:wagic> ${CMAKE_BINARY_DIR}/wagic.elf
)
