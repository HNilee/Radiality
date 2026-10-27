#!/bin/bash
# Radiality macOS Uninstaller Launcher
cd "$(dirname "$0")"
chmod +x "./uninstall-mac.sh" 2>/dev/null || true
exec "./uninstall-mac.sh"
