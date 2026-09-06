@echo off
title VocaAI Studio - Agora Voice AI Assistant
echo =======================================================
echo   Starting VocaAI Studio
echo   Real-Time Multilingual Voice AI Assistant (Agora ConvoAI)
echo =======================================================
echo.

cd /d "%~dp0server"

echo [1/2] Checking dependencies...
if not exist "node_modules\" (
    echo Installing server dependencies...
    call npm install
)

echo.
echo [2/2] Launching VocaAI Studio Server on http://127.0.0.1:5000...
start http://127.0.0.1:5000
call npm start
pause
