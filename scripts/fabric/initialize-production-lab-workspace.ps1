param(
  [string]$ExternalWorkspace = $env:FABRIC_PRODUCTION_LAB_WORKSPACE,
  [switch]$Execute
)

$ErrorActionPreference = "Stop"

function Get-FullPathValue {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Set FABRIC_PRODUCTION_LAB_WORKSPACE or pass -ExternalWorkspace."
  }

  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-OutsideRepository {
  param(
    [string]$RepoRoot,
    [string]$TargetPath
  )

  $repo = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
  $target = [System.IO.Path]::GetFullPath($TargetPath).TrimEnd('\', '/')

  if ($target.Equals($repo, [System.StringComparison]::OrdinalIgnoreCase) -or
      $target.StartsWith("$repo\", [System.StringComparison]::OrdinalIgnoreCase) -or
      $target.StartsWith("$repo/", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "External Fabric workspace must not be inside the repository. Target was '$target'."
  }
}

function Write-Step {
  param([string]$Message)
  Write-Host "[PBI-438 workspace] $Message"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$workspace = Get-FullPathValue $ExternalWorkspace
Assert-OutsideRepository -RepoRoot $repoRoot -TargetPath $workspace

$directories = @(
  "bin",
  "config",
  "crypto",
  "crypto/fabric-ca/orderer",
  "crypto/fabric-ca/platform",
  "crypto/fabric-ca/buyer",
  "crypto/fabric-ca/supplier",
  "crypto/fabric-ca/financier",
  "crypto/fabric-ca/regulatorauditor",
  "channel-artifacts",
  "connection-profiles",
  "wallets",
  "logs",
  "evidence",
  "compose",
  "ledgers/orderer1",
  "ledgers/orderer2",
  "ledgers/orderer3",
  "ledgers/peer0.platform",
  "ledgers/peer0.buyer",
  "ledgers/peer0.supplier",
  "ledgers/peer0.financier",
  "ledgers/peer0.regulatorauditor"
)

$copyOperations = @(
  @{
    Source = Join-Path $repoRoot "fabric/production-consortium/compose/docker-compose.fabric-lab.template.yaml"
    Target = Join-Path $workspace "compose/docker-compose.fabric-lab.yaml"
    Transform = "none"
  },
  @{
    Source = Join-Path $repoRoot "fabric/production-consortium/config/configtx.yaml.template"
    Target = Join-Path $workspace "config/configtx.yaml"
    Transform = "workspace-token"
  },
  @{
    Source = Join-Path $repoRoot "fabric/production-consortium/collections-config.json"
    Target = Join-Path $workspace "config/collections-config.json"
    Transform = "none"
  },
  @{
    Source = Join-Path $repoRoot "fabric/production-consortium/connection-profile-template.yaml.template"
    Target = Join-Path $workspace "connection-profiles/procurement-proof-connection.template.yaml"
    Transform = "none"
  }
)

Write-Step "Repository: $repoRoot"
Write-Step "External workspace: $workspace"
Write-Step "Mode: $(if ($Execute) { 'execute' } else { 'dry-run' })"
Write-Host ""

foreach ($relative in $directories) {
  $path = Join-Path $workspace $relative
  if ($Execute) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
  Write-Step "$(if ($Execute) { 'ensured' } else { 'would create' }) $path"
}

foreach ($operation in $copyOperations) {
  if (-not (Test-Path $operation.Source)) {
    throw "Missing template source: $($operation.Source)"
  }

  if ($Execute) {
    $parent = Split-Path -Parent $operation.Target
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    if ($operation.Transform -eq "workspace-token") {
      $content = Get-Content -Raw -Path $operation.Source
      $content = $content.Replace("__FABRIC_PRODUCTION_LAB_WORKSPACE__", ($workspace -replace "\\", "/"))
      Set-Content -Path $operation.Target -Value $content -Encoding utf8
    } else {
      Copy-Item -Path $operation.Source -Destination $operation.Target -Force
    }
  }

  Write-Step "$(if ($Execute) { 'wrote' } else { 'would write' }) $($operation.Target)"
}

$envFile = Join-Path $workspace "compose/.env.example"
$envExample = @"
FABRIC_PRODUCTION_LAB_WORKSPACE=$workspace

# Store real values in an untracked .env file outside the repository.
ORDERER_CA_BOOTSTRAP_ID=<set-locally>
ORDERER_CA_BOOTSTRAP_SECRET=<set-locally>
PLATFORM_CA_BOOTSTRAP_ID=<set-locally>
PLATFORM_CA_BOOTSTRAP_SECRET=<set-locally>
BUYER_CA_BOOTSTRAP_ID=<set-locally>
BUYER_CA_BOOTSTRAP_SECRET=<set-locally>
SUPPLIER_CA_BOOTSTRAP_ID=<set-locally>
SUPPLIER_CA_BOOTSTRAP_SECRET=<set-locally>
FINANCIER_CA_BOOTSTRAP_ID=<set-locally>
FINANCIER_CA_BOOTSTRAP_SECRET=<set-locally>
REGULATOR_AUDITOR_CA_BOOTSTRAP_ID=<set-locally>
REGULATOR_AUDITOR_CA_BOOTSTRAP_SECRET=<set-locally>
"@

if ($Execute) {
  Set-Content -Path $envFile -Value $envExample -Encoding utf8
}
Write-Step "$(if ($Execute) { 'wrote' } else { 'would write' }) $envFile"

Write-Host ""
if ($Execute) {
  Write-Step "Workspace initialized. Keep generated crypto, wallets, channel artifacts, logs, and evidence under this external path."
} else {
  Write-Step "Dry run only. Re-run with -Execute to create directories and copy templates."
}
