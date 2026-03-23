$ErrorActionPreference = "Stop"

$services = @(
    @{ Name = "api"; Url = "http://localhost:8000/health" },
    @{ Name = "recommendation-engine"; Url = "http://localhost:8002/health" },
    @{ Name = "context-engine"; Url = "http://localhost:8005/health" },
    @{ Name = "user-profile-engine"; Url = "http://localhost:8006/health" },
    @{ Name = "ai-concierge"; Url = "http://localhost:8007/health" },
    @{ Name = "onboarding-engine"; Url = "http://localhost:8008/health" },
    @{ Name = "date-night-ai"; Url = "http://localhost:8009/health" }
)

function Test-Health {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$Retries = 12,
        [int]$DelaySeconds = 2
    )

    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
            if ($response.status -eq "ok") {
                Write-Host "[ok] $Name -> $Url"
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds $DelaySeconds
        }
    }

    Write-Host "[fail] $Name -> $Url" -ForegroundColor Red
    return $false
}

$failures = @()

Write-Host "Validating HTTP health endpoints..."
foreach ($service in $services) {
    $healthy = Test-Health -Name $service.Name -Url $service.Url
    if (-not $healthy) {
        $failures += $service.Name
    }
}

if ($failures.Count -gt 0) {
    throw "Stack validation failed for: $($failures -join ', ')"
}

Write-Host ""
Write-Host "Full stack health validation passed." -ForegroundColor Green
