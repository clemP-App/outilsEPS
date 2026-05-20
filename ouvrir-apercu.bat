@echo off
cd /d "%~dp0"
echo Demarrage du serveur local Outils EPS...
start "OutilsEPS" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\serve.ps1"
timeout /t 2 /nobreak >nul
start http://localhost:5173/index.html
