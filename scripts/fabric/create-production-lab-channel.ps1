param(
  [string]$ExternalWorkspace = $env:FABRIC_PRODUCTION_LAB_WORKSPACE,
  [string]$ChannelName = $(if ($env:FABRIC_CHANNEL_NAME) { $env:FABRIC_CHANNEL_NAME } else { "procurement-proof-channel" }),
  [string]$Profile = "ProcurementProofChannel",
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
  param([string]$RepoRoot, [string]$TargetPath)
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
  Write-Host "[PBI-438 channel] $Message"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$workspace = Get-FullPathValue $ExternalWorkspace
Assert-OutsideRepository -RepoRoot $repoRoot -TargetPath $workspace

$configPath = Join-Path $workspace "config/configtx.yaml"
$channelBlock = Join-Path $workspace "channel-artifacts/$ChannelName.block"
$evidencePath = Join-Path $workspace "evidence/channel-lifecycle-$ChannelName.txt"

Write-Step "Repository: $repoRoot"
Write-Step "External workspace: $workspace"
Write-Step "Channel: $ChannelName"
Write-Step "Profile: $Profile"
Write-Step "Mode: $(if ($Execute) { 'execute' } else { 'dry-run' })"
Write-Host ""

$commands = @(
  "set FABRIC_CFG_PATH=$($workspace -replace '\\', '/')/config",
  "configtxgen -profile $Profile -outputBlock `"$channelBlock`" -channelID $ChannelName",
  "osnadmin channel join --channelID $ChannelName --config-block `"$channelBlock`" -o localhost:9443 --ca-file <orderer-admin-tls-ca> --client-cert <orderer-admin-client-cert> --client-key <orderer-admin-client-key>",
  "osnadmin channel join --channelID $ChannelName --config-block `"$channelBlock`" -o localhost:9444 --ca-file <orderer-admin-tls-ca> --client-cert <orderer-admin-client-cert> --client-key <orderer-admin-client-key>",
  "osnadmin channel join --channelID $ChannelName --config-block `"$channelBlock`" -o localhost:9445 --ca-file <orderer-admin-tls-ca> --client-cert <orderer-admin-client-cert> --client-key <orderer-admin-client-key>",
  "peer channel join -b `"$channelBlock`"  # repeat from each organization peer admin context",
  "peer channel list                  # capture output from each organization"
)

foreach ($command in $commands) {
  Write-Host "> $command"
}

if (-not $Execute) {
  Write-Host ""
  Write-Step "Dry run only. Re-run with -Execute after MSP/TLS material and admin contexts are configured."
  exit 0
}

if (-not (Test-Path $configPath)) {
  throw "Missing external configtx.yaml at $configPath. Run initialize-production-lab-workspace.ps1 -Execute first."
}

$configtxgen = Get-Command configtxgen -ErrorAction SilentlyContinue
if (-not $configtxgen) {
  throw "configtxgen is not on PATH."
}

New-Item -ItemType Directory -Path (Split-Path -Parent $channelBlock), (Split-Path -Parent $evidencePath) -Force | Out-Null
$env:FABRIC_CFG_PATH = Join-Path $workspace "config"

& $configtxgen.Source -profile $Profile -outputBlock $channelBlock -channelID $ChannelName 2>&1 |
  Tee-Object -FilePath $evidencePath
if ($LASTEXITCODE -ne 0) {
  throw "configtxgen failed with exit code $LASTEXITCODE."
}

Write-Step "Channel block generated at $channelBlock. Join orderers/peers with reviewed admin contexts and append sanitized output to $evidencePath."
