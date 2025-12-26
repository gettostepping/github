@echo off
REM Batch file wrapper to run Lavalink PowerShell script
REM This allows double-clicking to run Lavalink

cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "%~dp0run-lavalink.ps1"
pause

