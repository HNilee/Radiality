@echo off
title Radiality Toolbar
cd /d "%~dp0"

if exist "release\win-unpacked\Radiality.exe" (
    start "" "release\win-unpacked\Radiality.exe"
    exit
)

echo Starting Radiality in Electron mode...
npx electron .
