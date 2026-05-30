param(
  [string]$ChannelName = $(if ($env:FABRIC_CHANNEL_NAME) { $env:FABRIC_CHANNEL_NAME } else { "procurement-proof-channel" }),
  [string]$ChaincodeName = $(if ($env:FABRIC_CHAINCODE_NAME) { $env:FABRIC_CHAINCODE_NAME } else { "audit-anchor" }),
  [string]$EventId = "evt-pbi438-live-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())",
  [string]$MissingEventId = "evt-does-not-exist-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())",
  [string]$OrdererAddress = $env:FABRIC_ORDERER_ADDRESS,
  [string]$OrdererTlsCaFile = $(if ($env:FABRIC_ORDERER_TLS_CA_FILE) { $env:FABRIC_ORDERER_TLS_CA_FILE } elseif ($env:ORDERER_CA) { $env:ORDERER_CA } else { $null }),
  [string]$OrdererTlsHostnameOverride = $env:FABRIC_ORDERER_TLS_HOSTNAME_OVERRIDE,
  [string[]]$PeerAddresses,
  [string[]]$PeerTlsRootCertFiles,
  [string]$OrgMspId = $env:CORE_PEER_LOCALMSPID,
  [string]$PeerMspConfigPath = $env:CORE_PEER_MSPCONFIGPATH,
  [string]$CaseIdHash = "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  [string]$PayloadHash = "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  [string]$MismatchPayloadHash = "sha256:9999999999999999999999999999999999999999999999999999999999999999",
  [string]$OccurredAt = "2026-05-30T00:00:00.000Z",
  [string]$EvidenceOutputPath,
  [switch]$PrerequisiteCheckOnly
)

$ErrorActionPreference = "Stop"

$evidenceLines = [System.Collections.Generic.List[string]]::new()

function Write-Evidence {
  param([string]$Text)

  Write-Host $Text
  $script:evidenceLines.Add($Text) | Out-Null
}

function Write-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  $status = if ($Passed) { "OK" } else { "MISSING" }
  Write-Evidence "[$status] $Name - $Detail"
}

function Split-ConfiguredList {
  param(
    [string[]]$Value,
    [string]$Fallback
  )

  $items = @()
  if ($Value -and $Value.Count -gt 0) {
    $items += $Value
  } elseif (-not [string]::IsNullOrWhiteSpace($Fallback)) {
    $items += $Fallback
  }

  return @(
    $items |
      ForEach-Object { $_ -split ',' } |
      ForEach-Object { $_.Trim() } |
      Where-Object { $_.Length -gt 0 }
  )
}

function Resolve-PeerCommand {
  $command = Get-Command peer -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

function Add-PeerEndpointArguments {
  param(
    [string[]]$TargetArguments,
    [string[]]$Addresses,
    [string[]]$RootCertFiles
  )

  $arguments = @($TargetArguments)
  for ($index = 0; $index -lt $Addresses.Count; $index++) {
    $arguments += @(
      "--peerAddresses",
      $Addresses[$index],
      "--tlsRootCertFiles",
      $RootCertFiles[$index]
    )
  }

  return $arguments
}

function Invoke-PeerCli {
  param(
    [string]$PeerCommand,
    [string[]]$Arguments
  )

  Write-Evidence "> peer $($Arguments -join ' ')"
  $output = & $PeerCommand @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | ForEach-Object { "$_" }) -join "`n"
  if (-not [string]::IsNullOrWhiteSpace($text)) {
    Write-Evidence $text
  }

  if ($exitCode -ne 0) {
    throw "Peer command failed with exit code $exitCode.`n$text"
  }

  return $text
}

function Read-JsonResult {
  param([string]$Output)

  $lines = @($Output -split "`n")
  [array]::Reverse($lines)

  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith('{') -or $trimmed.StartsWith('[') -or $trimmed -eq 'null') {
      try {
        return $trimmed | ConvertFrom-Json
      } catch {
        # Continue searching below.
      }
    }
  }

  $match = [System.Text.RegularExpressions.Regex]::Match($Output, 'payload:"(?<payload>(?:\\.|[^"\\])*)"')
  if ($match.Success) {
    $payload = [System.Text.RegularExpressions.Regex]::Unescape($match.Groups['payload'].Value)
    return $payload | ConvertFrom-Json
  }

  throw "Peer command did not return JSON output: $Output"
}

function Assert-VerificationStatus {
  param(
    [object]$Result,
    [string]$Expected
  )

  if ($Result.verificationStatus -ne $Expected) {
    throw "Expected verificationStatus=$Expected, received '$($Result.verificationStatus)'."
  }
}

function Write-EvidenceFile {
  if ([string]::IsNullOrWhiteSpace($EvidenceOutputPath)) {
    return
  }

  $directory = Split-Path -Parent $EvidenceOutputPath
  if (-not [string]::IsNullOrWhiteSpace($directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $script:evidenceLines | Set-Content -Path $EvidenceOutputPath -Encoding utf8
  Write-Host "Evidence written to $EvidenceOutputPath"
}

$exitCode = 0
try {
  $resolvedPeerAddresses = Split-ConfiguredList -Value $PeerAddresses -Fallback $env:FABRIC_PEER_ADDRESSES
  $resolvedPeerTlsRootCertFiles = Split-ConfiguredList -Value $PeerTlsRootCertFiles -Fallback $env:FABRIC_PEER_TLS_ROOT_CERT_FILES
  $peerCommand = Resolve-PeerCommand

  Write-Evidence "PBI-438 production-like audit-anchor smoke"
  Write-Evidence "Date: $([DateTimeOffset]::UtcNow.ToString('o'))"
  Write-Evidence "Channel: $ChannelName"
  Write-Evidence "Chaincode: $ChaincodeName"
  Write-Evidence "EventId: $EventId"
  Write-Evidence ""

  $missing = @()
  if (-not $peerCommand) { $missing += "peer CLI" }
  if ([string]::IsNullOrWhiteSpace($ChannelName)) { $missing += "FABRIC_CHANNEL_NAME/ChannelName" }
  if ([string]::IsNullOrWhiteSpace($ChaincodeName)) { $missing += "FABRIC_CHAINCODE_NAME/ChaincodeName" }
  if ([string]::IsNullOrWhiteSpace($OrdererAddress)) { $missing += "FABRIC_ORDERER_ADDRESS/OrdererAddress" }
  if ([string]::IsNullOrWhiteSpace($OrdererTlsCaFile) -or -not (Test-Path $OrdererTlsCaFile)) { $missing += "FABRIC_ORDERER_TLS_CA_FILE/ORDERER_CA" }
  if ($resolvedPeerAddresses.Count -eq 0) { $missing += "FABRIC_PEER_ADDRESSES/PeerAddresses" }
  if ($resolvedPeerTlsRootCertFiles.Count -eq 0) { $missing += "FABRIC_PEER_TLS_ROOT_CERT_FILES/PeerTlsRootCertFiles" }
  if ($resolvedPeerAddresses.Count -ne $resolvedPeerTlsRootCertFiles.Count) { $missing += "matching peer address and TLS root certificate counts" }
  if ([string]::IsNullOrWhiteSpace($OrgMspId)) { $missing += "CORE_PEER_LOCALMSPID/OrgMspId" }
  if ([string]::IsNullOrWhiteSpace($PeerMspConfigPath) -or -not (Test-Path $PeerMspConfigPath)) { $missing += "CORE_PEER_MSPCONFIGPATH/PeerMspConfigPath" }

  foreach ($certFile in $resolvedPeerTlsRootCertFiles) {
    if (-not (Test-Path $certFile)) {
      $missing += "peer TLS root certificate '$certFile'"
    }
  }

  Write-Check "peer CLI" ($null -ne $peerCommand) $(if ($peerCommand) { $peerCommand } else { "Install Fabric binaries and ensure peer is on PATH." })
  Write-Check "channel" (-not [string]::IsNullOrWhiteSpace($ChannelName)) $ChannelName
  Write-Check "chaincode" (-not [string]::IsNullOrWhiteSpace($ChaincodeName)) $ChaincodeName
  Write-Check "orderer address" (-not [string]::IsNullOrWhiteSpace($OrdererAddress)) $(if ($OrdererAddress) { $OrdererAddress } else { "Set FABRIC_ORDERER_ADDRESS." })
  Write-Check "orderer TLS CA" (-not [string]::IsNullOrWhiteSpace($OrdererTlsCaFile) -and (Test-Path $OrdererTlsCaFile)) $(if ($OrdererTlsCaFile) { $OrdererTlsCaFile } else { "Set FABRIC_ORDERER_TLS_CA_FILE or ORDERER_CA." })
  Write-Check "peer addresses" ($resolvedPeerAddresses.Count -gt 0) ($resolvedPeerAddresses -join ', ')
  Write-Check "peer TLS root cert files" ($resolvedPeerTlsRootCertFiles.Count -gt 0 -and $resolvedPeerAddresses.Count -eq $resolvedPeerTlsRootCertFiles.Count) ($resolvedPeerTlsRootCertFiles -join ', ')
  Write-Check "org MSP ID" (-not [string]::IsNullOrWhiteSpace($OrgMspId)) $(if ($OrgMspId) { $OrgMspId } else { "Set CORE_PEER_LOCALMSPID." })
  Write-Check "peer MSP config path" (-not [string]::IsNullOrWhiteSpace($PeerMspConfigPath) -and (Test-Path $PeerMspConfigPath)) $(if ($PeerMspConfigPath) { $PeerMspConfigPath } else { "Set CORE_PEER_MSPCONFIGPATH." })

  if ($PrerequisiteCheckOnly) {
    if ($missing.Count -gt 0) {
      Write-Evidence ""
      Write-Evidence "Prerequisite check completed. Live smoke is blocked by: $($missing -join ', ')."
      return
    }

    Write-Evidence ""
    Write-Evidence "Prerequisite check completed. Live smoke can be run without -PrerequisiteCheckOnly."
    return
  }

  if ($missing.Count -gt 0) {
    throw "Live production-like Fabric smoke prerequisites are missing: $($missing -join ', ')."
  }

  $env:CORE_PEER_TLS_ENABLED = "true"
  $env:CORE_PEER_LOCALMSPID = $OrgMspId
  $env:CORE_PEER_MSPCONFIGPATH = $PeerMspConfigPath
  $env:CORE_PEER_ADDRESS = $resolvedPeerAddresses[0]
  $env:CORE_PEER_TLS_ROOTCERT_FILE = $resolvedPeerTlsRootCertFiles[0]

  $anchor = [ordered]@{
    eventId = $EventId
    caseIdHash = $CaseIdHash
    eventType = "escrowCreated"
    payloadHash = $PayloadHash
    schemaVersion = "1.0"
    canonicalization = "json-canonical-v1"
    occurredAt = $OccurredAt
  }
  $anchorJson = $anchor | ConvertTo-Json -Compress

  $ordererArguments = @(
    "-o",
    $OrdererAddress,
    "--tls",
    "--cafile",
    $OrdererTlsCaFile
  )

  if (-not [string]::IsNullOrWhiteSpace($OrdererTlsHostnameOverride)) {
    $ordererArguments += @("--ordererTLSHostnameOverride", $OrdererTlsHostnameOverride)
  }

  $invokeSpec = @{ "function" = "anchorEvent"; Args = @($anchorJson) } | ConvertTo-Json -Compress
  $invokeArguments = @(
    "chaincode",
    "invoke"
  ) + $ordererArguments + @(
    "-C",
    $ChannelName,
    "-n",
    $ChaincodeName
  )
  $invokeArguments = Add-PeerEndpointArguments -TargetArguments $invokeArguments -Addresses $resolvedPeerAddresses -RootCertFiles $resolvedPeerTlsRootCertFiles
  $invokeArguments += @("--waitForEvent", "-c", $invokeSpec)

  Invoke-PeerCli -PeerCommand $peerCommand -Arguments $invokeArguments | Out-Null
  Write-Evidence "[PASS] anchorEvent committed for $EventId"

  $getSpec = @{ "function" = "getAnchor"; Args = @($EventId) } | ConvertTo-Json -Compress
  $getOutput = Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $getSpec)
  $getResult = Read-JsonResult $getOutput
  if ($getResult.eventId -ne $EventId -or $getResult.payloadHash -ne $PayloadHash) {
    throw "getAnchor did not return the submitted proof metadata."
  }
  Write-Evidence "[PASS] getAnchor returned the submitted anchor record"

  $verifiedSpec = @{ "function" = "verifyEvent"; Args = @($EventId, $PayloadHash) } | ConvertTo-Json -Compress
  $verifiedOutput = Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $verifiedSpec)
  $verifiedResult = Read-JsonResult $verifiedOutput
  Assert-VerificationStatus -Result $verifiedResult -Expected "verified"
  Write-Evidence "[PASS] verifyEvent returned verified for the correct hash"

  $mismatchSpec = @{ "function" = "verifyEvent"; Args = @($EventId, $MismatchPayloadHash) } | ConvertTo-Json -Compress
  $mismatchOutput = Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $mismatchSpec)
  $mismatchResult = Read-JsonResult $mismatchOutput
  Assert-VerificationStatus -Result $mismatchResult -Expected "mismatch"
  Write-Evidence "[PASS] verifyEvent returned mismatch for the wrong hash"

  $notFoundSpec = @{ "function" = "verifyEvent"; Args = @($MissingEventId, $PayloadHash) } | ConvertTo-Json -Compress
  $notFoundOutput = Invoke-PeerCli -PeerCommand $peerCommand -Arguments @("chaincode", "query", "-C", $ChannelName, "-n", $ChaincodeName, "-c", $notFoundSpec)
  $notFoundResult = Read-JsonResult $notFoundOutput
  Assert-VerificationStatus -Result $notFoundResult -Expected "notFound"
  Write-Evidence "[PASS] verifyEvent returned notFound for an unknown event"

  try {
    Invoke-PeerCli -PeerCommand $peerCommand -Arguments $invokeArguments | Out-Null
    throw "duplicate anchorEvent was unexpectedly accepted"
  } catch {
    $duplicateMessage = $_.Exception.Message
    if ($duplicateMessage -notmatch "DUPLICATE_ANCHOR|duplicate|already anchored") {
      throw "Duplicate anchor check failed for a non-duplicate reason: $duplicateMessage"
    }

    Write-Evidence "[PASS] duplicate anchorEvent was rejected"
  }

  Write-Evidence ""
  Write-Evidence "Production-like Fabric AuditAnchor smoke validation passed for eventId '$EventId'."
} catch {
  $exitCode = 1
  Write-Evidence ""
  Write-Evidence "[FAIL] $($_.Exception.Message)"
} finally {
  Write-EvidenceFile
}

if ($exitCode -ne 0) {
  exit $exitCode
}
