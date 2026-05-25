param(
  [string]$TestNetworkPath = $env:FABRIC_TEST_NETWORK_DIR,
  [string]$ChannelName = "procurement-channel",
  [string]$ChaincodeName = "audit-anchor",
  [string]$ChaincodeVersion = "1.0.0",
  [string]$Sequence = "1",
  [switch]$AssumeNetworkRunning
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$chaincodePath = Resolve-Path (Join-Path $repoRoot "chaincode\audit-anchor")

if (-not (Get-Command bash -ErrorAction SilentlyContinue)) {
  throw "bash is required because the Fabric test-network uses network.sh."
}

if (-not $TestNetworkPath) {
  throw "Set FABRIC_TEST_NETWORK_DIR or pass -TestNetworkPath pointing to fabric-samples/test-network."
}

$resolvedTestNetworkPath = Resolve-Path $TestNetworkPath
$networkScript = Join-Path $resolvedTestNetworkPath "network.sh"

if (-not (Test-Path $networkScript)) {
  throw "network.sh was not found at '$networkScript'. Use the Hyperledger Fabric fabric-samples/test-network directory."
}

Push-Location $chaincodePath
try {
  npm ci
  npm run build
} finally {
  Pop-Location
}

Push-Location $resolvedTestNetworkPath
try {
  if (-not $AssumeNetworkRunning) {
    & bash "./network.sh" up createChannel -ca -c $ChannelName
  }

  & bash "./network.sh" deployCC `
    -c $ChannelName `
    -ccn $ChaincodeName `
    -ccp $chaincodePath `
    -ccl javascript `
    -ccv $ChaincodeVersion `
    -ccs $Sequence
} finally {
  Pop-Location
}
