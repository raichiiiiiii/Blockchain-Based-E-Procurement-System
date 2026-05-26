import { createHash } from 'node:crypto';
import type { PlsContract } from '../../financing/domain/pls-contract.js';
import type { ShariahCertificate } from '../domain/shariah-certificate.js';
import type { ShariahCertificateRepository } from './shariah-certificate-repository.js';

export type ValidationIssue = {
  path: string;
  message: string;
};

export type RegisterShariahCertificateInput = {
  issuedBy?: string;
  reviewerBoard?: string;
  fatwaReference?: string;
  scope?: string;
  contractTemplateVersion?: string;
  conditions?: string[];
  issuedAt?: string;
  expiresAt?: string;
  certificateDocumentId?: string;
  createdByUserId?: string;
};

export type RegisterShariahCertificateResult =
  | { status: 'created'; certificate: ShariahCertificate }
  | { status: 'invalidInput'; issues: ValidationIssue[] };

export type RevokeShariahCertificateResult =
  | { status: 'revoked'; certificate: ShariahCertificate }
  | { status: 'notFound' }
  | { status: 'alreadyRevoked'; certificate: ShariahCertificate };

export type ShariahCertificateCoverageResult =
  | { status: 'covered'; certificate: ShariahCertificate }
  | { status: 'missing' }
  | { status: 'notFound' }
  | { status: 'inactive'; certificate: ShariahCertificate }
  | { status: 'expired'; certificate: ShariahCertificate }
  | { status: 'templateMismatch'; certificate: ShariahCertificate };

type RegisterDependencies = {
  repository: ShariahCertificateRepository;
  idGenerator?: () => string;
  now?: () => string;
};

type RevokeDependencies = {
  repository: ShariahCertificateRepository;
  now?: () => string;
};

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function defaultCertificateId(): string {
  return `shariah_certificate_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashCertificatePayload(payload: Omit<ShariahCertificate, 'certificateHash'>): string {
  return `sha256:${createHash('sha256').update(canonicalize(payload)).digest('hex')}`;
}

function isIsoDateTime(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && value.includes('T');
}

function validateRegisterInput(input: RegisterShariahCertificateInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of ['issuedBy', 'reviewerBoard', 'fatwaReference', 'scope', 'contractTemplateVersion', 'createdByUserId'] as const) {
    if (!trimmed(input[field])) {
      issues.push(issue(field, `${field} is required`));
    }
  }

  if (input.issuedAt !== undefined && !isIsoDateTime(input.issuedAt)) {
    issues.push(issue('issuedAt', 'issuedAt must be an ISO timestamp'));
  }

  if (input.expiresAt !== undefined && !isIsoDateTime(input.expiresAt)) {
    issues.push(issue('expiresAt', 'expiresAt must be an ISO timestamp'));
  }

  if (input.conditions !== undefined && !Array.isArray(input.conditions)) {
    issues.push(issue('conditions', 'conditions must be an array'));
  }

  return issues;
}

export async function registerShariahCertificate(
  input: RegisterShariahCertificateInput,
  dependencies: RegisterDependencies,
): Promise<RegisterShariahCertificateResult> {
  const issues = validateRegisterInput(input);
  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const issuedAt = trimmed(input.issuedAt) || now;
  const certificateWithoutHash: Omit<ShariahCertificate, 'certificateHash'> = {
    certificateId: dependencies.idGenerator?.() ?? defaultCertificateId(),
    issuedBy: trimmed(input.issuedBy),
    reviewerBoard: trimmed(input.reviewerBoard),
    fatwaReference: trimmed(input.fatwaReference),
    scope: trimmed(input.scope),
    contractTemplateVersion: trimmed(input.contractTemplateVersion),
    conditions: (input.conditions ?? []).map(condition => condition.trim()).filter(Boolean),
    issuedAt,
    expiresAt: trimmed(input.expiresAt) || undefined,
    status: 'active',
    certificateDocumentId: trimmed(input.certificateDocumentId) || undefined,
    createdByUserId: trimmed(input.createdByUserId),
    createdAt: now,
  };

  const certificate: ShariahCertificate = {
    ...certificateWithoutHash,
    certificateHash: hashCertificatePayload(certificateWithoutHash),
  };

  return {
    status: 'created',
    certificate: await dependencies.repository.save(certificate),
  };
}

export async function revokeShariahCertificate(
  certificateId: string,
  reason: string | undefined,
  dependencies: RevokeDependencies,
): Promise<RevokeShariahCertificateResult> {
  const certificate = await dependencies.repository.findById(trimmed(certificateId));
  if (!certificate) {
    return { status: 'notFound' };
  }

  if (certificate.status === 'revoked') {
    return { status: 'alreadyRevoked', certificate };
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const revoked: ShariahCertificate = {
    ...certificate,
    status: 'revoked',
    revokedAt: now,
    revocationReason: trimmed(reason) || 'Revoked by Shariah governance reviewer',
  };

  return {
    status: 'revoked',
    certificate: await dependencies.repository.save(revoked),
  };
}

export async function validateShariahCertificateCoverage(
  certificateId: string | undefined,
  contract: PlsContract,
  repository: ShariahCertificateRepository,
  now: string = new Date().toISOString(),
): Promise<ShariahCertificateCoverageResult> {
  const normalizedCertificateId = trimmed(certificateId);
  if (!normalizedCertificateId) {
    return { status: 'missing' };
  }

  const certificate = await repository.findById(normalizedCertificateId);
  if (!certificate) {
    return { status: 'notFound' };
  }

  if (certificate.status !== 'active') {
    return { status: 'inactive', certificate };
  }

  if (certificate.expiresAt && Date.parse(certificate.expiresAt) <= Date.parse(now)) {
    return { status: 'expired', certificate };
  }

  if (certificate.contractTemplateVersion !== contract.contractTemplateVersion) {
    return { status: 'templateMismatch', certificate };
  }

  return { status: 'covered', certificate };
}
