# Simple PowerShell command to test API key
# Copy and paste this into PowerShell (replace YOUR_API_KEY)

$apiKey = "ct_d2367e5b7c7a06f65b1f1fc68d794647be920e82921b5e144dc7bb1f7419a1ad"
$url = "http://localhost:3000/api/admin/stats"

Write-Host "Testing API Key..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -Headers $headers -UseBasicParsing
    Write-Host "Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

