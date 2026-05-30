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
  Write-Host "[PBI-438 evidence] $Message"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$workspace = Get-FullPathValue $ExternalWorkspace
Assert-OutsideRepository -RepoRoot $repoRoot -TargetPath $workspace

$template = Join-Path $repoRoot "docs/evidence/templates/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION_TEMPLATE.md"
$draft = Join-Path $workspace "evidence/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION_DRAFT.md"

if (-not (Test-Path $template)) {
  throw "Missing evidence template: $template"
}

Write-Step "Repository: $repoRoot"
Write-Step "External workspace: $workspace"
Write-Step "Mode: $(if ($Execute) { 'execute' } else { 'dry-run' })"

$expectedEvidence = @(
  "logs",
  "evidence/channel-lifecycle-procurement-proof-channel.txt",
  "evidence/chaincode-lifecycle-audit-anchor.txt",
  "evidence/pbi438-audit-anchor-smoke.txt",
  "evidence/backend-readiness.json",
  "evidence/proof-api-get-anchor.json",
  "evidence/proof-api-verify-match.json",
  "evidence/proof-api-verify-mismatch.json",
  "evidence/browser-smoke-notes.md"
)

foreach ($relative in $expectedEvidence) {
  $path = Join-Path $workspace $relative
  Write-Step "$(if (Test-Path $path) { 'found' } else { 'missing' }) $path"
}

if ($Execute) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $draft) -Force | Out-Null
  $content = Get-Content -Raw -Path $template
  $dateToken = "``YYYY-MM-DD``"
  $dateValue = "``$(Get-Date -Format yyyy-MM-dd)``"
  $content = $content.Replace($dateToken, $dateValue)
  $content = $content.Replace("<external path, no secrets>", $workspace)
  Set-Content -Path $draft -Value $content -Encoding utf8
  Write-Step "Draft evidence written outside repository: $draft"
  Write-Step "Review and sanitize this draft before manually copying it to docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md."
} else {
  Write-Step "Dry run only. Re-run with -Execute to create an external evidence draft."
}
