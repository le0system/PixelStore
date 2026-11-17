@echo off
setlocal
cd /d "%~dp0frontend"
echo ==========================================
echo    PIXEL STORE - ANGULAR
 echo ==========================================
if not exist "node_modules" (
    echo Instalando as dependencias Angular pela primeira vez...
    call npm install
    if errorlevel 1 (
        echo Falha no npm install. Confira internet e versao do Node.js.
        pause
        exit /b 1
    )
)
call npm start
pause
