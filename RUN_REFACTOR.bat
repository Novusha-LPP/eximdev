@echo off
cd /d "%~dp0"
echo.
echo ==========================================
echo Attendance Module Refactoring
echo ==========================================
echo.
node refactor-attendance.mjs
echo.
echo ==========================================
echo Refactoring Complete!
echo ==========================================
echo.
pause
