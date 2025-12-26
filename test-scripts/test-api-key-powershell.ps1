# PowerShell script to test API key
# Usage: .\scripts\test-api-key-powershell.ps1 YOUR_API_KEY

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$baseUrl = if ($env:NEXTAUTH_URL) { $env:NEXTAUTH_URL } else { "http://localhost:3000" }

Write-Host "🧪 Testing API Key: $($ApiKey.Substring(0, [Math]::Min(20, $ApiKey.Length)))..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Get system stats
Write-Host "📊 Test 1: GET /api/admin/stats" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/admin/stats" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $ApiKey"
            "Content-Type" = "application/json"
        } `
        -UseBasicParsing
    
    Write-Host "✅ Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: User lookup
Write-Host "Test 2: GET /api/admin/user-lookup" -ForegroundColor Yellow
try {
    $userLookupUrl = "$baseUrl/api/admin/user-lookup?type=uid&query=1"
    $response = Invoke-WebRequest -Uri $userLookupUrl `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $ApiKey"
            "Content-Type" = "application/json"
        } `
        -UseBasicParsing
    
    Write-Host "Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Tests complete!" -ForegroundColor Green

