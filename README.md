# Shelly Impulse Relay Control Script

This repository contains a custom script for **Shelly 3rd generation or newer devices with scripting support**, designed to integrate with existing **impulse (step-by-step) relays**. The primary goal is to enable smart control via the Shelly app while preserving the manual override functionality of physical buttons and ensuring a failsafe mechanism in case of Shelly device failure.

## Project Overview

The script allows a compatible Shelly device to manage impulse relays, offering both app-based control and maintaining the functionality of traditional physical switches. This setup ensures redundancy and reliability in a home or industrial automation environment.

### Key Features:
- **Hybrid Control:** Seamlessly integrates app control with existing physical impulse switches.
- **Failsafe Mechanism:** Physical switches remain functional even if the Shelly device is offline or malfunctions.
- **State Synchronization:** The script synchronizes the state of virtual switches in the Shelly app with the actual state of the physical relays, providing accurate feedback.
- **Flexible Channel Configuration:** Easily enable or disable the impulse relay logic for specific channels directly within the script.

## Architecture and Wiring (Hybrid "Pro" Solution)

The chosen architecture (Option C from the technical summary) provides the best of both worlds:

-   **Command:** Shelly Output (O1) and physical buttons are both connected in parallel to the relay coil (A1/A2).
-   **Status:** Shelly Input (S1) is connected to the power output of the relay (the wire going to the light bulb) to read the real state.

This setup ensures:
-   Redundancy of physical buttons.
-   Failsafe operation from the control panel.
-   Synchronized status display in the Shelly app.

### Critical Requirements for Wiring:
-   "Auto-OFF" must be configured on the Shelly output (O1) to send a brief impulse to the relay coil.
-   "Detached Mode" must be configured on the Shelly input (S1).

## Setup and Configuration

To use this script, you need a **Shelly 3rd generation or newer device with scripting support** (e.g., Shelly Pro 4PM, or other models that support scripting) and **compatible impulse (step-by-step) relays** (e.g., Siemens 5TT4102-0). Please consult your device's documentation to confirm scripting capabilities and relay compatibility.

### Shelly Device Prerequisites:
1.  **Virtual Booleans:** Create 4 "Virtual Boolean" components on your compatible Shelly device (e.g., Shelly Pro 4PM) with IDs 200, 201, 202, 203. These act as the user interface (ON/OFF buttons) for each channel in the Shelly app.
2.  **Detached Mode:** Configure physical channels (0-3) in "Detached Mode". This ensures the Shelly's internal switch logic doesn't interfere with the impulse relay.
3.  **Toggle Switch Input:** Set inputs (0-3) to "Toggle Switch".
4.  **Auto-OFF:** Configure outputs (0-3) with "Auto-OFF" set to 0.5 seconds. This provides the necessary impulse to trigger the relays.

### Script Configuration (`shelly_relay_script.js`):

The script includes a `CHANNELS_TO_RUN` configuration map. Set `true` for channels (ID 0, 1, 2, 3) you want the script to manage as impulse relays. Set `false` to ignore them, allowing them to be managed as normal relays.

```javascript
let CHANNELS_TO_RUN = {
  0: true,  // Channel 1
  1: true,  // Channel 2
  2: true,  // Channel 3
  3: false  // Channel 4 (set to 'false' for a contactor, for example)
};
```

## Installation

1.  **Upload the script:** Upload the `shelly_relay_script.js` file to your compatible Shelly device via its web interface.
2.  **Enable Scripting:** Ensure scripting is enabled on your Shelly device.
3.  **Apply Prerequisites:** Configure the Shelly device according to the "Shelly Device Prerequisites" section above.
4.  **Wiring:** Connect your compatible Shelly device to the impulse relays and physical buttons as described in the "Architecture and Wiring" section.

## Development Notes

The script is written in a JavaScript-like language specific to Shelly devices. It uses a global status handler to react to changes from both physical inputs and virtual boolean switches (from the app). A locking mechanism (`gLocks`) is implemented to prevent race conditions during state changes.

## File Structure

-   `shelly_relay_script.js`: The main script for the Shelly device.
-   `README.md`: This file, providing an overview and instructions.
