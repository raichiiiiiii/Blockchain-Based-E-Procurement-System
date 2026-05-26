param(
  [string]$ComposeFile = "docker-compose.app.yml",
  [string]$BackendUrl = "http://127.0.0.1:3100",
  [string]$FrontendUrl = "http://127.0.0.1:5173",
  [switch]$SkipComposeUp,
  [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"

function Invoke-JsonGet {
  param([string]$Url)
  return Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
}

function Wait-ForHttp {
  param(
    [string]$Url,
    [int]$Attempts = 30,
    [int]$DelaySeconds = 3
  )

  for ($i = 1; $i -le $Attempts; $i += 1) {
    try {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10 -UseBasicParsing
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $response
      }
    } catch {
      if ($i -eq $Attempts) {
        throw
      }
    }

    Start-Sleep -Seconds $DelaySeconds
  }

  throw "Timed out waiting for $Url"
}

try {
  if (-not $SkipComposeUp) {
    docker compose -f $ComposeFile up --build -d
  }

  Wait-ForHttp "$BackendUrl/health" | Out-Null
  $ready = Invoke-JsonGet "$BackendUrl/ready"
  if ($ready.data.status -ne "ready") {
    throw "Backend readiness is $($ready.data.status)"
  }

  Wait-ForHttp $FrontendUrl | Out-Null

  $loginBody = @{
    username = "admin.demo"
    password = "demo-password"
  } | ConvertTo-Json

  $login = Invoke-RestMethod `
    -Uri "$BackendUrl/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody `
    -TimeoutSec 10

  if (-not $login.data.sessionToken) {
    throw "Login did not return a session token"
  }

  Write-Host "Deployable smoke test passed."
  Write-Host "Backend: $BackendUrl"
  Write-Host "Frontend: $FrontendUrl"
} finally {
  if (-not $SkipComposeUp -and -not $KeepRunning) {
    docker compose -f $ComposeFile down
  }
}
