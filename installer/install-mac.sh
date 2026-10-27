#!/bin/bash

# ==========================================================
#              RADIALITY INSTALLER FOR MACOS
# ==========================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}${BOLD}======================================================${NC}"
echo -e "${BLUE}${BOLD}            RADIALITY MACOS INSTALLER                 ${NC}"
echo -e "${BLUE}${BOLD}   Customizable Radial Menu Toolbar for Mac           ${NC}"
echo -e "${BLUE}${BOLD}======================================================${NC}"
echo ""

# STEP 1: TERMS AND CONDITIONS
echo -e "${BOLD}--- STEP 1: TERMS OF AGREEMENT ---${NC}"
echo "Radiality is licensed for personal & commercial use on macOS."
echo "• 100% local execution with ZERO telemetry and ZERO tracking."
echo "• Provided 'AS IS' without warranty of any kind."
echo ""

read -p "Do you accept the Terms of Agreement? [Y/n]: " accept_toc
accept_toc=${accept_toc:-Y}
if [[ ! "$accept_toc" =~ ^[Yy]$ ]]; then
  echo -e "\n${RED}Installation aborted by user.${NC}\n"
  exit 0
fi

# STEP 2: INSTALLATION DIRECTORY
echo ""
echo -e "${BOLD}--- STEP 2: DESTINATION DIRECTORY ---${NC}"
DEFAULT_DIR="/Applications/Radiality.app"

read -p "Install to default location [${DEFAULT_DIR}]? [Y/n]: " use_default
use_default=${use_default:-Y}

if [[ "$use_default" =~ ^[Yy]$ ]]; then
  TARGET_DIR="$DEFAULT_DIR"
else
  read -p "Enter full custom destination path: " custom_dir
  if [[ -z "$custom_dir" ]]; then
    echo -e "${RED}Path cannot be empty. Aborted.${NC}"
    exit 1
  fi
  TARGET_DIR="$custom_dir"
fi

echo -e "\nTarget location: ${GREEN}${TARGET_DIR}${NC}"

# STEP 3: LOCATE OR BUILD APP
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SOURCE_APP=""

if [ -d "${ROOT_DIR}/release/mac/Radiality.app" ]; then
  SOURCE_APP="${ROOT_DIR}/release/mac/Radiality.app"
elif [ -d "${ROOT_DIR}/release/mac-arm64/Radiality.app" ]; then
  SOURCE_APP="${ROOT_DIR}/release/mac-arm64/Radiality.app"
elif [ -d "${ROOT_DIR}/release/mac-x64/Radiality.app" ]; then
  SOURCE_APP="${ROOT_DIR}/release/mac-x64/Radiality.app"
fi

if [ -z "$SOURCE_APP" ]; then
  echo ""
  echo -e "${YELLOW}Building Radiality for macOS...${NC}"
  cd "${ROOT_DIR}"
  npm install
  npm run build
  npx electron-builder --mac dir
  SOURCE_APP="${ROOT_DIR}/release/mac/Radiality.app"
fi

if [ ! -d "$SOURCE_APP" ]; then
  echo -e "${RED}Error: Radiality.app package could not be found.${NC}"
  exit 1
fi

echo ""
echo -e "${BOLD}--- STEP 3: INSTALLING RADIALITY ---${NC}"
echo "Copying files to ${TARGET_DIR}..."

# If previous version exists, remove it
if [ -d "$TARGET_DIR" ]; then
  rm -rf "$TARGET_DIR"
fi

cp -R "$SOURCE_APP" "$TARGET_DIR"

# Clear Gatekeeper quarantine flag so macOS allows running
xattr -cr "$TARGET_DIR" 2>/dev/null || true
chmod -R 755 "$TARGET_DIR"

echo -e "${GREEN}✓ Successfully installed to ${TARGET_DIR}${NC}"

# STEP 4: OPTIONS
echo ""
echo -e "${BOLD}--- FINISHING SETUP ---${NC}"
read -p "Create a Desktop shortcut? [Y/n]: " make_shortcut
make_shortcut=${make_shortcut:-Y}

if [[ "$make_shortcut" =~ ^[Yy]$ ]]; then
  DESKTOP_DIR="${HOME}/Desktop"
  ln -sf "$TARGET_DIR" "${DESKTOP_DIR}/Radiality.app"
  echo -e "${GREEN}✓ Desktop alias created at ${DESKTOP_DIR}/Radiality.app${NC}"
fi

read -p "Launch Radiality now? [Y/n]: " launch_now
launch_now=${launch_now:-Y}

if [[ "$launch_now" =~ ^[Yy]$ ]]; then
  open "$TARGET_DIR"
  echo -e "${GREEN}✓ Radiality launched.${NC}"
fi

echo ""
echo -e "${BLUE}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD}           RADIALITY INSTALLATION COMPLETE!           ${NC}"
echo -e "${BLUE}${BOLD}======================================================${NC}"
echo "Trigger Shortcut: [⌥ Option + Space]"
echo "To uninstall later, run: ./installer/uninstall-mac.sh"
echo -e "${BLUE}${BOLD}======================================================${NC}\n"
