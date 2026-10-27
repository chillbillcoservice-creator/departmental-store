@echo off
title Departmental Store App
cd /d "%~dp0"
echo Starting Dev Server...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
npm run dev
