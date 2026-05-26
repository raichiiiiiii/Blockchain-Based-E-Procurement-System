import { randomUUID } from 'node:crypto';
import type { ProcurementContractRepository } from './contract-repository.js';
import { createContractTermsHash } from './contract-hashing.js';
import type {
  ContractAcceptance,
  ContractAcceptanceParty,
  ContractLifecycleEvent,
  ContractLineItem,
  MachineReadableTerms,
  ProcurementContract,
} from '../domain/procurement-contract.js';

type ActorInput = {
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type CreateContractInput = ActorInput & {
  contractNumber?: string;
  buyerOrganizationId?: string;
  supplierOrganizationId?: string;
  financierOrganizationId?: string;
  humanReadableDocumentId?: string;
  machineReadableTerms?: Partial<MachineReadableTerms>;
  effectiveAt?: string;
  expiresAt?: string;
};

export type SubmitContractOfferInput = ActorInput & {
  contractId?: string;
  proposedTerms?: Partial<MachineReadableTerms>;
  comment?: string;
};

export type AcceptContractInput = ActorInput & {
  contractId?: string;
  acceptedBy?: ContractAcceptanceParty;
};

type Issue = { path: string; message: string };

export type CreateContractResult =
  | { status: 'created'; contract: ProcurementContract }
  | { status: 'invalidInput'; issues: Issue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden' };

export type SubmitContractOfferResult =
  | { status: 'submitted'; contract: ProcurementContract }
  | { status: 'invalidInput'; issues: Issue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' };

export type AcceptContractResult =
  | { status: 'accepted'; contract: ProcurementContract; acceptance: ContractAcceptance }
  | { status: 'invalidInput'; issues: Issue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' }
  | { status: 'alreadyAccepted' };

const privilegedReadRoles = new Set(['administrator', 'auditor', 'regulator', 'complianceReviewer', 'securityOperator', 'shariahReviewer']);
const createRoles = new Set(['administrator', 'buyer', 'supplier']);
const negotiateRoles = new Set(['administrator', 'buyer', 'supplier', 'financier']);

function now(): string {
  return new Date().toISOString();
}

function isBlank(value: unknown): value is undefined {
  return typeof value !== 'string' || value.trim().length === 0;
}

function actorRoles(input: ActorInput): string[] {
  return input.actorRoleCodes ?? [];
}

function hasAnyRole(input: ActorInput, allowed: Set<string>): boolean {
  return actorRoles(input).some(role => allowed.has(role));
}

function isAuthenticated(input: ActorInput): boolean {
  return typeof input.actorUserId === 'string' && input.actorUserId.trim().length > 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
}

function normalizeLineItems(value: unknown): ContractLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => typeof item === 'object' && item !== null)
    .map((item, index) => item as Partial<ContractLineItem> & Record<string, unknown>)
    .filter(item => typeof item.description === 'string' && item.description.trim().length > 0)
    .map((item, index) => ({
      itemId: typeof item.itemId === 'string' && item.itemId.trim() ? item.itemId.trim() : `line-${index + 1}`,
      description: String(item.description).trim(),
      quantity: typeof item.quantity === 'string' && item.quantity.trim() ? item.quantity.trim() : '1',
      unitPrice: typeof item.unitPrice === 'string' && item.unitPrice.trim() ? item.unitPrice.trim() : '0.00',
      currency: typeof item.currency === 'string' && item.currency.trim() ? item.currency.trim() : 'MYR',
    }));
}

function normalizeTerms(
  input: Partial<MachineReadableTerms> | undefined,
  parties: MachineReadableTerms['parties'],
): { terms?: MachineReadableTerms; issues: Issue[] } {
  const issues: Issue[] = [];
  const lineItems = normalizeLineItems(input?.lineItems);
  const acceptanceCriteria = normalizeStringArray(input?.acceptanceCriteria);
  const escrowReleaseConditions = normalizeStringArray(input?.escrowReleaseConditions);
  const documentReferences = normalizeStringArray(input?.documentReferences);
  const clauseReferences = Array.isArray(input?.clauseReferences)
    ? input.clauseReferences
        .filter(item => typeof item === 'object' && item !== null)
        .map((item, index) => item as Record<string, unknown>)
        .filter(item => typeof item.title === 'string' && item.title.trim().length > 0)
        .map((item, index) => ({
          clauseId: typeof item.clauseId === 'string' && item.clauseId.trim() ? item.clauseId.trim() : `clause-${index + 1}`,
          title: String(item.title).trim(),
          summary: typeof item.summary === 'string' && item.summary.trim() ? item.summary.trim() : String(item.title).trim(),
        }))
    : [];

  if (lineItems.length === 0) {
    issues.push({ path: 'machineReadableTerms.lineItems', message: 'At least one line item is required' });
  }

  if (isBlank(input?.deliveryTerms)) {
    issues.push({ path: 'machineReadableTerms.deliveryTerms', message: 'Delivery terms are required' });
  }

  if (acceptanceCriteria.length === 0) {
    issues.push({ path: 'machineReadableTerms.acceptanceCriteria', message: 'At least one acceptance criterion is required' });
  }

  if (escrowReleaseConditions.length === 0) {
    issues.push({ path: 'machineReadableTerms.escrowReleaseConditions', message: 'At least one escrow release condition is required' });
  }

  if (isBlank(input?.paymentTerms)) {
    issues.push({ path: 'machineReadableTerms.paymentTerms', message: 'Payment terms are required' });
  }

  if (isBlank(input?.disputeAndArbitrationRules)) {
    issues.push({ path: 'machineReadableTerms.disputeAndArbitrationRules', message: 'Dispute and arbitration rules are required' });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues,
    terms: {
      parties,
      lineItems,
      deliveryTerms: input?.deliveryTerms?.trim() ?? '',
      acceptanceCriteria,
      escrowReleaseConditions,
      paymentTerms: input?.paymentTerms?.trim() ?? '',
      disputeAndArbitrationRules: input?.disputeAndArbitrationRules?.trim() ?? '',
      plsTerms: input?.plsTerms,
      documentReferences,
      clauseReferences,
      ocdsMapping: input?.ocdsMapping,
      ublMapping: input?.ublMapping,
    },
  };
}

function createLifecycleEvent(input: {
  eventType: ContractLifecycleEvent['eventType'];
  actor: ActorInput;
  termsHash?: string;
  metadata?: Record<string, string>;
}): ContractLifecycleEvent {
  return {
    eventId: `contract_event_${randomUUID()}`,
    eventType: input.eventType,
    actorUserId: input.actor.actorUserId ?? 'unknown',
    actorOrganizationId: input.actor.actorOrganizationId,
    occurredAt: now(),
    termsHash: input.termsHash,
    metadata: input.metadata,
  };
}

function canAccessContract(input: ActorInput, contract: ProcurementContract): boolean {
  if (hasAnyRole(input, privilegedReadRoles)) {
    return true;
  }

  const actorOrg = input.actorOrganizationId;
  return Boolean(actorOrg && (
    actorOrg === contract.buyerOrganizationId ||
    actorOrg === contract.supplierOrganizationId ||
    actorOrg === contract.financierOrganizationId
  ));
}

function canWriteContract(input: ActorInput, contract: ProcurementContract): boolean {
  if (hasAnyRole(input, new Set(['administrator']))) {
    return true;
  }

  if (!hasAnyRole(input, negotiateRoles)) {
    return false;
  }

  const actorOrg = input.actorOrganizationId;
  return Boolean(actorOrg && (
    actorOrg === contract.buyerOrganizationId ||
    actorOrg === contract.supplierOrganizationId ||
    actorOrg === contract.financierOrganizationId
  ));
}

function acceptancePartyForActor(input: ActorInput, contract: ProcurementContract): ContractAcceptanceParty | undefined {
  if (input.actorOrganizationId === contract.buyerOrganizationId) {
    return 'buyer';
  }

  if (input.actorOrganizationId === contract.supplierOrganizationId) {
    return 'supplier';
  }

  return undefined;
}

export async function createProcurementContract(
  input: CreateContractInput,
  dependencies: { repository: ProcurementContractRepository },
): Promise<CreateContractResult> {
  if (!isAuthenticated(input)) {
    return { status: 'unauthorized' };
  }

  if (!hasAnyRole(input, createRoles)) {
    return { status: 'forbidden' };
  }

  const issues: Issue[] = [];
  if (isBlank(input.contractNumber)) {
    issues.push({ path: 'contractNumber', message: 'Contract number is required' });
  }
  if (isBlank(input.buyerOrganizationId)) {
    issues.push({ path: 'buyerOrganizationId', message: 'Buyer organization is required' });
  }
  if (isBlank(input.supplierOrganizationId)) {
    issues.push({ path: 'supplierOrganizationId', message: 'Supplier organization is required' });
  }

  const actorOrg = input.actorOrganizationId;
  if (!hasAnyRole(input, new Set(['administrator'])) && actorOrg !== input.buyerOrganizationId && actorOrg !== input.supplierOrganizationId) {
    return { status: 'forbidden' };
  }

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const parties = {
    buyerOrganizationId: input.buyerOrganizationId?.trim() ?? '',
    supplierOrganizationId: input.supplierOrganizationId?.trim() ?? '',
    financierOrganizationId: input.financierOrganizationId?.trim() || undefined,
    buyerName: input.machineReadableTerms?.parties?.buyerName?.trim() || undefined,
    supplierName: input.machineReadableTerms?.parties?.supplierName?.trim() || undefined,
    financierName: input.machineReadableTerms?.parties?.financierName?.trim() || undefined,
  };

  const normalizedTerms = normalizeTerms(input.machineReadableTerms, parties);
  if (normalizedTerms.issues.length > 0 || !normalizedTerms.terms) {
    return { status: 'invalidInput', issues: normalizedTerms.issues };
  }

  const termsHash = createContractTermsHash(normalizedTerms.terms);
  const timestamp = now();
  const contract: ProcurementContract = {
    contractId: `contract_${randomUUID()}`,
    contractNumber: input.contractNumber?.trim() ?? '',
    buyerOrganizationId: parties.buyerOrganizationId,
    supplierOrganizationId: parties.supplierOrganizationId,
    financierOrganizationId: parties.financierOrganizationId,
    status: 'draft',
    version: 1,
    humanReadableDocumentId: input.humanReadableDocumentId?.trim() || undefined,
    machineReadableTerms: normalizedTerms.terms,
    termsHash,
    effectiveAt: input.effectiveAt?.trim() || undefined,
    expiresAt: input.expiresAt?.trim() || undefined,
    createdByUserId: input.actorUserId ?? 'unknown',
    createdAt: timestamp,
    updatedAt: timestamp,
    offers: [],
    acceptances: [],
    lifecycleEvents: [
      createLifecycleEvent({ eventType: 'companyRegistered', actor: input }),
      createLifecycleEvent({ eventType: 'kycApproved', actor: input }),
      createLifecycleEvent({ eventType: 'networkMembershipIssued', actor: input }),
      createLifecycleEvent({ eventType: 'privateNetworkEstablished', actor: input }),
      createLifecycleEvent({ eventType: 'contractCreated', actor: input, termsHash }),
    ],
  };

  return { status: 'created', contract: await dependencies.repository.save(contract) };
}

export async function submitContractOffer(
  input: SubmitContractOfferInput,
  dependencies: { repository: ProcurementContractRepository },
): Promise<SubmitContractOfferResult> {
  if (!isAuthenticated(input)) {
    return { status: 'unauthorized' };
  }

  if (isBlank(input.contractId)) {
    return { status: 'invalidInput', issues: [{ path: 'contractId', message: 'Contract ID is required' }] };
  }

  const contract = await dependencies.repository.findById(input.contractId.trim());
  if (!contract) {
    return { status: 'notFound' };
  }

  if (!canWriteContract(input, contract)) {
    return { status: 'forbidden' };
  }

  const normalizedTerms = normalizeTerms(input.proposedTerms, {
    ...contract.machineReadableTerms.parties,
    buyerOrganizationId: contract.buyerOrganizationId,
    supplierOrganizationId: contract.supplierOrganizationId,
    financierOrganizationId: contract.financierOrganizationId,
  });
  if (normalizedTerms.issues.length > 0 || !normalizedTerms.terms) {
    return { status: 'invalidInput', issues: normalizedTerms.issues };
  }

  const proposedTermsHash = createContractTermsHash(normalizedTerms.terms);
  const offer = {
    offerId: `offer_${randomUUID()}`,
    contractId: contract.contractId,
    proposedTerms: normalizedTerms.terms,
    proposedTermsHash,
    actorUserId: input.actorUserId ?? 'unknown',
    actorOrganizationId: input.actorOrganizationId,
    comment: input.comment?.trim() || undefined,
    status: 'submitted' as const,
    createdAt: now(),
  };

  const nextContract: ProcurementContract = {
    ...contract,
    status: 'negotiating',
    version: contract.version + 1,
    machineReadableTerms: normalizedTerms.terms,
    termsHash: proposedTermsHash,
    updatedAt: offer.createdAt,
    offers: [...contract.offers, offer],
    acceptances: [],
    lifecycleEvents: [
      ...contract.lifecycleEvents,
      createLifecycleEvent({
        eventType: 'offerSubmitted',
        actor: input,
        termsHash: proposedTermsHash,
        metadata: { offerId: offer.offerId },
      }),
    ],
  };

  return { status: 'submitted', contract: await dependencies.repository.save(nextContract) };
}

export async function acceptContractTerms(
  input: AcceptContractInput,
  dependencies: { repository: ProcurementContractRepository },
): Promise<AcceptContractResult> {
  if (!isAuthenticated(input)) {
    return { status: 'unauthorized' };
  }

  if (isBlank(input.contractId)) {
    return { status: 'invalidInput', issues: [{ path: 'contractId', message: 'Contract ID is required' }] };
  }

  const contract = await dependencies.repository.findById(input.contractId.trim());
  if (!contract) {
    return { status: 'notFound' };
  }

  if (!canWriteContract(input, contract)) {
    return { status: 'forbidden' };
  }

  const acceptedBy = input.acceptedBy ?? acceptancePartyForActor(input, contract);
  if (!acceptedBy || !['buyer', 'supplier'].includes(acceptedBy)) {
    return { status: 'invalidInput', issues: [{ path: 'acceptedBy', message: 'Acceptance must be recorded as buyer or supplier' }] };
  }

  if (acceptedBy === 'buyer' && input.actorOrganizationId !== contract.buyerOrganizationId && !hasAnyRole(input, new Set(['administrator']))) {
    return { status: 'forbidden' };
  }

  if (acceptedBy === 'supplier' && input.actorOrganizationId !== contract.supplierOrganizationId && !hasAnyRole(input, new Set(['administrator']))) {
    return { status: 'forbidden' };
  }

  if (contract.acceptances.some(acceptance => acceptance.acceptedBy === acceptedBy && acceptance.acceptedTermsHash === contract.termsHash)) {
    return { status: 'alreadyAccepted' };
  }

  const acceptance: ContractAcceptance = {
    acceptanceId: `acceptance_${randomUUID()}`,
    contractId: contract.contractId,
    acceptedBy,
    actorUserId: input.actorUserId ?? 'unknown',
    actorOrganizationId: input.actorOrganizationId,
    acceptedAt: now(),
    acceptedVersion: contract.version,
    acceptedTermsHash: contract.termsHash,
  };
  const nextAcceptances = [...contract.acceptances.filter(item => item.acceptedBy !== acceptedBy), acceptance];
  const fullyAccepted = nextAcceptances.some(item => item.acceptedBy === 'buyer' && item.acceptedTermsHash === contract.termsHash) &&
    nextAcceptances.some(item => item.acceptedBy === 'supplier' && item.acceptedTermsHash === contract.termsHash);

  const nextContract: ProcurementContract = {
    ...contract,
    status: fullyAccepted ? 'accepted' : contract.status,
    signedAt: fullyAccepted ? acceptance.acceptedAt : contract.signedAt,
    updatedAt: acceptance.acceptedAt,
    acceptances: nextAcceptances,
    lifecycleEvents: [
      ...contract.lifecycleEvents,
      createLifecycleEvent({
        eventType: 'contractAccepted',
        actor: input,
        termsHash: contract.termsHash,
        metadata: {
          acceptedBy,
          acceptanceId: acceptance.acceptanceId,
        },
      }),
    ],
  };

  return {
    status: 'accepted',
    contract: await dependencies.repository.save(nextContract),
    acceptance,
  };
}

export async function getProcurementContract(
  input: ActorInput & { contractId?: string },
  dependencies: { repository: ProcurementContractRepository },
): Promise<
  | { status: 'found'; contract: ProcurementContract }
  | { status: 'invalidInput'; issues: Issue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' }
> {
  if (!isAuthenticated(input)) {
    return { status: 'unauthorized' };
  }

  if (isBlank(input.contractId)) {
    return { status: 'invalidInput', issues: [{ path: 'contractId', message: 'Contract ID is required' }] };
  }

  const contract = await dependencies.repository.findById(input.contractId.trim());
  if (!contract) {
    return { status: 'notFound' };
  }

  if (!canAccessContract(input, contract)) {
    return { status: 'forbidden' };
  }

  return { status: 'found', contract };
}

export async function listProcurementContracts(
  input: ActorInput,
  dependencies: { repository: ProcurementContractRepository },
): Promise<
  | { status: 'listed'; contracts: ProcurementContract[] }
  | { status: 'unauthorized' }
> {
  if (!isAuthenticated(input)) {
    return { status: 'unauthorized' };
  }

  const contracts = await dependencies.repository.list();
  return {
    status: 'listed',
    contracts: contracts.filter(contract => canAccessContract(input, contract)),
  };
}
