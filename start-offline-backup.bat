@echo off
title ChillBill Retail POS - Offline Emergency Terminal
cd /d "%~dp0"
echo ===================================================
echo   CHILLBILL RETAIL OS - 100%% OFFLINE LOCAL RUNTIME
echo ===================================================
echo   Status: Starting Local Store Counter Engine...
echo   Network: Independent of Internet / Cloud
echo   Data: Local Persistent Storage Safe
echo ===================================================
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
npm run dev
pause
