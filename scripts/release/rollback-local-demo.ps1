param(
  [string]$TargetCommit,
  [string]$ComposeFile = "docker-compose.app.yml",
  [switch]$ResetDatabase,
  [switch]$SkipGitSwitch,
  [switch]$Execute,
  [switch]$ConfirmRollback
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Execute) {
  Write-Host "Dry run: rollback steps would be:"
  if ($TargetCommit -and -not $SkipGitSwitch) {
    Write-Host "  - verify a clean working tree"
    Write-Host "  - switch to commit $TargetCommit in detached HEAD mode"
  }
  Write-Host "  - rebuild/restart the local demo from the selected code"
  if ($ResetDatabase) {
    Write-Host "  - stop compose stack and remove local database volume"
  }
  Write-Host "Run with -Execute -ConfirmRollback after backup and approval."
  exit 0
}

if (-not $ConfirmRollback) {
  throw "Rollback can disrupt local state. Re-run with -Execute -ConfirmRollback after confirming backup and approval."
}

if ($TargetCommit -and -not $SkipGitSwitch) {
  $dirty = git status --porcelain
  if ($dirty) {
    throw "Working tree is not clean. Commit, stash, or discard changes before rollback."
  }

  git switch --detach $TargetCommit
  if ($LASTEXITCODE -ne 0) {
    throw "git switch failed with exit code $LASTEXITCODE."
  }
}

if ($ResetDatabase) {
  docker compose -f $ComposeFile down -v
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose down -v failed with exit code $LASTEXITCODE."
  }
}

Write-Host "Rollback command sequence completed. Re-run the deployable MVP startup or smoke script from the selected code."
