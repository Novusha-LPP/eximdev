@echo off
cd /d "%~dp0"
echo ========================================
echo Running All Seeders
echo ========================================
echo.

echo [1/2] Seeding Companies and Shifts...
node seed_companies_and_shifts.mjs
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Company seeder failed!
    pause
    exit /b 1
)
echo.

echo [2/2] Seeding Test Attendance Data...
node seed_attendance_test_data.mjs
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Test data seeder failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo All seeders completed successfully!
echo ========================================
pause
