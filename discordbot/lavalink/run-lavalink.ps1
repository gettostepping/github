# Lavalink Startup Script
# This script finds and runs the Lavalink JAR file

Write-Host "Starting Lavalink Server..." -ForegroundColor Cyan
Write-Host ""

# Check if Java is installed
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Java is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Java 17 or higher from https://adoptium.net/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Common Lavalink JAR file names
$jarFiles = @("Lavalink.jar", "lavalink.jar", "Lavalink-*.jar")

$lavalinkJar = $null

# Try to find the Lavalink JAR file
foreach ($pattern in $jarFiles) {
    $found = Get-ChildItem -Path $scriptDir -Filter $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $lavalinkJar = $found.FullName
        break
    }
}

if (-not $lavalinkJar) {
    Write-Host "ERROR: Lavalink JAR file not found!" -ForegroundColor Red
    Write-Host "Looking for: Lavalink.jar, lavalink.jar, or Lavalink-*.jar" -ForegroundColor Yellow
    Write-Host "Current directory: $scriptDir" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Found Lavalink: $lavalinkJar" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Lavalink on port 3009..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Run Lavalink
try {
    java -jar $lavalinkJar
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to start Lavalink!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

