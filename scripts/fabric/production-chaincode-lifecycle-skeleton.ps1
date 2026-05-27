param(
  [string]$ConfigDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..\..")) "fabric\production-consortium"),
  [string]$ChaincodeName = "audit-anchor",
  [string]$ChannelName = "procurement-proof-channel",
  [string]$PackageLabel = "audit-anchor_1.0.0",
  [string]$PackageFile = "audit-anchor_1.0.0.tar.gz",
  [string]$Sequence = "1",
  [string]$Version = "1.0.0",
  [switch]$Execute
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$chaincodeDefinitionsPath = Join-Path $ConfigDir "chaincode-definitions.json"
$collectionsConfigPath = Join-Path $ConfigDir "collections-config.json"

if (-not (Test-Path $chaincodeDefinitionsPath)) {
  throw "Missing chaincode definitions template: $chaincodeDefinitionsPath"
}

if (-not (Test-Path $collectionsConfigPath)) {
  throw "Missing private data collections template: $collectionsConfigPath"
}

$definitionFile = Get-Content -Raw -Path $chaincodeDefinitionsPath | ConvertFrom-Json
$definition = $definitionFile.chaincodes | Where-Object { $_.name -eq $ChaincodeName -and $_.channelName -eq $ChannelName } | Select-Object -First 1

if (-not $definition) {
  throw "No chaincode definition found for chaincode '$ChaincodeName' on channel '$ChannelName'."
}

$endorsementPolicy = $definition.endorsementPolicy
$packagePath = Join-Path $repoRoot $definition.packagePath

Write-Host "Production Fabric chaincode lifecycle skeleton"
Write-Host "Readiness: dry-run template unless -Execute is passed."
Write-Host "Chaincode: $ChaincodeName"
Write-Host "Channel:   $ChannelName"
Write-Host "Package:   $packagePath"
Write-Host "Policy:    $endorsementPolicy"
Write-Host ""

$commands = @(
  "npm run chaincode:audit-anchor:build",
  "npm run chaincode:audit-anchor:test",
  "peer lifecycle chaincode package $PackageFile --path `"$packagePath`" --lang node --label $PackageLabel",
  "peer lifecycle chaincode install $PackageFile",
  "peer lifecycle chaincode queryinstalled",
  "peer lifecycle chaincode approveformyorg -o <ORDERER_ADDRESS> --channelID $ChannelName --name $ChaincodeName --version $Version --package-id <PACKAGE_ID> --sequence $Sequence --signature-policy `"$endorsementPolicy`" --collections-config `"$collectionsConfigPath`" --tls --cafile <ORDERER_CA>",
  "peer lifecycle chaincode checkcommitreadiness --channelID $ChannelName --name $ChaincodeName --version $Version --sequence $Sequence --signature-policy `"$endorsementPolicy`" --collections-config `"$collectionsConfigPath`" --output json",
  "peer lifecycle chaincode commit -o <ORDERER_ADDRESS> --channelID $ChannelName --name $ChaincodeName --version $Version --sequence $Sequence --signature-policy `"$endorsementPolicy`" --collections-config `"$collectionsConfigPath`" --tls --cafile <ORDERER_CA> --peerAddresses <PEER_ADDRESS> --tlsRootCertFiles <PEER_TLS_CA>",
  "peer chaincode query -C $ChannelName -n $ChaincodeName -c '{`"Args`":[`"verifyEvent`",`"<EVENT_ID>`",`"sha256:<64-hex>`"]}'"
)

foreach ($command in $commands) {
  Write-Host "> $command"
}

if (-not $Execute) {
  Write-Host ""
  Write-Host "Dry run only. Review the commands, fill MSP-specific package IDs and endpoint paths, then rerun manually in a prepared Fabric admin shell."
  exit 0
}

throw "Automatic production lifecycle execution is intentionally not implemented. Run reviewed commands manually in the prepared Fabric admin shell and record evidence."
