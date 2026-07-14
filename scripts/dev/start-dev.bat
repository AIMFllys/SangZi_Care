@echo off
chcp 65001 >nul
setlocal
set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%"
call scripts\dev\dev.bat
exit /b %ERRORLEVEL%
