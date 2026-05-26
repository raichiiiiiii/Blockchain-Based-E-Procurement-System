param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [switch]$Execute,
  [switch]$ConfirmRestore
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DATABASE_URL is required. Pass -DatabaseUrl or set the DATABASE_URL environment variable."
}

if (-not $Execute) {
  Write-Host "Dry run: PostgreSQL restore would read $BackupFile"
  Write-Host "Run with -Execute -ConfirmRestore to call pg_restore. The database URL is intentionally not printed."
  exit 0
}

if (-not $ConfirmRestore) {
  throw "Restore is potentially destructive. Re-run with -Execute -ConfirmRestore after confirming the target database is correct."
}

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$resolvedBackup = Resolve-Path -LiteralPath $BackupFile

$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) {
  throw "pg_restore was not found on PATH. Install PostgreSQL client tools before running restore."
}

& $pgRestore.Source --clean --if-exists --no-owner --dbname=$DatabaseUrl $resolvedBackup
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with exit code $LASTEXITCODE."
}

Write-Host "PostgreSQL restore completed from: $resolvedBackup"
