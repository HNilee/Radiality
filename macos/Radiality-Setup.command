#!/bin/bash
# Radiality macOS Installer Launcher
cd "$(dirname "$0")"
chmod +x "./install-mac.sh" 2>/dev/null || true
exec "./install-mac.sh"
