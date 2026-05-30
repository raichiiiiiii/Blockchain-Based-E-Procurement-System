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
  Write-Host "[PBI-438 CA/MSP] $Message"
}

function Get-RequiredEnv {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable '$Name'. Keep the value outside the repository."
  }
  return $value
}

function Invoke-FabricCa {
  param([string[]]$Arguments)
  $fabricCaClient = Get-Command fabric-ca-client -ErrorAction SilentlyContinue
  if (-not $fabricCaClient) {
    throw "fabric-ca-client is not on PATH."
  }
  & $fabricCaClient.Source @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "fabric-ca-client failed with exit code $LASTEXITCODE."
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$workspace = Get-FullPathValue $ExternalWorkspace
Assert-OutsideRepository -RepoRoot $repoRoot -TargetPath $workspace

$orgs = @(
  @{ Key = "ORDERER"; Display = "OrdererOrg"; MspId = "OrdererOrgMSP"; Domain = "consortium.example.test"; CaName = "ca-orderer"; Port = "6054"; OrgPath = "ordererOrganizations/consortium.example.test"; Nodes = @("orderer1", "orderer2", "orderer3"); NodeType = "orderer" },
  @{ Key = "PLATFORM"; Display = "Platform Operator"; MspId = "PlatformOperatorMSP"; Domain = "platform.example.test"; CaName = "ca-platform"; Port = "7054"; OrgPath = "peerOrganizations/platform.example.test"; Nodes = @("peer0"); NodeType = "peer" },
  @{ Key = "BUYER"; Display = "Buyer"; MspId = "BuyerMSP"; Domain = "buyer.example.test"; CaName = "ca-buyer"; Port = "8054"; OrgPath = "peerOrganizations/buyer.example.test"; Nodes = @("peer0"); NodeType = "peer" },
  @{ Key = "SUPPLIER"; Display = "Supplier"; MspId = "SupplierMSP"; Domain = "supplier.example.test"; CaName = "ca-supplier"; Port = "9054"; OrgPath = "peerOrganizations/supplier.example.test"; Nodes = @("peer0"); NodeType = "peer" },
  @{ Key = "FINANCIER"; Display = "Financier"; MspId = "FinancierMSP"; Domain = "financier.example.test"; CaName = "ca-financier"; Port = "10054"; OrgPath = "peerOrganizations/financier.example.test"; Nodes = @("peer0"); NodeType = "peer" },
  @{ Key = "REGULATOR_AUDITOR"; Display = "Regulator Auditor"; MspId = "RegulatorAuditorMSP"; Domain = "regulatorauditor.example.test"; CaName = "ca-regulatorauditor"; Port = "11054"; OrgPath = "peerOrganizations/regulatorauditor.example.test"; Nodes = @("peer0"); NodeType = "peer" }
)

Write-Step "Repository: $repoRoot"
Write-Step "External workspace: $workspace"
Write-Step "Mode: $(if ($Execute) { 'execute' } else { 'dry-run' })"
Write-Host ""

foreach ($org in $orgs) {
  $caUrl = "https://localhost:$($org.Port)"
  $tlsCert = Join-Path $workspace "crypto/fabric-ca/$($org.Key.ToLowerInvariant().Replace('_', ''))/tls-cert.pem"
  $orgRoot = Join-Path $workspace "crypto/$($org.OrgPath)"
  $orgMsp = Join-Path $orgRoot "msp"
  $adminMsp = Join-Path $orgRoot "users/Admin@$($org.Domain)/msp"
  $appWallet = Join-Path $workspace "wallets/$($org.MspId)-app"

  Write-Step "Organization $($org.Display) ($($org.MspId)) via $caUrl"
  Write-Step "$(if ($Execute) { 'will enroll' } else { 'would enroll' }) org MSP to $orgMsp"
  Write-Step "$(if ($Execute) { 'will enroll' } else { 'would enroll' }) admin identity to $adminMsp"
  Write-Step "$(if ($Execute) { 'will prepare' } else { 'would prepare' }) app wallet folder $appWallet"

  if ($Execute) {
    $adminId = Get-RequiredEnv "$($org.Key)_CA_BOOTSTRAP_ID"
    $adminSecret = Get-RequiredEnv "$($org.Key)_CA_BOOTSTRAP_SECRET"
    New-Item -ItemType Directory -Path $orgMsp, $adminMsp, $appWallet -Force | Out-Null

    Invoke-FabricCa @(
      "enroll",
      "-u",
      "https://$adminId`:$adminSecret@localhost:$($org.Port)",
      "--caname",
      $org.CaName,
      "--tls.certfiles",
      $tlsCert,
      "--mspdir",
      $adminMsp
    )

    Invoke-FabricCa @(
      "enroll",
      "-u",
      "https://$adminId`:$adminSecret@localhost:$($org.Port)",
      "--caname",
      $org.CaName,
      "--tls.certfiles",
      $tlsCert,
      "--mspdir",
      $orgMsp
    )
  }

  foreach ($node in $org.Nodes) {
    $nodeDomain = "$node.$($org.Domain)"
    $nodeMsp = if ($org.NodeType -eq "orderer") {
      Join-Path $orgRoot "orderers/$nodeDomain/msp"
    } else {
      Join-Path $orgRoot "peers/$nodeDomain/msp"
    }
    $nodeTls = if ($org.NodeType -eq "orderer") {
      Join-Path $orgRoot "orderers/$nodeDomain/tls"
    } else {
      Join-Path $orgRoot "peers/$nodeDomain/tls"
    }

    Write-Step "$(if ($Execute) { 'will enroll' } else { 'would enroll' }) $nodeDomain MSP to $nodeMsp"
    Write-Step "$(if ($Execute) { 'will enroll' } else { 'would enroll' }) $nodeDomain TLS to $nodeTls"

    if ($Execute) {
      New-Item -ItemType Directory -Path $nodeMsp, $nodeTls -Force | Out-Null
      Write-Step "Register/enroll commands for $nodeDomain require operator-provided node identity secrets; keep them outside the repository."
    }
  }

  Write-Host ""
}

if (-not $Execute) {
  Write-Step "Dry run only. Re-run with -Execute after CA containers are running and bootstrap env vars are set."
}
