import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { ShariahCertificate } from '../domain/shariah-certificate.js';
import { PostgresShariahCertificateRepository } from './postgres-shariah-certificate-repository.js';

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakePostgresExecutor implements PostgresExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly responses: QueryResultRow[][]) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) {
    this.queries.push({ text, values });
    const rows = (this.responses.shift() ?? []) as T[];
    return {
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }
}

const certificate: ShariahCertificate = {
  certificateId: 'shariah-certificate-mudarabah-v1',
  issuedBy: 'MVP Shariah Governance Board',
  reviewerBoard: 'Restricted PLS Seedbed Review Panel',
  fatwaReference: 'FATWA-MVP-PLS-001',
  scope: 'restricted-pls-seedbed',
  contractTemplateVersion: 'mudarabah-procurement-v1',
  conditions: [
    'Simulation-only PLS distribution records',
    'No guaranteed profit or principal',
  ],
  issuedAt: '2026-05-20T00:00:00.000Z',
  expiresAt: '2027-05-20T00:00:00.000Z',
  status: 'active',
  certificateDocumentId: 'doc-shariah-certificate-demo',
  certificateHash: 'sha256:demo-shariah-certificate-hash',
  createdByUserId: 'demo-shariah-user',
  createdAt: '2026-05-20T00:00:00.000Z',
};

const certificateRow = {
  certificate_id: certificate.certificateId,
  issued_by: certificate.issuedBy,
  reviewer_board: certificate.reviewerBoard,
  fatwa_reference: certificate.fatwaReference,
  scope: certificate.scope,
  contract_template_version: certificate.contractTemplateVersion,
  conditions: certificate.conditions,
  issued_at: new Date(certificate.issuedAt),
  expires_at: new Date(certificate.expiresAt ?? ''),
  status: certificate.status,
  certificate_document_id: certificate.certificateDocumentId,
  certificate_hash: certificate.certificateHash,
  created_by_user_id: certificate.createdByUserId,
  created_at: new Date(certificate.createdAt),
  revoked_at: null,
  revocation_reason: null,
};

test('PostgresShariahCertificateRepository saves certificate metadata without raw certification documents', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresShariahCertificateRepository(db);

  const saved = await repository.save(certificate);

  assert.strictEqual(saved.certificateId, certificate.certificateId);
  assert.deepStrictEqual(saved.conditions, certificate.conditions);
  assert.match(db.queries[0].text, /INSERT INTO shariah_certificates/);
  assert.strictEqual(db.queries[0].values?.[0], certificate.certificateId);
  assert.strictEqual(db.queries[0].values?.[6], JSON.stringify(certificate.conditions));
  assert.strictEqual(db.queries[0].values?.[11], certificate.certificateHash);
});

test('PostgresShariahCertificateRepository finds and maps active certificate artifacts', async () => {
  const db = new FakePostgresExecutor([[certificateRow]]);
  const repository = new PostgresShariahCertificateRepository(db);

  const found = await repository.findById(certificate.certificateId);

  assert.strictEqual(found?.certificateId, certificate.certificateId);
  assert.strictEqual(found?.issuedAt, certificate.issuedAt);
  assert.strictEqual(found?.expiresAt, certificate.expiresAt);
  assert.deepStrictEqual(found?.conditions, certificate.conditions);
  assert.match(db.queries[0].text, /WHERE certificate_id = \$1/);
});

test('PostgresShariahCertificateRepository lists certificate artifacts in stable created order', async () => {
  const db = new FakePostgresExecutor([[certificateRow]]);
  const repository = new PostgresShariahCertificateRepository(db);

  const certificates = await repository.list();

  assert.strictEqual(certificates[0]?.certificateId, certificate.certificateId);
  assert.match(db.queries[0].text, /ORDER BY created_at DESC, certificate_id ASC/);
});

test('PostgresShariahCertificateRepository maps revoked certificates', async () => {
  const revokedAt = '2026-06-01T00:00:00.000Z';
  const db = new FakePostgresExecutor([[
    {
      ...certificateRow,
      status: 'revoked',
      revoked_at: new Date(revokedAt),
      revocation_reason: 'Template retired after governance review',
    },
  ]]);
  const repository = new PostgresShariahCertificateRepository(db);

  const found = await repository.findById(certificate.certificateId);

  assert.strictEqual(found?.status, 'revoked');
  assert.strictEqual(found?.revokedAt, revokedAt);
  assert.strictEqual(found?.revocationReason, 'Template retired after governance review');
});

test('PostgresShariahCertificateRepository returns null for missing certificates', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresShariahCertificateRepository(db);

  const found = await repository.findById('missing-certificate');

  assert.strictEqual(found, null);
});
