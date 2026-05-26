# Backup Restore Rollback Runbook

Date: 2026-05-26

Readiness statement: This runbook supports local deployable MVP and internal pilot rehearsal recovery. It is not a production disaster-recovery, high-availability, legal-retention, or managed backup program.

## Purpose

This runbook gives operators a safe path to back up PostgreSQL data, restore a local database, reset demo data, and roll back the local demo to a previous commit or image state.

## Scope

Covered:

- PostgreSQL logical backup using `pg_dump`
- PostgreSQL restore using `pg_restore`
- local Docker volume reset guidance
- local demo rollback by Git commit
- app image rollback by branch/commit rebuild
- logs and recovery checks

Not covered:

- production HA failover
- production point-in-time recovery
- Fabric peer/orderer ledger backup
- KMS/HSM key recovery
- object-storage document backup
- production payment-provider reconciliation

## Prerequisites

- Repository checkout on the target branch or commit.
- Docker available for local compose workflows.
- PostgreSQL client tools available if running backup/restore scripts:
  - `pg_dump`
  - `pg_restore`
- `DATABASE_URL` set for the target database, or supplied with `-DatabaseUrl`.
- Operator approval before any destructive restore/reset.

## Backup PostgreSQL

Dry-run first:

```powershell
.\scripts\db\backup-postgres.ps1
```

Execute backup:

```powershell
$env:DATABASE_URL = "postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
.\scripts\db\backup-postgres.ps1 -Execute
```

Default output:

```text
backups/postgres/pls-platform-YYYYMMDD-HHMMSS.dump
```

The `backups/` directory is ignored by Git. Do not commit database dump files.

## Restore PostgreSQL

Dry-run first:

```powershell
.\scripts\db\restore-postgres.ps1 -BackupFile .\backups\postgres\pls-platform-example.dump
```

Execute restore only after confirming the target database:

```powershell
$env:DATABASE_URL = "postgres://pls_app:pls_app_password@localhost:5432/pls_platform"
.\scripts\db\restore-postgres.ps1 -BackupFile .\backups\postgres\pls-platform-example.dump -Execute -ConfirmRestore
```

The restore script uses `pg_restore --clean --if-exists --no-owner`. This can replace objects in the target database. Use it only after backup and approval.

## Reset Local Demo Data

For local demo only:

```powershell
docker compose -f docker-compose.app.yml down -v
docker compose -f docker-compose.app.yml up --build -d
```

The `down -v` command removes the local database volume. It destroys local demo state.

For the PostgreSQL-only local dev compose:

```powershell
docker compose down -v
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Use the reset path only in local environments.

## Roll Back Local Demo Code

Dry-run:

```powershell
.\scripts\release\rollback-local-demo.ps1 -TargetCommit <commit>
```

Execute after backup and approval:

```powershell
.\scripts\release\rollback-local-demo.ps1 -TargetCommit <commit> -Execute -ConfirmRollback
```

If the database must also be reset:

```powershell
.\scripts\release\rollback-local-demo.ps1 -TargetCommit <commit> -ResetDatabase -Execute -ConfirmRollback
```

The rollback script refuses to switch commits when the working tree is dirty.

## App Image Rollback

The MVP compose model builds local images from the current checkout. To roll back an app image:

1. Confirm the target commit hash.
2. Back up the database if preserving data matters.
3. Switch to the target commit or branch.
4. Rebuild the compose stack:

```powershell
docker compose -f docker-compose.app.yml up --build -d
```

5. Run smoke validation:

```powershell
.\scripts\smoke\deployable-smoke-test.ps1 -SkipComposeUp
```

## Migration Rollback Limitation

The current migration runner is forward-only. There is no automated down-migration framework. If a migration must be reversed:

1. Stop the application.
2. Back up the current database.
3. Restore the last known-good backup into a clean database.
4. Run the target application commit against the restored database.
5. Record the incident and corrective action.

## Fabric Proof Data

The current local Fabric baseline is not a production consortium. For MVP proof data:

- PostgreSQL stores anchor metadata and should be backed up with the database.
- Fabric live test-network ledger backup is environment-specific and remains outside this local runbook.
- Do not treat a local Fabric test-network reset as production data recovery.

## Logs And Troubleshooting

Useful checks:

```powershell
docker compose -f docker-compose.app.yml ps
docker compose -f docker-compose.app.yml logs backend
docker compose -f docker-compose.app.yml logs postgres
docker compose -f docker-compose.app.yml logs frontend
```

Health checks:

```text
http://127.0.0.1:3100/health
http://127.0.0.1:3100/ready
```

Protected operator check:

```text
GET /api/v1/ops/status
```

## Recovery Checklist

- Backup exists and is readable.
- Target commit or image is known.
- Destructive commands were approved.
- Database restore or reset completed.
- Migrations and seed state are understood.
- Backend `/ready` is `ready`.
- Frontend loads.
- Credential login works for `admin.demo`.
- Security Status can show operational alerts if dependencies degrade.
- Known limitations remain documented.
