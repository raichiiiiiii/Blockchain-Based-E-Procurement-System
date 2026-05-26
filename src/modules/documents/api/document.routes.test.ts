import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryDocumentRepository } from '../infrastructure/in-memory-document-repository.js';
import { InMemoryDocumentStorageAdapter } from '../infrastructure/in-memory-document-storage-adapter.js';
import { LocalDocumentTextExtractionAdapter } from '../infrastructure/local-document-text-extraction-adapter.js';
import {
  createLocalDetachedSignature,
  LocalSignatureMetadataAdapter,
} from '../infrastructure/local-signature-metadata-adapter.js';

async function createSession(
  repository: InMemoryAuthSessionRepository,
  input: {
    token: string;
    actorUserId: string;
    actorOrganizationId: string;
    actorRoleCodes: string[];
  },
) {
  await repository.save({
    sessionId: `session-${input.actorUserId}`,
    tokenHash: hashToken(input.token),
    actorUserId: input.actorUserId,
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
  });
}

async function createDocumentTestContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const documentRepository = new InMemoryDocumentRepository();

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'buyer-user',
    actorOrganizationId: 'buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'other-buyer-token',
    actorUserId: 'other-buyer-user',
    actorOrganizationId: 'other-buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'auditor-token',
    actorUserId: 'auditor-user',
    actorOrganizationId: 'audit-org',
    actorRoleCodes: ['auditor'],
  });

  const server = createTestableServer({
    sessionRepository,
    documentRepository,
    documentStorage: new InMemoryDocumentStorageAdapter(),
    documentTextExtractor: new LocalDocumentTextExtractionAdapter(),
    signatureVerifier: new LocalSignatureMetadataAdapter(),
  });
  await server.ready();

  return { server, documentRepository };
}

const contractText = [
  'Contract Title: Amanah Retail Supply Agreement',
  'Buyer: Amanah Retail Sdn Bhd',
  'Supplier: Barakah Supplies Sdn Bhd',
  'Financier: Mabrur Finance Partner',
  'Registration Number: MY-2026-001',
  'Effective Date: 2026-05-26',
  'Expiry Date: 2026-12-31',
  'Goods/Services: Halal-certified packaging supplies',
  'Quantity: 500 cartons',
  'Price: 12000.00',
  'Currency: MYR',
  'Delivery Terms: Supplier records delivery evidence before escrow review.',
  'Payment Terms: Escrow-backed MVP settlement instruction only.',
  'Escrow Terms: Release requires buyer review and proof metadata.',
  'Dispute Clause: Manual arbitration applies in the MVP.',
  'Governing Law: Malaysia',
  'Signature: Buyer operations lead',
  'Attachment: Delivery schedule',
].join('\n');

function validUploadPayload(overrides: Record<string, unknown> = {}) {
  return {
    documentType: 'contract',
    filename: 'amanah-barakah-contract.txt',
    mimeType: 'text/plain',
    textContent: contractText,
    ...overrides,
  };
}

test('authorized user uploads a document, stores metadata, and extracts contract JSON fields', async () => {
  const { server } = await createDocumentTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    headers: { authorization: 'Bearer buyer-token' },
    payload: validUploadPayload(),
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.strictEqual(body.data.ownerOrganizationId, 'buyer-org');
  assert.strictEqual(body.data.uploadedByUserId, 'buyer-user');
  assert.strictEqual(body.data.documentType, 'contract');
  assert.match(body.data.sha256, /^sha256:[a-f0-9]{64}$/);
  assert.strictEqual(body.data.extractionStatus, 'extracted');
  assert.strictEqual(body.data.signatureStatus, 'notProvided');
  assert.strictEqual(body.data.rawDocument, undefined);

  const extractionResponse = await server.inject({
    method: 'GET',
    url: `/api/v1/documents/${body.data.documentId}/extraction`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  const extractionBody = extractionResponse.json();
  assert.strictEqual(extractionResponse.statusCode, 200);
  assert.strictEqual(extractionBody.data.extractedFields.contractTitle, 'Amanah Retail Supply Agreement');
  assert.strictEqual(extractionBody.data.extractedFields.parties.buyer, 'Amanah Retail Sdn Bhd');
  assert.strictEqual(extractionBody.data.extractedFields.parties.supplier, 'Barakah Supplies Sdn Bhd');
});

test('local detached signature metadata can be verified without claiming legal certification', async () => {
  const { server } = await createDocumentTestContext();
  const documentHash = `sha256:${createHash('sha256').update(Buffer.from(contractText, 'utf8')).digest('hex')}`;
  const signatureValue = createLocalDetachedSignature(documentHash, 'cert-local-1');

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    headers: { authorization: 'Bearer buyer-token' },
    payload: validUploadPayload({
      signature: {
        signatureType: 'detachedSha256',
        signatureValue,
        certificateId: 'cert-local-1',
        signerName: 'Amanah Retail operations lead',
        signedAt: '2026-05-26T08:00:00.000Z',
      },
    }),
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.strictEqual(body.data.signatureStatus, 'verified');
  assert.strictEqual(body.data.signatureMetadata.trustModel, 'localMetadataOnly');
  assert.match(body.data.signatureMetadata.verificationSummary, /not a legal e-signature validation/i);
});

test('invalid detached signature metadata is recorded as invalid', async () => {
  const { server } = await createDocumentTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    headers: { authorization: 'Bearer buyer-token' },
    payload: validUploadPayload({
      signature: {
        signatureType: 'detachedSha256',
        signatureValue: `sha256:${'0'.repeat(64)}`,
        certificateId: 'cert-local-1',
      },
    }),
  });

  assert.strictEqual(response.statusCode, 201);
  assert.strictEqual(response.json().data.signatureStatus, 'invalid');
});

test('unsupported binary extraction remains explicit and stores no raw payload in response', async () => {
  const { server } = await createDocumentTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    headers: { authorization: 'Bearer buyer-token' },
    payload: validUploadPayload({
      filename: 'contract.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('%PDF-1.4 placeholder').toString('base64'),
      textContent: undefined,
    }),
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.strictEqual(body.data.extractionStatus, 'unsupported');
  assert.strictEqual(body.data.rawDocument, undefined);
});

test('unrelated buyer cannot read another organization document while auditor can read metadata', async () => {
  const { server } = await createDocumentTestContext();

  const createResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    headers: { authorization: 'Bearer buyer-token' },
    payload: validUploadPayload(),
  });
  const documentId = createResponse.json().data.documentId;

  const forbiddenResponse = await server.inject({
    method: 'GET',
    url: `/api/v1/documents/${documentId}`,
    headers: { authorization: 'Bearer other-buyer-token' },
  });
  assert.strictEqual(forbiddenResponse.statusCode, 403);

  const auditorResponse = await server.inject({
    method: 'GET',
    url: `/api/v1/documents/${documentId}`,
    headers: { authorization: 'Bearer auditor-token' },
  });
  assert.strictEqual(auditorResponse.statusCode, 200);
  assert.strictEqual(auditorResponse.json().data.documentId, documentId);
});

test('anonymous and invalid document uploads use standard error envelopes', async () => {
  const { server } = await createDocumentTestContext();

  const anonymousResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    payload: validUploadPayload(),
  });
  assert.strictEqual(anonymousResponse.statusCode, 401);
  assert.strictEqual(anonymousResponse.json().error.code, 'UNAUTHORIZED');

  const invalidResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/documents',
    headers: { authorization: 'Bearer buyer-token' },
    payload: {
      documentType: 'contract',
      filename: 'payload.exe',
      mimeType: 'application/x-msdownload',
      contentBase64: Buffer.from('unsafe').toString('base64'),
    },
  });
  assert.strictEqual(invalidResponse.statusCode, 400);
  assert.strictEqual(invalidResponse.json().error.code, 'VALIDATION_ERROR');
});
