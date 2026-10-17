@echo off
rem Noeti Boards: start the local server and open the app window.
cd /d "%~dp0"
where py >nul 2>nul && (start "" /min py -3 scripts\serve.py & exit /b)
where python >nul 2>nul && (start "" /min python scripts\serve.py & exit /b)
echo Noeti Boards needs Python 3 (python.org or the Microsoft Store). Press a key to close.
pause >nul
