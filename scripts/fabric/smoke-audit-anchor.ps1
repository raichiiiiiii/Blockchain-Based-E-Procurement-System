param(
  [string]$TestNetworkPath = $env:FABRIC_TEST_NETWORK_DIR,
  [string]$ChannelName = "procurement-channel",
  [string]$ChaincodeName = "audit-anchor",
  [string]$EventId = "smoke-event-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())",
  [string]$OrdererAddress = $(if ($env:FABRIC_ORDERER_ADDRESS) { $env:FABRIC_ORDERER_ADDRESS } else { "localhost:7050" }),
  [string]$OrdererTlsHostnameOverride = $(if ($env:FABRIC_ORDERER_TLS_HOSTNAME_OVERRIDE) { $env:FABRIC_ORDERER_TLS_HOSTNAME_OVERRIDE } else { "orderer.example.com" }),
  [string]$PeerAddress = $(if ($env:CORE_PEER_ADDRESS) { $env:CORE_PEER_ADDRESS } else { "localhost:7051" }),
  [string]$OrgMspId = $(if ($env:CORE_PEER_LOCALMSPID) { $env:CORE_PEER_LOCALMSPID } else { "Org1MSP" }),
  [switch]$AssumeDeployed,
  [switch]$AssumeNetworkRunning,
  [switch]$PrerequisiteCheckOnly
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

function Resolve-PeerCommand {
  param([string]$ResolvedTestNetworkPath)

  $fromPath = Get-Command peer -ErrorAction SilentlyContinue
  if ($fromPath) {
    return $fromPath.Source
  }

  if ($ResolvedTestNetworkPath) {
    $candidate = Join-Path (Split-Path $ResolvedTestNetworkPath -Parent) "bin\peer.exe"
    if (Test-Path $candidate) {
      return $candidate
    }

    $candidate = Join-Path (Split-Path $ResolvedTestNetworkPath -Parent) "bin\peer"
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Invoke-RepoCommand {
  param([string[]]$Command)

  Write-Host "> $($Command -join ' ')"
  $executable = $Command[0]
  $commandArguments = if ($Command.Length -gt 1) { $Command[1..($Command.Length - 1)] } else { @() }

  if ($executable -eq "npm") {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) {
      $executable = $npmCommand.Source
    }
  }

  & $executable @commandArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $($Command -join ' ')"
  }
}

function Invoke-PeerCli {
  param(
    [string]$PeerCommand,
    [string[]]$Arguments
  )

  Write-Host "> peer $($Arguments -join ' ')"
  $output = & $PeerCommand @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | ForEach-Object { "$_" }) -join "`n"

  if ($exitCode -ne 0) {
    throw "Peer command failed with exit code $exitCode.`n$text"
  }

  return $text
}

function Read-JsonResult {
  param([string]$Output)

  $jsonLine = ($Output -split "`n" | Where-Object { $_.Trim().StartsWith("{") -or $_.Trim().StartsWith("[") } | Select-Object -Last 1)
  if (-not $jsonLine) {
    throw "Peer query did not return JSON output: $Output"
  }

  return $jsonLine | ConvertFrom-Json
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$chaincodePath = Resolve-Path (Join-Path $repoRoot "chaincode\audit-anchor")

Push-Location $repoRoot
try {
  Invoke-RepoCommand -Command @("npm", "run", "chaincode:audit-anchor:build")
  Invoke-RepoCommand -Command @("npm", "run", "chaincode:audit-anchor:test")
} finally {
  Pop-Location
}

$resolvedTestNetworkPath = $null
$networkScript = $null
if ($TestNetworkPath) {
  $resolvedTestNetworkPath = Resolve-Path $TestNetworkPath -ErrorAction SilentlyContinue
  if ($resolvedTestNetworkPath) {
    $networkScript = Join-Path $resolvedTestNetworkPath "network.sh"
  }
}

$ordererCaFile = if ($env:ORDERER_CA) {
  $env:ORDERER_CA
} elseif ($resolvedTestNetworkPath) {
  Join-Path $resolvedTestNetworkPath "organizations\ordererOrganizations\example.com\orderers\orderer.example.com\msp\tlscacerts\tlsca.example.com-cert.pem"
} else {
  $null
}

$peerTlsRootCertFile = if ($env:PEER0_ORG1_CA) {
  $env:PEER0_ORG1_CA
} elseif ($resolvedTestNetworkPath) {
  Join-Path $resolvedTestNetworkPath "organizations\peerOrganizations\org1.example.com\peers\peer0.org1.example.com\tls\ca.crt"
} else {
  $null
}

$peerMspConfigPath = if ($env:CORE_PEER_MSPCONFIGPATH) {
  $env:CORE_PEER_MSPCONFIGPATH
} elseif ($resolvedTestNetworkPath) {
  Join-Path $resolvedTestNetworkPath "organizations\peerOrganizations\org1.example.com\users\Admin@org1.example.com\msp"
} else {
  $null
}

$peerCommand = Resolve-PeerCommand $resolvedTestNetworkPath

$missing = @()
if (-not $resolvedTestNetworkPath) { $missing += "FABRIC_TEST_NETWORK_DIR/TestNetworkPath" }
if (-not $networkScript -or -not (Test-Path $networkScript)) { $missing += "fabric-samples test-network network.sh" }
if (-not $peerCommand) { $missing += "Fabric peer CLI" }
if (-not $ordererCaFile -or -not (Test-Path $ordererCaFile)) { $missing += "orderer TLS CA file" }
if (-not $peerTlsRootCertFile -or -not (Test-Path $peerTlsRootCertFile)) { $missing += "peer TLS root certificate" }
if (-not $peerMspConfigPath -or -not (Test-Path $peerMspConfigPath)) { $missing += "Org1 admin MSP config path" }

Write-Host ""
Write-Host "Fabric smoke prerequisites"
Write-Check "test-network" ($resolvedTestNetworkPath -and (Test-Path $networkScript)) $(if ($resolvedTestNetworkPath) { "$resolvedTestNetworkPath" } else { "Set FABRIC_TEST_NETWORK_DIR or pass -TestNetworkPath." })
Write-Check "peer CLI" ($null -ne $peerCommand) $(if ($peerCommand) { $peerCommand } else { "Install Fabric binaries or keep them under fabric-samples/bin." })
Write-Check "orderer TLS CA" ($ordererCaFile -and (Test-Path $ordererCaFile)) $(if ($ordererCaFile) { $ordererCaFile } else { "ORDERER_CA not set and default path unavailable." })
Write-Check "peer TLS CA" ($peerTlsRootCertFile -and (Test-Path $peerTlsRootCertFile)) $(if ($peerTlsRootCertFile) { $peerTlsRootCertFile } else { "PEER0_ORG1_CA not set and default path unavailable." })
Write-Check "peer MSP" ($peerMspConfigPath -and (Test-Path $peerMspConfigPath)) $(if ($peerMspConfigPath) { $peerMspConfigPath } else { "CORE_PEER_MSPCONFIGPATH not set and default path unavailable." })

if ($PrerequisiteCheckOnly) {
  if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Prerequisite check completed. Live smoke is blocked by: $($missing -join ', ')."
    exit 0
  }

  Write-Host ""
  Write-Host "Prerequisite check completed. Live smoke can be run without -PrerequisiteCheckOnly."
  exit 0
}

if ($missing.Count -gt 0) {
  throw "Live Fabric smoke prerequisites are missing: $($missing -join ', '). Run with -PrerequisiteCheckOnly to record a non-mutating prerequisite report."
}

if (-not $AssumeDeployed) {
  $deployArgs = @(
    "-File",
    (Join-Path $PSScriptRoot "deploy-audit-anchor.ps1"),
    "-TestNetworkPath",
    "$resolvedTestNetworkPath",
    "-ChannelName",
    $ChannelName,
    "-ChaincodeName",
    $ChaincodeName
  )

  if ($AssumeNetworkRunning) {
    $deployArgs += "-AssumeNetworkRunning"
  }

  & powershell @deployArgs
  if ($LASTEXITCODE -ne 0) {
    throw "AuditAnchorContract deployment failed."
  }
}

$env:CORE_PEER_TLS_ENABLED = "true"
$env:CORE_PEER_LOCALMSPID = $OrgMspId
$env:CORE_PEER_MSPCONFIGPATH = "$peerMspConfigPath"
$env:CORE_PEER_ADDRESS = $PeerAddress

$caseIdHash = "sha256:$('a' * 64)"
$payloadHash = "sha256:$('b' * 64)"
$mismatchPayloadHash = "sha256:$('c' * 64)"
$anchor = [ordered]@{
  eventId = $EventId
  caseIdHash = $caseIdHash
  eventType = "smokeProof"
  payloadHash = $payloadHash
  schemaVersion = "1.0"
  canonicalization = "json-canonical-v1"
  occurredAt = [DateTimeOffset]::UtcNow.ToString("o")
}
$anchorJson = $anchor | ConvertTo-Json -Compress

$invokeSpec = @{ Args = @("anchorEvent", $anchorJson) } | ConvertTo-Json -Compress
Invoke-PeerCli -PeerCommand $peerCommand -Arguments @(
  "chaincode", "invoke",
  "-o", $OrdererAddress,
  "--ordererTLSHostnameOverride", $OrdererTlsHostnameOverride,
  "--tls",
  "--cafile", "$ordererCaFile",
  "-C", $ChannelName,
  "-n", $ChaincodeName,
  "--peerAddresses", $PeerAddress,
  "--tlsRootCertFiles", "$peerTlsRootCertFile",
  "--waitForEvent",
  "-c", $invokeSpec
) | Out-Null

$getSpec = @{ Args = @("getAnchor", $EventId) } | ConvertTo-Json -Compress
$getResult = Read-JsonResult (Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $getSpec))
if ($getResult.eventId -ne $EventId -or $getResult.payloadHash -ne $payloadHash) {
  throw "getAnchor did not return the submitted proof metadata."
}

$verifiedSpec = @{ Args = @("verifyEvent", $EventId, $payloadHash) } | ConvertTo-Json -Compress
$verifiedResult = Read-JsonResult (Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $verifiedSpec))
if ($verifiedResult.verificationStatus -ne "verified") {
  throw "Expected verificationStatus=verified, received '$($verifiedResult.verificationStatus)'."
}

$mismatchSpec = @{ Args = @("verifyEvent", $EventId, $mismatchPayloadHash) } | ConvertTo-Json -Compress
$mismatchResult = Read-JsonResult (Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $mismatchSpec))
if ($mismatchResult.verificationStatus -ne "mismatch") {
  throw "Expected verificationStatus=mismatch, received '$($mismatchResult.verificationStatus)'."
}

$missingSpec = @{ Args = @("verifyEvent", "$EventId-missing", $payloadHash) } | ConvertTo-Json -Compress
$missingResult = Read-JsonResult (Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $missingSpec))
if ($missingResult.verificationStatus -ne "notFound") {
  throw "Expected verificationStatus=notFound, received '$($missingResult.verificationStatus)'."
}

Write-Host ""
Write-Host "Fabric AuditAnchor smoke validation passed for eventId '$EventId'."
