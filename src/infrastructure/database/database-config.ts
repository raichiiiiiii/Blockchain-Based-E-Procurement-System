export type DatabaseSslMode = 'disable' | 'require';

export type DatabaseConfig = {
  databaseUrl?: string;
  sslMode: DatabaseSslMode;
  migrationsEnabled: boolean;
  demoSeedEnabled: boolean;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function parseSslMode(value: string | undefined): DatabaseSslMode {
  return value === 'require' ? 'require' : 'disable';
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    databaseUrl: env.DATABASE_URL,
    sslMode: parseSslMode(env.DATABASE_SSL_MODE),
    migrationsEnabled: parseBoolean(env.DB_MIGRATIONS_ENABLED, false),
    demoSeedEnabled: parseBoolean(env.DEMO_SEED_ENABLED, false),
  };
}

export function requireDatabaseUrl(config: DatabaseConfig): string {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL persistence commands');
  }

  return config.databaseUrl;
}
