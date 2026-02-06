#include <psp2/ctrl.h>
#include <psp2/display.h>
#include <psp2/kernel/processmgr.h>
#include <psp2/kernel/threadmgr.h>
#include <psp2/types.h>
#include <string.h>
#include <stdio.h>

extern "C" {
    int _newlib_heap_size_user = 192 * 1024 * 1024;
}

// Simple function to display a message
// This is a minimal implementation - a full port would have proper graphics
void displayMessage() {
    // In a real implementation, this would use libvita2d or similar
    // For this proof-of-concept, we just run and can be verified to work
    // by checking it doesn't crash on launch
    
    sceKernelDelayThread(100000); // 100ms delay to ensure proper initialization
}

int main(int argc, char *argv[]) {
    SceCtrlData pad;
    int running = 1;
    
    // Initialize controller
    sceCtrlSetSamplingMode(SCE_CTRL_MODE_ANALOG);
    
    displayMessage();
    
    // Main loop - wait for X button to exit
    // In a full implementation, this would render the game
    while (running) {
        // Read controller
        sceCtrlPeekBufferPositive(0, &pad, 1);
        
        // Exit on X button (wait 3 seconds for demonstration)
        if (pad.buttons & SCE_CTRL_CROSS) {
            // In a full port, this would show the game menu/exit dialog
            running = 0;
        }
        
        // Wait for next frame
        sceDisplayWaitVblankStart();
    }
    
    // Clean exit
    sceKernelExitProcess(0);
    return 0;
}
