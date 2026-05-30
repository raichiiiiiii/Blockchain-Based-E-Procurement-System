param(
  [string]$ExternalWorkspace = $env:FABRIC_PRODUCTION_LAB_WORKSPACE,
  [string]$ConfigDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")) "fabric\production-consortium"),
  [string]$ChannelName = $(if ($env:FABRIC_CHANNEL_NAME) { $env:FABRIC_CHANNEL_NAME } else { "procurement-proof-channel" }),
  [string]$ChaincodeName = $(if ($env:FABRIC_CHAINCODE_NAME) { $env:FABRIC_CHAINCODE_NAME } else { "audit-anchor" }),
  [string]$PackageLabel = "audit-anchor_1.0.0",
  [string]$Version = "1.0.0",
  [string]$Sequence = "1",
  [switch]$Execute,
  [string]$ConfirmExecution = ""
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
  Write-Host "[PBI-438 chaincode] $Message"
}

function Run-Command {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$EvidencePath
  )

  $display = "$FilePath $($Arguments -join ' ')"
  $display | Tee-Object -FilePath $EvidencePath -Append
  & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $EvidencePath -Append
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $display"
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$workspace = Get-FullPathValue $ExternalWorkspace
Assert-OutsideRepository -RepoRoot $repoRoot -TargetPath $workspace

$definitionPath = Join-Path $ConfigDir "chaincode-definitions.json"
$collectionsPath = Join-Path $ConfigDir "collections-config.json"
if (-not (Test-Path $definitionPath)) { throw "Missing $definitionPath" }
if (-not (Test-Path $collectionsPath)) { throw "Missing $collectionsPath" }

$definitions = Get-Content -Raw -Path $definitionPath | ConvertFrom-Json
$definition = $definitions.chaincodes | Where-Object { $_.name -eq $ChaincodeName -and $_.channelName -eq $ChannelName } | Select-Object -First 1
if (-not $definition) { throw "No chaincode definition for $ChaincodeName on $ChannelName." }

$packageFile = Join-Path $workspace "channel-artifacts/$PackageLabel.tar.gz"
$evidencePath = Join-Path $workspace "evidence/chaincode-lifecycle-$ChaincodeName.txt"
$packagePath = Join-Path $repoRoot $definition.packagePath
$endorsementPolicy = $definition.endorsementPolicy

Write-Step "Repository: $repoRoot"
Write-Step "External workspace: $workspace"
Write-Step "Channel: $ChannelName"
Write-Step "Chaincode: $ChaincodeName"
Write-Step "Mode: $(if ($Execute) { 'execute' } else { 'dry-run' })"
Write-Host ""

$dryRunCommands = @(
  "npm run chaincode:audit-anchor:build",
  "npm run chaincode:audit-anchor:test",
  "peer lifecycle chaincode package `"$packageFile`" --path `"$packagePath`" --lang node --label $PackageLabel",
  "peer lifecycle chaincode install `"$packageFile`" # repeat for PlatformOperatorMSP, BuyerMSP, SupplierMSP, FinancierMSP, RegulatorAuditorMSP peer contexts",
  "peer lifecycle chaincode queryinstalled # capture package ID from each peer context",
  "peer lifecycle chaincode approveformyorg -o <ORDERER_ADDRESS> --channelID $ChannelName --name $ChaincodeName --version $Version --package-id <PACKAGE_ID> --sequence $Sequence --signature-policy `"$endorsementPolicy`" --collections-config `"$collectionsPath`" --tls --cafile <ORDERER_CA>",
  "peer lifecycle chaincode checkcommitreadiness --channelID $ChannelName --name $ChaincodeName --version $Version --sequence $Sequence --signature-policy `"$endorsementPolicy`" --collections-config `"$collectionsPath`" --output json",
  "peer lifecycle chaincode commit -o <ORDERER_ADDRESS> --channelID $ChannelName --name $ChaincodeName --version $Version --sequence $Sequence --signature-policy `"$endorsementPolicy`" --collections-config `"$collectionsPath`" --tls --cafile <ORDERER_CA> --peerAddresses <PEER1> --tlsRootCertFiles <TLS1> --peerAddresses <PEER2> --tlsRootCertFiles <TLS2>",
  "peer lifecycle chaincode querycommitted --channelID $ChannelName --name $ChaincodeName"
)

foreach ($command in $dryRunCommands) {
  Write-Host "> $command"
}

if (-not $Execute) {
  Write-Host ""
  Write-Step "Dry run only. Re-run with -Execute -ConfirmExecution EXECUTE_PBI438_CHAINCODE_LIFECYCLE from a configured Fabric admin shell."
  exit 0
}

if ($ConfirmExecution -ne "EXECUTE_PBI438_CHAINCODE_LIFECYCLE") {
  throw "Refusing live chaincode lifecycle execution without -ConfirmExecution EXECUTE_PBI438_CHAINCODE_LIFECYCLE."
}

$peer = Get-Command peer -ErrorAction SilentlyContinue
if (-not $peer) { throw "peer CLI is not on PATH." }

New-Item -ItemType Directory -Path (Split-Path -Parent $packageFile), (Split-Path -Parent $evidencePath) -Force | Out-Null
Set-Content -Path $evidencePath -Value "PBI-438 chaincode lifecycle evidence $(Get-Date -Format o)" -Encoding utf8

Run-Command -FilePath "npm" -Arguments @("run", "chaincode:audit-anchor:build") -EvidencePath $evidencePath
Run-Command -FilePath "npm" -Arguments @("run", "chaincode:audit-anchor:test") -EvidencePath $evidencePath
Run-Command -FilePath $peer.Source -Arguments @("lifecycle", "chaincode", "package", $packageFile, "--path", $packagePath, "--lang", "node", "--label", $PackageLabel) -EvidencePath $evidencePath

Write-Step "Package created. Continue install/approve/commit from each configured organization admin shell and append output to $evidencePath."
