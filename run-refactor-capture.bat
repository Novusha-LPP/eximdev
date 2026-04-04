@echo off
setlocal enabledelayedexpansion
cd /d "C:\Users\india\Desktop\Projects\eximdev"
echo Starting Attendance Module Refactoring...
echo.
node refactor-attendance.mjs > refactor-output.txt 2>&1
echo.
echo Refactoring completed! Output saved to refactor-output.txt
type refactor-output.txt
