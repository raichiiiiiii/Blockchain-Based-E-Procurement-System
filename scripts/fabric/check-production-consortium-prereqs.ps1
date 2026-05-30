param(
  [string]$ConfigDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")) "fabric\production-consortium"),
  [string]$ExternalWorkspace = $env:FABRIC_PRODUCTION_LAB_WORKSPACE,
  [string]$ConnectionProfilePath = $(if ($env:FABRIC_CONNECTION_PROFILE) { $env:FABRIC_CONNECTION_PROFILE } elseif ($env:FABRIC_PRODUCTION_CONNECTION_PROFILE) { $env:FABRIC_PRODUCTION_CONNECTION_PROFILE } else { "" }),
  [string]$WalletPath = $env:FABRIC_WALLET_PATH,
  [string]$ChannelName = $(if ($env:FABRIC_CHANNEL_NAME) { $env:FABRIC_CHANNEL_NAME } else { "procurement-proof-channel" }),
  [string]$ChaincodeName = $(if ($env:FABRIC_CHAINCODE_NAME) { $env:FABRIC_CHAINCODE_NAME } else { "audit-anchor" }),
  [switch]$RequireFabricBinaries,
  [switch]$RequireExternalWorkspace,
  [switch]$RequireLiveFabricConfig
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

function Test-PathValue {
  param([string]$Path)

  return (-not [string]::IsNullOrWhiteSpace($Path)) -and (Test-Path $Path)
}

function Add-MissingIfRequired {
  param(
    [System.Collections.Generic.List[string]]$Missing,
    [string]$Name,
    [bool]$Passed,
    [bool]$Required
  )

  if ($Required -and -not $Passed) {
    $Missing.Add($Name) | Out-Null
  }
}

function Test-DockerComposePlugin {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCommand) {
    return $false
  }

  $null = & $dockerCommand.Source compose version 2>$null
  return $LASTEXITCODE -eq 0
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$requiredFiles = @(
  "channel-plan.json",
  "chaincode-definitions.json",
  "collections-config.json",
  "connection-profile-template.yaml.template",
  "compose/docker-compose.fabric-lab.template.yaml",
  "config/configtx.yaml.template",
  "config/core-override-notes.md",
  "config/orderer-override-notes.md",
  "config/ca-server-config-notes.md"
)

$missing = [System.Collections.Generic.List[string]]::new()

Write-Host "Production Fabric consortium prerequisite check"
Write-Host "Repository: $repoRoot"
Write-Host "Config:     $ConfigDir"
Write-Host "Workspace:  $(if ([string]::IsNullOrWhiteSpace($ExternalWorkspace)) { '<not configured>' } else { $ExternalWorkspace })"
Write-Host ""

foreach ($file in $requiredFiles) {
  $path = Join-Path $ConfigDir $file
  $exists = Test-Path $path
  Write-Check $file $exists $path
  Add-MissingIfRequired -Missing $missing -Name $file -Passed $exists -Required $true
}

$jsonFiles = @("channel-plan.json", "chaincode-definitions.json", "collections-config.json")
foreach ($file in $jsonFiles) {
  $path = Join-Path $ConfigDir $file
  if (Test-Path $path) {
    $validJson = Test-JsonFile $path
    Write-Check "$file JSON" $validJson "JSON parse validation"
    Add-MissingIfRequired -Missing $missing -Name "$file valid JSON" -Passed $validJson -Required $true
  }
}

$toolChecks = @(
  @{ Name = "peer CLI"; Command = "peer"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "configtxgen"; Command = "configtxgen"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "fabric-ca-client"; Command = "fabric-ca-client"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "osnadmin"; Command = "osnadmin"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "docker"; Command = "docker"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "git"; Command = "git"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "node"; Command = "node"; Required = $RequireFabricBinaries.IsPresent },
  @{ Name = "npm"; Command = "npm"; Required = $RequireFabricBinaries.IsPresent }
)

foreach ($tool in $toolChecks) {
  $command = Get-Command $tool.Command -ErrorAction SilentlyContinue
  $present = $null -ne $command
  Write-Check $tool.Name $present $(if ($present) { $command.Source } else { "Not found on PATH" })
  Add-MissingIfRequired -Missing $missing -Name $tool.Name -Passed $present -Required ([bool]$tool.Required)
}

$composePresent = Test-DockerComposePlugin
Write-Check "docker compose plugin" $composePresent $(if ($composePresent) { "docker compose version succeeded" } else { "docker compose plugin unavailable" })
Add-MissingIfRequired -Missing $missing -Name "docker compose plugin" -Passed $composePresent -Required $RequireFabricBinaries.IsPresent

$workspaceConfigured = -not [string]::IsNullOrWhiteSpace($ExternalWorkspace)
$workspaceExists = Test-PathValue $ExternalWorkspace
Write-Check "external Fabric workspace" $workspaceExists $(if ($workspaceConfigured) { $ExternalWorkspace } else { "Set FABRIC_PRODUCTION_LAB_WORKSPACE or pass -ExternalWorkspace." })
Add-MissingIfRequired -Missing $missing -Name "external Fabric workspace" -Passed $workspaceExists -Required $RequireExternalWorkspace.IsPresent

$workspaceSubdirs = @(
  "config",
  "crypto",
  "channel-artifacts",
  "connection-profiles",
  "wallets",
  "logs",
  "evidence",
  "compose"
)

foreach ($subdir in $workspaceSubdirs) {
  $subdirPath = if ($workspaceConfigured) { Join-Path $ExternalWorkspace $subdir } else { "" }
  $present = Test-PathValue $subdirPath
  Write-Check "workspace/$subdir" $present $(if ($workspaceConfigured) { $subdirPath } else { "External workspace not configured." })
  Add-MissingIfRequired -Missing $missing -Name "workspace/$subdir" -Passed $present -Required ($RequireExternalWorkspace.IsPresent -and $workspaceExists)
}

$forbiddenRepoSecretDirs = @(
  "crypto",
  "wallets",
  "channel-artifacts",
  "connection-profiles"
)

foreach ($dir in $forbiddenRepoSecretDirs) {
  $path = Join-Path $repoRoot $dir
  $absent = -not (Test-Path $path)
  Write-Check "repo secret boundary: $dir absent" $absent $(if ($absent) { "No root-level $dir directory in repository." } else { "Review and remove root-level $dir from repository workspace before commit." })
  Add-MissingIfRequired -Missing $missing -Name "repo secret boundary $dir" -Passed $absent -Required $true
}

$liveConfigChecks = @(
  @{ Name = "BLOCKCHAIN_ANCHOR_ADAPTER"; Passed = ($env:BLOCKCHAIN_ANCHOR_ADAPTER -eq "fabric" -or $env:FABRIC_GATEWAY_ENABLED -eq "true"); Detail = $(if ($env:BLOCKCHAIN_ANCHOR_ADAPTER) { $env:BLOCKCHAIN_ANCHOR_ADAPTER } elseif ($env:FABRIC_GATEWAY_ENABLED) { "FABRIC_GATEWAY_ENABLED=$($env:FABRIC_GATEWAY_ENABLED)" } else { "Set BLOCKCHAIN_ANCHOR_ADAPTER=fabric for live lab use." }) },
  @{ Name = "FABRIC_CHANNEL_NAME"; Passed = (-not [string]::IsNullOrWhiteSpace($ChannelName)); Detail = $ChannelName },
  @{ Name = "FABRIC_CHAINCODE_NAME"; Passed = (-not [string]::IsNullOrWhiteSpace($ChaincodeName)); Detail = $ChaincodeName },
  @{ Name = "FABRIC_CONNECTION_PROFILE"; Passed = (Test-PathValue $ConnectionProfilePath); Detail = $(if ($ConnectionProfilePath) { $ConnectionProfilePath } else { "Set FABRIC_CONNECTION_PROFILE outside the repo." }) },
  @{ Name = "FABRIC_WALLET_PATH"; Passed = (Test-PathValue $WalletPath); Detail = $(if ($WalletPath) { $WalletPath } else { "Set FABRIC_WALLET_PATH outside the repo." }) },
  @{ Name = "FABRIC_ORDERER_ADDRESS"; Passed = (-not [string]::IsNullOrWhiteSpace($env:FABRIC_ORDERER_ADDRESS)); Detail = $(if ($env:FABRIC_ORDERER_ADDRESS) { $env:FABRIC_ORDERER_ADDRESS } else { "Set for production-like smoke script." }) },
  @{ Name = "FABRIC_ORDERER_TLS_CA_FILE"; Passed = ((Test-PathValue $env:FABRIC_ORDERER_TLS_CA_FILE) -or (Test-PathValue $env:ORDERER_CA)); Detail = $(if ($env:FABRIC_ORDERER_TLS_CA_FILE) { $env:FABRIC_ORDERER_TLS_CA_FILE } elseif ($env:ORDERER_CA) { $env:ORDERER_CA } else { "Set FABRIC_ORDERER_TLS_CA_FILE or ORDERER_CA." }) },
  @{ Name = "FABRIC_PEER_ADDRESSES"; Passed = (-not [string]::IsNullOrWhiteSpace($env:FABRIC_PEER_ADDRESSES)); Detail = $(if ($env:FABRIC_PEER_ADDRESSES) { $env:FABRIC_PEER_ADDRESSES } else { "Comma-separated peer endpoints for cross-org invoke." }) },
  @{ Name = "FABRIC_PEER_TLS_ROOT_CERT_FILES"; Passed = (-not [string]::IsNullOrWhiteSpace($env:FABRIC_PEER_TLS_ROOT_CERT_FILES)); Detail = $(if ($env:FABRIC_PEER_TLS_ROOT_CERT_FILES) { $env:FABRIC_PEER_TLS_ROOT_CERT_FILES } else { "Comma-separated peer TLS root cert files." }) },
  @{ Name = "CORE_PEER_LOCALMSPID"; Passed = (-not [string]::IsNullOrWhiteSpace($env:CORE_PEER_LOCALMSPID)); Detail = $(if ($env:CORE_PEER_LOCALMSPID) { $env:CORE_PEER_LOCALMSPID } else { "Set to the submitting org MSP ID." }) },
  @{ Name = "CORE_PEER_MSPCONFIGPATH"; Passed = (Test-PathValue $env:CORE_PEER_MSPCONFIGPATH); Detail = $(if ($env:CORE_PEER_MSPCONFIGPATH) { $env:CORE_PEER_MSPCONFIGPATH } else { "Set to admin or scoped client MSP path." }) }
)

foreach ($item in $liveConfigChecks) {
  Write-Check $item.Name ([bool]$item.Passed) $item.Detail
  Add-MissingIfRequired -Missing $missing -Name $item.Name -Passed ([bool]$item.Passed) -Required $RequireLiveFabricConfig.IsPresent
}

Write-Host ""
if ($missing.Count -gt 0) {
  Write-Host "Prerequisite check completed with missing required items: $($missing -join ', ')."
  exit 1
}

Write-Host "Prerequisite check completed. Required templates and requested live-lab prerequisites are present."
