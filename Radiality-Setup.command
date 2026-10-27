#!/bin/bash
# Radiality macOS Installer Launcher
cd "$(dirname "$0")"
chmod +x "./installer/install-mac.sh" 2>/dev/null || true
exec "./installer/install-mac.sh"
