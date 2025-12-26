@echo off
REM Lavalink Startup Script - Double-click to run
REM This script finds and runs the Lavalink JAR file

title Lavalink Server
color 0A

echo.
echo ========================================
echo    Starting Lavalink Server...
echo ========================================
echo.

REM Get the directory where this batch file is located
cd /d "%~dp0"

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not installed or not in PATH!
    echo.
    echo Please install Java 17 or higher from:
    echo https://adoptium.net/
    echo.
    pause
    exit /b 1
)

echo [OK] Java found
echo.

REM Try to find Lavalink JAR file
set JAR_FILE=

if exist "Lavalink.jar" (
    set JAR_FILE=Lavalink.jar
) else if exist "lavalink.jar" (
    set JAR_FILE=lavalink.jar
) else (
    REM Try to find any JAR file starting with Lavalink
    for %%f in (Lavalink-*.jar) do (
        set JAR_FILE=%%f
        goto :found
    )
)

:found
if "%JAR_FILE%"=="" (
    echo [ERROR] Lavalink JAR file not found!
    echo.
    echo Looking for: Lavalink.jar, lavalink.jar, or Lavalink-*.jar
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)

echo [OK] Found Lavalink: %JAR_FILE%
echo.
echo ========================================
echo Starting Lavalink on port 3009...
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Run Lavalink
java -jar "%JAR_FILE%"

REM If we get here, the server stopped
echo.
echo Lavalink server has stopped.
pause
