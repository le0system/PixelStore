@echo off
setlocal
cd /d "%~dp0backend"
echo ==========================================
echo    PIXEL STORE - API NODE.JS + SQLITE
 echo ==========================================
node --version
npm start
pause
