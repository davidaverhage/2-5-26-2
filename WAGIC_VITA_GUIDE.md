# Wagic the Homebrew for PS Vita

## Overview
This guide explains how to run Wagic the Homebrew (v0.25.5) on PlayStation Vita.

## Important Note
**Wagic does not have a native PS Vita port.** The game was originally developed for PSP and other platforms. To run Wagic on PS Vita, you must use **Adrenaline**, which is a PSP emulator for PS Vita.

## What's Included
This repository contains:
- WagicPSP-0255.zip - The official PSP build from https://github.com/WagicProject/wagic/releases/tag/wagic-v0.25.5
- WTH/ - Extracted PSP game files including EBOOT.PBP

## How to Run Wagic on PS Vita

### Prerequisites
1. A hacked PS Vita running custom firmware (HENkaku, h-encore², or Trinity)
2. Adrenaline installed on your Vita (download from https://github.com/TheOfficialFloW/Adrenaline/releases)
3. VitaShell installed for file transfer

### Installation Steps

1. **Install Adrenaline** (if not already installed):
   - Download the latest Adrenaline VPK
   - Install it using VitaShell
   - Run Adrenaline at least once to set up the PSP environment

2. **Transfer Wagic Files**:
   - Connect your Vita to your computer via USB or FTP
   - Navigate to `ux0:/pspemu/PSP/GAME/`
   - Create a new folder called `WAGIC/`
   - Copy the contents of the `WTH/` folder (EBOOT.PBP, Res/, exception.prx) into `ux0:/pspemu/PSP/GAME/WAGIC/`

3. **Launch Wagic**:
   - Open Adrenaline on your Vita
   - Navigate to Game → Memory Stick
   - You should see "Wagic the Homebrew"
   - Select it and press X to launch

### Creating a LiveArea Bubble (Optional)

For easier access, you can create a LiveArea bubble using **Adrenaline Bubble Manager**:

1. Install Adrenaline Bubble Manager from https://github.com/ONElua/AdrenalineBubbleManager/releases
2. Launch Adrenaline Bubble Manager
3. Select Wagic from the list of PSP games
4. Customize the bubble appearance if desired
5. Create the bubble
6. You can now launch Wagic directly from your LiveArea without opening Adrenaline first

## About Native Vita VPK

Creating a true native PS Vita VPK would require:
- Porting the C++ source code to work with VitaSDK
- Rewriting graphics code for PS Vita's GPU
- Adapting input handling for Vita controls
- Recompiling with vita-elf-create and packaging with VitaSDK tools
- Extensive testing and debugging

This is a significant development effort that goes beyond simply packaging files.

## Game Features
Wagic v0.25.5 includes:
- Tarkir: Dragonstorm (TDM) card set
- Tarkir: Dragonstorm Commander (TDC)
- Ugin's Fate (UGIN) cards
- Thousands of Magic: The Gathering cards
- AI opponents with multiple difficulty levels
- Customizable decks and rules
- Story mode and shop system

## Credits
- Wagic the Homebrew: https://github.com/WagicProject/wagic
- Adrenaline by TheOfficialFloW: https://github.com/TheOfficialFloW/Adrenaline
- This is an open-source project. The original company no longer exists.

## License
Wagic is licensed under the BSD License. See the LICENSE file in the wagic-source directory.
