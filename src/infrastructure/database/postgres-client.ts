import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { loadDatabaseConfig, requireDatabaseUrl, type DatabaseConfig } from './database-config.js';

export type PostgresExecutor = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<T>>;
};

export function createPostgresPool(config: DatabaseConfig = loadDatabaseConfig()): Pool {
  const poolConfig: PoolConfig = {
    connectionString: requireDatabaseUrl(config),
  };

  if (config.sslMode === 'require') {
    poolConfig.ssl = { rejectUnauthorized: true };
  }

  return new Pool(poolConfig);
}
