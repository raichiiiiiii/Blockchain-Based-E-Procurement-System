import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPostgresPool } from '../../src/infrastructure/database/postgres-client.js';
import { loadDatabaseConfig } from '../../src/infrastructure/database/database-config.js';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

async function loadMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort();
}

async function validateMigrationFiles(files: string[]): Promise<void> {
  if (files.length === 0) {
    throw new Error('No migration files found');
  }

  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (sql.trim().length === 0) {
      throw new Error(`Migration ${file} is empty`);
    }
  }
}

async function migrate(): Promise<void> {
  const files = await loadMigrationFiles();
  await validateMigrationFiles(files);

  if (isDryRun()) {
    console.log(`Validated ${files.length} migration file(s): ${files.join(', ')}`);
    return;
  }

  const config = loadDatabaseConfig();
  if (!config.migrationsEnabled) {
    console.log('DB_MIGRATIONS_ENABLED is not true; skipping migration execution.');
    return;
  }

  const pool = createPostgresPool(config);
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    for (const file of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file],
      );

      if ((existing.rowCount ?? 0) > 0) {
        console.log(`Skipping already applied migration ${file}`);
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`Applied migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
