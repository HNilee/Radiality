#!/bin/bash
# Radiality macOS Uninstaller Launcher
cd "$(dirname "$0")"
chmod +x "./installer/uninstall-mac.sh" 2>/dev/null || true
exec "./installer/uninstall-mac.sh"
