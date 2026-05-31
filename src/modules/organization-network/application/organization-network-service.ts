import { createHash } from 'node:crypto';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type {
  CreateNetworkRequestInput,
  DecideNetworkRequestInput,
  InviteOrganizationUserInput,
  OrganizationNetworkRepository,
  RegisterOrganizationInput,
  UpdateOrganizationProfileInput,
} from './organization-network-repository.js';
import {
  isOrganizationRelationshipIntent,
  type OrganizationRelationshipIntent,
} from '../domain/organization-network.js';

export function hashLocalPayload(input: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireNonEmpty(value: unknown, field: string): string {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) {
    throw createApplicationValidationError(`${field} is required`, [
      { path: field, message: `${field} is required` },
    ]);
  }

  return trimmed;
}

function assertSafeEmailBody(...values: Array<string | undefined>) {
  const combined = values.filter(Boolean).join(' ').toLowerCase();
  const forbidden = ['bearer ', 'private key', 'payment credential', 'raw kyc', 'secret'];
  if (forbidden.some(fragment => combined.includes(fragment))) {
    throw createApplicationValidationError('Notification text contains unsafe content');
  }
}

const inviteAssignableRoles = new Set([
  'organizationAdmin',
  'buyer',
  'supplier',
  'financier',
  'complianceReviewer',
  'shariahReviewer',
  'auditor',
  'regulator',
  'securityOperator',
]);

export async function registerOrganization(
  input: Record<string, unknown>,
  repository: OrganizationNetworkRepository,
) {
  const normalized: RegisterOrganizationInput = {
    legalName: requireNonEmpty(input.legalName, 'legalName'),
    alias: requireNonEmpty(input.alias, 'alias'),
    uniqueIdentifier: requireNonEmpty(input.uniqueIdentifier, 'uniqueIdentifier'),
    logoUrl: normalizeOptionalString(input.logoUrl),
    contactEmail: requireNonEmpty(input.contactEmail, 'contactEmail'),
    businessCategory: requireNonEmpty(input.businessCategory, 'businessCategory'),
    registrationNumber: normalizeOptionalString(input.registrationNumber),
    publicProfileSummary: normalizeOptionalString(input.publicProfileSummary),
    primaryAdminUsername: requireNonEmpty(input.primaryAdminUsername, 'primaryAdminUsername'),
    primaryAdminPassword: requireNonEmpty(input.primaryAdminPassword, 'primaryAdminPassword'),
    primaryAdminDisplayName: normalizeOptionalString(input.primaryAdminDisplayName),
  };

  if (normalized.primaryAdminPassword.length < 8) {
    throw createApplicationValidationError('Password must be at least 8 characters', [
      { path: 'primaryAdminPassword', message: 'Password must be at least 8 characters' },
    ]);
  }

  return repository.registerOrganization(normalized);
}

export async function updateOrganizationProfile(
  organizationId: string,
  input: Record<string, unknown>,
  repository: OrganizationNetworkRepository,
) {
  const normalized: UpdateOrganizationProfileInput = {
    alias: normalizeOptionalString(input.alias),
    logoUrl: normalizeOptionalString(input.logoUrl),
    businessCategory: normalizeOptionalString(input.businessCategory),
    publicProfileSummary: normalizeOptionalString(input.publicProfileSummary),
    contactEmail: normalizeOptionalString(input.contactEmail),
  };

  if (Object.values(normalized).every(value => value === undefined)) {
    throw createApplicationValidationError('At least one profile field is required');
  }

  return repository.updateProfile(organizationId, normalized);
}

export async function inviteOrganizationUser(
  organizationId: string,
  actorUserId: string,
  input: Record<string, unknown>,
  repository: OrganizationNetworkRepository,
) {
  const roleCodes = Array.isArray(input.roleCodes)
    ? input.roleCodes.filter((role): role is string => typeof role === 'string')
    : [];

  if (roleCodes.length === 0) {
    throw createApplicationValidationError('At least one role is required', [
      { path: 'roleCodes', message: 'At least one role is required' },
    ]);
  }

  const invalidRole = roleCodes.find(role => !inviteAssignableRoles.has(role));
  if (invalidRole) {
    throw createApplicationValidationError('Role cannot be assigned from this workspace', [
      { path: 'roleCodes', message: `${invalidRole} cannot be assigned from this workspace` },
    ]);
  }

  const normalized: InviteOrganizationUserInput = {
    organizationId,
    username: requireNonEmpty(input.username, 'username'),
    displayName: requireNonEmpty(input.displayName, 'displayName'),
    roleCodes: [...new Set(roleCodes)],
    invitedByUserId: actorUserId,
  };

  return repository.inviteOrganizationUser(normalized);
}

export async function createOrganizationNetworkRequest(
  actorOrganizationId: string,
  actorUserId: string,
  input: Record<string, unknown>,
  repository: OrganizationNetworkRepository,
) {
  const targetUniqueIdentifier = requireNonEmpty(input.targetUniqueIdentifier, 'targetUniqueIdentifier');
  const relationshipType = requireNonEmpty(input.relationshipType, 'relationshipType');

  if (!isOrganizationRelationshipIntent(relationshipType)) {
    throw createApplicationValidationError('Invalid relationship type', [
      {
        path: 'relationshipType',
        message: 'Relationship type must be buyer, supplier, financier, logistics, auditorRegulator, or mixed',
      },
    ]);
  }

  const message = normalizeOptionalString(input.message);
  const purpose = normalizeOptionalString(input.purpose);
  assertSafeEmailBody(message, purpose);

  const requestInput: CreateNetworkRequestInput = {
    requesterOrganizationId: actorOrganizationId,
    targetUniqueIdentifier,
    relationshipType: relationshipType as OrganizationRelationshipIntent,
    message,
    purpose,
    createdByUserId: actorUserId,
  };

  return repository.createNetworkRequest(requestInput);
}

export async function acceptOrganizationNetworkRequest(
  input: DecideNetworkRequestInput,
  repository: OrganizationNetworkRepository,
) {
  return repository.acceptNetworkRequest(input);
}

export async function rejectOrganizationNetworkRequest(
  input: DecideNetworkRequestInput,
  repository: OrganizationNetworkRepository,
) {
  return repository.rejectNetworkRequest(input);
}
