param(
  [int]$BackendPort = 3100,
  [int]$FrontendPort = 5173,
  [string]$DatabaseUrl = 'postgres://pls_app:pls_app_password@localhost:5432/pls_platform',
  [string]$DatabaseSslMode = 'disable',
  [switch]$InstallDependencies,
  [switch]$SkipPostgres,
  [switch]$SkipMigrations,
  [switch]$SkipSeed,
  [switch]$SkipBackend,
  [switch]$SkipFrontend,
  [switch]$WithFabric,
  [string]$FabricTestNetworkDir = $env:FABRIC_TEST_NETWORK_DIR,
  [switch]$AssumeFabricNetworkRunning
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendUrl = "http://localhost:$BackendPort"
$FrontendUrl = "http://localhost:$FrontendPort"
$ApiProxyTarget = $BackendUrl

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Info {
  param([string]$Message)
  Write-Host "    $Message" -ForegroundColor Gray
}

function Write-Warn {
  param([string]$Message)
  Write-Host "WARN: $Message" -ForegroundColor Yellow
}

function Resolve-CommandPath {
  param([string]$CommandName)

  $windowsCommand = Get-Command "$CommandName.cmd" -ErrorAction SilentlyContinue
  if ($windowsCommand) {
    return $windowsCommand.Source
  }

  $nativeCommand = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($nativeCommand) {
    return $nativeCommand.Source
  }

  throw "Required command '$CommandName' was not found on PATH."
}

function Assert-Command {
  param([string]$CommandName)
  [void](Resolve-CommandPath -CommandName $CommandName)
}

function Quote-PowerShellString {
  param([string]$Value)
  return "'" + ($Value -replace "'", "''") + "'"
}

function Invoke-RepoCommand {
  param(
    [string]$Description,
    [string[]]$Command
  )

  Write-Step $Description
  Push-Location $RepoRoot
  try {
    & $Command[0] $Command[1..($Command.Length - 1)]
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code ${LASTEXITCODE}: $($Command -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Wait-PostgresHealthy {
  param([int]$TimeoutSeconds = 90)

  Write-Step "Waiting for PostgreSQL container health"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $status = docker inspect -f '{{.State.Health.Status}}' pls-postgres 2>$null
    if ($LASTEXITCODE -eq 0 -and $status -eq 'healthy') {
      Write-Info 'PostgreSQL is healthy.'
      return
    }

    if ($status) {
      Write-Info "Current PostgreSQL health: $status"
    } else {
      Write-Info 'PostgreSQL health status is not available yet.'
    }

    Start-Sleep -Seconds 3
  }

  throw "PostgreSQL did not become healthy within $TimeoutSeconds seconds. Run 'docker compose logs postgres' for details."
}

function Start-ServiceWindow {
  param(
    [string]$Title,
    [string]$CommandText
  )

  $shell = (Get-Process -Id $PID).Path
  $repoLiteral = Quote-PowerShellString -Value $RepoRoot.Path
  $titleLiteral = Quote-PowerShellString -Value $Title
  $fullCommand = "`$Host.UI.RawUI.WindowTitle = $titleLiteral; Set-Location -LiteralPath $repoLiteral; $CommandText"

  $process = Start-Process -FilePath $shell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $fullCommand) -PassThru
  Write-Info "$Title started in a new PowerShell window. PID: $($process.Id)"
}

Write-Step 'Starting local demo services'
Write-Info "Repository: $RepoRoot"
Write-Info "Backend API: $BackendUrl"
Write-Info "Frontend: $FrontendUrl"
Write-Info "Frontend /api/v1 proxy target: $ApiProxyTarget"

$NpmCommand = Resolve-CommandPath -CommandName npm

if ($InstallDependencies) {
  Invoke-RepoCommand -Description 'Installing root npm dependencies' -Command @($NpmCommand, 'install')
  if (Test-Path (Join-Path $RepoRoot 'chaincode/audit-anchor/package.json')) {
    Invoke-RepoCommand -Description 'Installing AuditAnchor chaincode dependencies' -Command @($NpmCommand, '--prefix', 'chaincode/audit-anchor', 'install')
  }
}

if (-not $SkipPostgres) {
  Assert-Command -CommandName docker
  Invoke-RepoCommand -Description 'Starting PostgreSQL with Docker Compose' -Command @('docker', 'compose', 'up', '-d', 'postgres')
  Wait-PostgresHealthy

  if (-not $SkipMigrations) {
    $env:DATABASE_URL = $DatabaseUrl
    $env:DATABASE_SSL_MODE = $DatabaseSslMode
    $env:DB_MIGRATIONS_ENABLED = 'true'
    Invoke-RepoCommand -Description 'Applying PostgreSQL migrations' -Command @($NpmCommand, 'run', 'db:migrate')
  }

  if (-not $SkipSeed) {
    $env:DATABASE_URL = $DatabaseUrl
    $env:DATABASE_SSL_MODE = $DatabaseSslMode
    $env:DEMO_SEED_ENABLED = 'true'
    Invoke-RepoCommand -Description 'Seeding local demo data' -Command @($NpmCommand, 'run', 'db:seed')
  }
} else {
  Write-Warn 'Skipping PostgreSQL startup, migration, and seed.'
}

if ($WithFabric) {
  Invoke-RepoCommand -Description 'Building AuditAnchor chaincode' -Command @($NpmCommand, 'run', 'chaincode:audit-anchor:build')
  Invoke-RepoCommand -Description 'Testing AuditAnchor chaincode' -Command @($NpmCommand, 'run', 'chaincode:audit-anchor:test')

  $deployScript = Join-Path $RepoRoot 'scripts/fabric/deploy-audit-anchor.ps1'
  if (-not (Test-Path $deployScript)) {
    throw "Fabric deploy script not found: $deployScript"
  }

  if ([string]::IsNullOrWhiteSpace($FabricTestNetworkDir)) {
    Write-Warn 'FABRIC_TEST_NETWORK_DIR is not set. Skipping live Fabric deployment after build/test.'
  } elseif (-not (Test-Path $FabricTestNetworkDir)) {
    Write-Warn "Fabric test network path does not exist: $FabricTestNetworkDir. Skipping live Fabric deployment."
  } else {
    Write-Step 'Deploying AuditAnchorContract to local Fabric test network'
    $deployArgs = @('-ExecutionPolicy', 'Bypass', '-File', $deployScript, '-TestNetworkPath', $FabricTestNetworkDir)
    if ($AssumeFabricNetworkRunning) {
      $deployArgs += '-AssumeNetworkRunning'
    }
    & powershell @deployArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Fabric deployment failed with exit code ${LASTEXITCODE}."
    }
  }
} else {
  Write-Info 'Skipping Fabric deployment. Pass -WithFabric to build/test/deploy AuditAnchorContract.'
}

$databaseUrlLiteral = Quote-PowerShellString -Value $DatabaseUrl
$databaseSslLiteral = Quote-PowerShellString -Value $DatabaseSslMode
$backendPortLiteral = Quote-PowerShellString -Value ([string]$BackendPort)
$frontendPortLiteral = Quote-PowerShellString -Value ([string]$FrontendPort)
$apiProxyLiteral = Quote-PowerShellString -Value $ApiProxyTarget
$npmCommandLiteral = Quote-PowerShellString -Value $NpmCommand

if (-not $SkipBackend) {
  $backendCommand = "`$env:PORT = $backendPortLiteral; `$env:DATABASE_URL = $databaseUrlLiteral; `$env:DATABASE_SSL_MODE = $databaseSslLiteral; `$env:DB_MIGRATIONS_ENABLED = 'true'; `$env:DEMO_SEED_ENABLED = 'true'; & $npmCommandLiteral run dev"
  Start-ServiceWindow -Title "PLS Backend API :$BackendPort" -CommandText $backendCommand
} else {
  Write-Warn 'Skipping backend startup.'
}

if (-not $SkipFrontend) {
  $frontendCommand = "Remove-Item Env:PORT -ErrorAction SilentlyContinue; `$env:VITE_FRONTEND_PORT = $frontendPortLiteral; `$env:VITE_API_PROXY_TARGET = $apiProxyLiteral; & $npmCommandLiteral run frontend:dev"
  Start-ServiceWindow -Title "PLS Frontend :$FrontendPort" -CommandText $frontendCommand
} else {
  Write-Warn 'Skipping frontend startup.'
}

Write-Step 'Local demo startup requested'
Write-Host "Backend API: $BackendUrl/api/v1" -ForegroundColor Green
Write-Host "Frontend:    $FrontendUrl" -ForegroundColor Green
Write-Host "PostgreSQL:  $DatabaseUrl" -ForegroundColor Green

if ($WithFabric) {
  Write-Host 'Fabric:      AuditAnchorContract build/test completed; deployment attempted when FABRIC_TEST_NETWORK_DIR was available.' -ForegroundColor Green
} else {
  Write-Host 'Fabric:      skipped. Re-run with -WithFabric to build/test/deploy AuditAnchorContract.' -ForegroundColor Yellow
}

Write-Host "`nStop services manually by closing the backend/frontend PowerShell windows and running:" -ForegroundColor Gray
Write-Host 'docker compose stop postgres' -ForegroundColor Gray
