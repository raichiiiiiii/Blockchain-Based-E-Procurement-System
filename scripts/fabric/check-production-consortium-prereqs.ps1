param(
  [string]$ConfigDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")) "fabric\production-consortium"),
  [switch]$RequireFabricBinaries
)

$ErrorActionPreference = "Stop"

function Write-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  $status = if ($Passed) { "OK" } else { "MISSING" }
  Write-Host "[$status] $Name - $Detail"
}

function Test-JsonFile {
  param([string]$Path)

  try {
    Get-Content -Raw -Path $Path | ConvertFrom-Json | Out-Null
    return $true
  } catch {
    return $false
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$requiredFiles = @(
  "channel-plan.json",
  "chaincode-definitions.json",
  "collections-config.json",
  "connection-profile-template.yaml"
)

Write-Host "Production Fabric consortium prerequisite check"
Write-Host "Repository: $repoRoot"
Write-Host "Config:     $ConfigDir"
Write-Host ""

$missing = @()

foreach ($file in $requiredFiles) {
  $path = Join-Path $ConfigDir $file
  $exists = Test-Path $path
  Write-Check $file $exists $path
  if (-not $exists) {
    $missing += $file
  }
}

$jsonFiles = @("channel-plan.json", "chaincode-definitions.json", "collections-config.json")
foreach ($file in $jsonFiles) {
  $path = Join-Path $ConfigDir $file
  if (Test-Path $path) {
    $validJson = Test-JsonFile $path
    Write-Check "$file JSON" $validJson "JSON parse validation"
    if (-not $validJson) {
      $missing += "$file valid JSON"
    }
  }
}

$toolChecks = @(
  @{ Name = "peer CLI"; Command = "peer" },
  @{ Name = "configtxgen"; Command = "configtxgen" },
  @{ Name = "fabric-ca-client"; Command = "fabric-ca-client" },
  @{ Name = "docker"; Command = "docker" }
)

foreach ($tool in $toolChecks) {
  $command = Get-Command $tool.Command -ErrorAction SilentlyContinue
  $present = $null -ne $command
  Write-Check $tool.Name $present $(if ($present) { $command.Source } else { "Not found on PATH" })
  if ($RequireFabricBinaries -and -not $present) {
    $missing += $tool.Name
  }
}

$envChecks = @(
  @{ Name = "FABRIC_CFG_PATH"; Value = $env:FABRIC_CFG_PATH },
  @{ Name = "FABRIC_PRODUCTION_CONNECTION_PROFILE"; Value = $env:FABRIC_PRODUCTION_CONNECTION_PROFILE },
  @{ Name = "FABRIC_WALLET_PATH"; Value = $env:FABRIC_WALLET_PATH }
)

foreach ($item in $envChecks) {
  $configured = -not [string]::IsNullOrWhiteSpace($item.Value)
  Write-Check $item.Name $configured $(if ($configured) { $item.Value } else { "Not configured for live production-like gateway use" })
}

Write-Host ""
if ($missing.Count -gt 0) {
  Write-Host "Prerequisite check completed with missing required items: $($missing -join ', ')."
  if ($RequireFabricBinaries) {
    exit 1
  }
  exit 0
}

Write-Host "Prerequisite check completed. Templates are present and parseable."

