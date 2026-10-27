@echo off
setlocal
title Radiality Uninstaller
echo ======================================================
echo            RADIALITY UNINSTALLER (WINDOWS)
echo ======================================================
echo.
set /p CONFIRM=Are you sure you want to uninstall Radiality from your PC? (y/n): 
if /i not "%CONFIRM%"=="y" goto cancel

echo.
echo Stopping running Radiality processes...
taskkill /F /IM Radiality.exe 2>nul
taskkill /F /IM RadialMenu.exe 2>nul

echo Removing application files...
if exist "%ProgramFiles%\Radiality" (
    rmdir /S /Q "%ProgramFiles%\Radiality"
    echo [OK] Removed from %ProgramFiles%\Radiality
)
if exist "%LocalAppData%\Programs\Radiality" (
    rmdir /S /Q "%LocalAppData%\Programs\Radiality"
    echo [OK] Removed from %LocalAppData%\Programs\Radiality
)

echo Removing desktop and start menu shortcuts...
if exist "%USERPROFILE%\Desktop\Radiality.lnk" del /F /Q "%USERPROFILE%\Desktop\Radiality.lnk"
if exist "%USERPROFILE%\Desktop\Radial Menu.lnk" del /F /Q "%USERPROFILE%\Desktop\Radial Menu.lnk"
if exist "%PUBLIC%\Desktop\Radiality.lnk" del /F /Q "%PUBLIC%\Desktop\Radiality.lnk"

if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Radiality" (
    rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Radiality"
)
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Radial Menu" (
    rmdir /S /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Radial Menu"
)

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Radiality" /f 2>nul

echo.
echo ======================================================
echo      Radiality has been successfully uninstalled.
echo ======================================================
echo.
pause
exit /b 0

:cancel
echo.
echo Uninstallation cancelled.
pause
