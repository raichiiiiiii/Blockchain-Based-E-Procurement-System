param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDir = "backups/postgres",
  [switch]$Execute
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DATABASE_URL is required. Pass -DatabaseUrl or set the DATABASE_URL environment variable."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resolvedOutputDir = Join-Path (Get-Location) $OutputDir
$backupPath = Join-Path $resolvedOutputDir "pls-platform-$timestamp.dump"

if (-not $Execute) {
  Write-Host "Dry run: PostgreSQL backup would be written to $backupPath"
  Write-Host "Run with -Execute to call pg_dump. The database URL is intentionally not printed."
  exit 0
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "pg_dump was not found on PATH. Install PostgreSQL client tools before running backup."
}

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

& $pgDump.Source --format=custom --file=$backupPath $DatabaseUrl
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE."
}

Write-Host "PostgreSQL backup created: $backupPath"
