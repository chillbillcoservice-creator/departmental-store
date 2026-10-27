@echo off
title ChillBill License Manager
cd /d "C:\Users\admin\Desktop\CODING\departmental-store"

:: 1. Start background server if not already running
netstat -ano | findstr 127.0.0.1:54321 >nul
if %ERRORLEVEL% NEQ 0 (
    start "" /min "C:\Program Files\nodejs\node.exe" scripts\license-app-server.mjs
    timeout /t 1 /nobreak >nul
)

:: 2. Launch the desktop app window
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://127.0.0.1:54321" --window-size=1150,800
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://127.0.0.1:54321" --window-size=1150,800
) else (
    start http://127.0.0.1:54321
)

exit
