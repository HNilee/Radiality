# Radiality

Radiality is an open-source, high-performance radial launcher and desktop toolbar for **Windows** and **macOS**. Inspired by Apple's human interface principles and fluid physics-based animation systems, Radiality provides an intuitive, distraction-free way to navigate your desktop, launch applications, and inspect folder hierarchies in a single fluid gesture.

---

## About Radiality

Traditional desktop interfaces often clutter workspaces with sprawling shortcuts or nested menus that disrupt focus. Radiality re-imagines quick-launch ergonomics through a circular, radial design:

- **Circular Muscle Memory:** Unlike linear taskbars, every action item in a radial menu is equidistant from the cursor. This minimizes pointer movement and builds rapid muscle memory.
- **Deep Folder Inspection (Sub-Arc Branching):** Hovering over any folder shortcut automatically sprouts an outer radial arc revealing the folder's live contents without opening a separate file explorer window.
- **Native Fidelity:** Radiality extracts authentic high-resolution icons embedded directly in executables, application bundles, documents, and media files.
- **Privacy & Local Execution:** Radiality is 100% free and open-source software (FOSS). It runs completely locally on your machine with zero telemetry, zero background trackers, and zero cloud dependencies.

---

## Repository Structure

Platform installers are cleanly separated into dedicated folders:

```text
Radiality/
├── windows/
│   ├── Radiality-Setup.exe          # Standard Windows GUI Installer
│   ├── Radiality-Uninstall.exe      # Standard Windows GUI Uninstaller
│   ├── Start-Radiality.bat          # Portable Launcher
│   ├── uninstall-windows.bat        # Batch Uninstaller Script
│   └── build/                       # Windows C# Setup Source Files
│
├── macos/
│   ├── Radiality-Setup.command      # macOS Double-Click Installer
│   ├── Radiality-Uninstall.command  # macOS Double-Click Uninstaller
│   ├── install-mac.sh               # macOS Installation Shell Script
│   └── uninstall-mac.sh             # macOS Removal Shell Script
│
└── bin/
    └── cli.js                       # Cross-Platform CLI Installer (npx radiality)
```

---

## Installation Guide

Radiality offers four installation methods: two for Windows and two for macOS. You can choose between a standard graphical installer or a command-line interface (CLI) in your terminal.

| Platform | Standard GUI Installer | Terminal / CLI Installer |
| :--- | :--- | :--- |
| **Windows** | `windows/Radiality-Setup.exe` | `npx radiality` |
| **macOS** | `macos/Radiality-Setup.command` | `npx radiality` |

---

### Windows Installation

#### Method 1: Standard Setup Wizard (GUI)
1. Navigate to the `windows/` folder and double-click `Radiality-Setup.exe`.
2. The Setup Wizard will guide you through:
   - Terms and license review.
   - Destination selection (defaults to `C:\Program Files\Radiality` with custom directory option).
   - Real-time file extraction progress.
   - Optional Desktop shortcut creation and instant launch.
3. Radiality will automatically be registered in **Windows Settings > Installed apps**.

#### Method 2: Terminal / CLI
Open Command Prompt, PowerShell, or Windows Terminal, and execute:
```bash
npx radiality
```
*(Alternatively, from inside this cloned repository: `npm run install:cli`)*

The interactive CLI installer prompts you for:
- Terms of Agreement acceptance `(Y/n)`
- Default installation directory confirmation `(Y/n)` or custom path entry
- Visual ASCII progress bar for extraction
- Desktop shortcut creation `(Y/n)`
- Instant application launch `(Y/n)`

---

### macOS Installation

#### Method 1: Standard Launcher (Double-Click)
1. In macOS Finder, navigate to the `macos/` folder and double-click `Radiality-Setup.command`.
2. A terminal window will open and perform the installation automatically:
   - Verifies the Terms of Agreement.
   - Copies the application bundle to `/Applications/Radiality.app`.
   - Clears Gatekeeper quarantine flags (`xattr -cr`).
   - Creates a Desktop alias and launches the application.

#### Method 2: Terminal / CLI
Open macOS Terminal and run:
```bash
npx radiality
```
*(Alternatively, from inside this cloned repository: `npm run install:cli`)*

The CLI steps match the Windows CLI experience, deploying natively to `/Applications/Radiality.app`.

---

## Uninstallation

To completely remove Radiality and its associated shortcuts:

### Windows
- **GUI:** Run `windows/Radiality-Uninstall.exe` or uninstall via **Windows Settings > Installed apps**.
- **CLI:** Run `npx radiality --uninstall`

### macOS
- **GUI:** Double-click `macos/Radiality-Uninstall.command`.
- **CLI:** Run `npx radiality --uninstall`

---

## Default Hotkeys

| Platform | Summon Radiality | Close / Dismiss |
| :--- | :--- | :--- |
| **Windows** | `Alt + Space` | `Esc` or Click Outside |
| **macOS** | `Option + Space` (`⌥ Space`) | `Esc` or Click Outside |

*Hotkeys can be customized or reset anytime in **Radiality Preferences**.*

---

## Features

- **Fluid Spring Physics:** Built with Framer Motion and hardware-accelerated transforms for instantaneous responsiveness.
- **Folder Branching:** Direct hover access to sub-files and directories with anti-flicker threshold protection.
- **Custom Per-Icon Color Picker:** Integrated Apple-inspired color swatches with full HEX input support.
- **Original Icon Extraction:** Automatic detection of native application icons without generic placeholders.
- **Maximum 8 Shortcuts per Wheel:** Carefully calibrated radius and angular distribution for optimal ergonomics.
- **Auto-Dismiss Protection:** Smooth exit transition when clicking outside the menu area.

---

## Development & Building from Source

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/HNilee/Radiality.git
cd Radiality

# Install dependencies
npm install

# Start local development server with Electron
npm start

# Build web frontend and generate Windows unpacked distribution
npm run dist

# Package macOS application (.app, .dmg, .zip)
npm run dist:mac
```

---

## License

This project is open-source under the MIT License. See the LICENSE file for details.
