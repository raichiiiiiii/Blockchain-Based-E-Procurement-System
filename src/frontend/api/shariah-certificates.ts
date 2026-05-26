import { createSessionHeaders } from './auth-headers';
import { BackendApiError } from './errors';
import { requestJson } from './http-client';
import { createLocalDemoFallbackDisabledError, isLocalDemoFallbackEnabled } from '../lib/runtime-config';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type ShariahCertificateStatus = 'active' | 'expired' | 'revoked';

export type ShariahCertificate = {
  certificateId: string;
  issuedBy: string;
  reviewerBoard: string;
  fatwaReference: string;
  scope: string;
  contractTemplateVersion: string;
  conditions: string[];
  issuedAt: string;
  expiresAt?: string;
  status: ShariahCertificateStatus;
  certificateDocumentId?: string;
  certificateHash: string;
  createdByUserId: string;
  createdAt: string;
  revokedAt?: string;
  revocationReason?: string;
};

export type RegisterShariahCertificateRequest = {
  issuedBy: string;
  reviewerBoard: string;
  fatwaReference: string;
  scope: string;
  contractTemplateVersion: string;
  conditions: string[];
  issuedAt?: string;
  expiresAt?: string;
  certificateDocumentId?: string;
};

const CERTIFICATE_STORAGE_KEY = 'eprocurement.shariah.certificates.v1';

const seedCertificates: ShariahCertificate[] = [
  {
    certificateId: 'shariah-certificate-mudarabah-v1',
    issuedBy: 'MVP Shariah Governance Board',
    reviewerBoard: 'Restricted PLS Seedbed Review Panel',
    fatwaReference: 'FATWA-MVP-PLS-001',
    scope: 'restricted-pls-seedbed',
    contractTemplateVersion: 'mudarabah-procurement-v1',
    conditions: [
      'Simulation-only PLS distribution records',
      'No guaranteed profit or principal',
      'No external payment execution',
    ],
    issuedAt: '2026-05-20T00:00:00.000Z',
    expiresAt: '2027-05-20T00:00:00.000Z',
    status: 'active',
    certificateDocumentId: 'doc-shariah-certificate-demo',
    certificateHash: 'sha256:demo-shariah-certificate-hash',
    createdByUserId: 'demo-shariah-user',
    createdAt: '2026-05-20T00:00:00.000Z',
  },
];

function isBackendSession(session?: AuthenticatedFrontendSession): boolean {
  return session?.source === 'backend';
}

function roles(session?: AuthenticatedFrontendSession): string[] {
  return session?.actor.actorRoleCodes ?? [];
}

function assertLocalFallbackEnabled(feature: string): void {
  if (!isLocalDemoFallbackEnabled()) {
    throw createLocalDemoFallbackDisabledError(feature);
  }
}

function canReadCertificates(session?: AuthenticatedFrontendSession): boolean {
  return roles(session).some(role => ['administrator', 'shariahReviewer', 'financier', 'auditor', 'regulator'].includes(role));
}

function canWriteCertificates(session?: AuthenticatedFrontendSession): boolean {
  return roles(session).some(role => ['administrator', 'shariahReviewer'].includes(role));
}

function readCertificates(): ShariahCertificate[] {
  if (typeof window === 'undefined') {
    return seedCertificates.map(certificate => ({ ...certificate }));
  }

  const stored = window.localStorage.getItem(CERTIFICATE_STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(CERTIFICATE_STORAGE_KEY, JSON.stringify(seedCertificates));
    return seedCertificates.map(certificate => ({ ...certificate }));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as ShariahCertificate[];
    }
  } catch {
    window.localStorage.setItem(CERTIFICATE_STORAGE_KEY, JSON.stringify(seedCertificates));
  }

  return seedCertificates.map(certificate => ({ ...certificate }));
}

function writeCertificates(certificates: ShariahCertificate[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CERTIFICATE_STORAGE_KEY, JSON.stringify(certificates));
}

export async function listShariahCertificates(session?: AuthenticatedFrontendSession): Promise<ShariahCertificate[]> {
  if (!isBackendSession(session)) {
    assertLocalFallbackEnabled('Shariah certificate artifacts');
    if (!canReadCertificates(session)) {
      throw new BackendApiError('FORBIDDEN', 'User is not allowed to view Shariah certificate artifacts');
    }

    return readCertificates();
  }

  const response = await requestJson<{ items: ShariahCertificate[] }>('/api/v1/shariah/certificates', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}

export async function registerShariahCertificate(
  payload: RegisterShariahCertificateRequest,
  session?: AuthenticatedFrontendSession,
): Promise<ShariahCertificate> {
  if (!isBackendSession(session)) {
    assertLocalFallbackEnabled('Shariah certificate artifact registration');
    if (!canWriteCertificates(session)) {
      throw new BackendApiError('FORBIDDEN', 'User is not allowed to register Shariah certificate artifacts');
    }

    const now = new Date().toISOString();
    const certificate: ShariahCertificate = {
      certificateId: `shariah-certificate-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now()}`,
      ...payload,
      status: 'active',
      certificateHash: `sha256:local-${Date.now()}`,
      createdByUserId: session?.actor.actorUserId ?? 'demo-shariah-user',
      issuedAt: payload.issuedAt ?? now,
      createdAt: now,
    };
    writeCertificates([certificate, ...readCertificates()]);
    return certificate;
  }

  return requestJson<ShariahCertificate>('/api/v1/shariah/certificates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify(payload),
  });
}
