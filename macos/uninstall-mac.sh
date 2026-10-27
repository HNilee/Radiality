#!/bin/bash

# ==========================================================
#             RADIALITY UNINSTALLER FOR MACOS
# ==========================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BLUE}${BOLD}======================================================${NC}"
echo -e "${BLUE}${BOLD}           RADIALITY MACOS UNINSTALLER                ${NC}"
echo -e "${BLUE}${BOLD}======================================================${NC}"
echo ""

read -p "Are you sure you want to uninstall Radiality from your Mac? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo -e "\nUninstallation cancelled.\n"
  exit 0
fi

echo ""
echo "Closing running Radiality processes..."
pkill -f Radiality 2>/dev/null || true

# Remove Application Bundle
APP_PATH="/Applications/Radiality.app"
if [ -d "$APP_PATH" ]; then
  rm -rf "$APP_PATH"
  echo -e "${GREEN}✓ Removed ${APP_PATH}${NC}"
fi

# Remove Desktop alias if exists
DESKTOP_ALIAS="${HOME}/Desktop/Radiality.app"
if [ -e "$DESKTOP_ALIAS" ] || [ -L "$DESKTOP_ALIAS" ]; then
  rm -f "$DESKTOP_ALIAS"
  echo -e "${GREEN}✓ Removed Desktop alias${NC}"
fi

# Ask if user wants to remove settings and configurations
read -p "Do you also want to remove your custom settings and shortcut data? [y/N]: " remove_data
if [[ "$remove_data" =~ ^[Yy]$ ]]; then
  rm -rf "${HOME}/Library/Application Support/Radiality" 2>/dev/null || true
  rm -rf "${HOME}/Library/Application Support/radiality" 2>/dev/null || true
  rm -rf "${HOME}/Library/Preferences/com.radiality.app.plist" 2>/dev/null || true
  echo -e "${GREEN}✓ User preferences and configuration removed.${NC}"
fi

echo ""
echo -e "${GREEN}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD}     Radiality has been successfully uninstalled.     ${NC}"
echo -e "${GREEN}${BOLD}======================================================${NC}\n"
