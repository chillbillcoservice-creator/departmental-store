@echo off
title ChillBill POS - Developer License Manager
color 0F
mode con: cols=85 lines=34
cd /d "%~dp0"
cls
node scripts\license-cli.mjs
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [Error] License Manager exited with code %ERRORLEVEL%.
  pause
)
