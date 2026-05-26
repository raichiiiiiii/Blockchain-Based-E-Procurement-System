import { createHash, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ExternalApiAuditRepository } from '../application/external-api-audit-repository.js';
import type { ExternalClientCredentialRepository } from '../application/external-client-credential-repository.js';
import type { ExternalIdempotencyRepository } from '../application/external-idempotency-repository.js';
import { authenticateExternalRequest } from '../application/authenticate-external-request.js';
import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { DeliveryEvidenceRepository } from '../../procurement/application/delivery-evidence-repository.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import {
  submitDeliveryEvidence,
  type SubmitDeliveryEvidenceInput,
  type SubmitDeliveryEvidenceResult,
} from '../../procurement/application/submit-delivery-evidence.js';
import type { ProcureToPaySourceAction } from '../../procurement/application/procure-to-pay-lifecycle-source-integration.js';

export type ExternalApiRoutesOptions = {
  clientRepository: ExternalClientCredentialRepository;
  idempotencyRepository: ExternalIdempotencyRepository;
  auditRepository: ExternalApiAuditRepository;
  orderRepository: ProcurementOrderRepository;
  evidenceRepository: DeliveryEvidenceRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  sharedSecret?: string;
};

type ProofVerifyBody = {
  eventId?: string;
  payloadHash?: string;
};

type ExternalDeliveryBaseBody = {
  orderId?: string;
  supplierOrganizationId?: string;
  evidenceReference?: string;
  payloadHash?: string;
};

type IotEventBody = ExternalDeliveryBaseBody & {
  deviceId?: string;
  eventType?: string;
  observedAt?: string;
  locationId?: string;
  readingSummary?: string;
};

type QrProofBody = ExternalDeliveryBaseBody & {
  qrProofId?: string;
  payload?: unknown;
  signature?: string;
  publicKeyId?: string;
  observedAt?: string;
};

type EpcisEventBody = ExternalDeliveryBaseBody & {
  type?: 'ObjectEvent' | 'AggregationEvent' | 'TransactionEvent' | 'TransformationEvent' | 'AssociationEvent';
  eventTime?: string;
  bizStep?: string;
  disposition?: string;
  readPoint?: string;
  epcList?: string[];
};

const PROOF_VERIFY_ROUTE = '/api/v1/external/proof/verify';
const IOT_EVENT_ROUTE = '/api/v1/external/iot/events';
const QR_PROOF_ROUTE = '/api/v1/external/qr/proofs';
const EPCIS_EVENT_ROUTE = '/api/v1/external/epcis/events';
const EPCIS_TYPES = new Set(['ObjectEvent', 'AggregationEvent', 'TransactionEvent', 'TransformationEvent', 'AssociationEvent']);

function isValidPayloadHash(value: string | undefined): boolean {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/i.test(value);
}

function isValidDetachedSignature(value: string | undefined): boolean {
  return isValidPayloadHash(value);
}

function isValidTimestamp(value: string | undefined): boolean {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function requiredString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function canonicalizeForHash(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalizeForHash(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter(key => record[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalizeForHash(record[key])}`)
    .join(',')}}`;
}

function computeExternalPayloadHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalizeForHash(value)).digest('hex')}`;
}

function safeNote(parts: Array<string | undefined>): string {
  return parts
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('; ')
    .slice(0, 500);
}

async function auditExternalRequest(options: {
  repository: ExternalApiAuditRepository;
  clientId?: string;
  action: string;
  route: string;
  method: string;
  outcome: 'accepted' | 'rejected';
  reason?: string;
  idempotencyKey?: string;
}) {
  await options.repository.save({
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    clientId: options.clientId,
    action: options.action,
    route: options.route,
    method: options.method,
    outcome: options.outcome,
    reason: options.reason,
    idempotencyKey: options.idempotencyKey,
  });
}

function validationError(reply: FastifyReply, message: string, details?: unknown) {
  return reply.code(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      ...(details !== undefined && { details }),
    },
  });
}

async function findIdempotencyReplay(options: {
  repository: ExternalIdempotencyRepository;
  clientId: string;
  route: string;
  idempotencyKey: string;
}): Promise<{ replayed: true; requestId: string } | null> {
  const existing = await options.repository.find({
    clientId: options.clientId,
    route: options.route,
    idempotencyKey: options.idempotencyKey,
  });

  if (existing) {
    return {
      replayed: true,
      requestId: existing.requestId,
    };
  }

  return null;
}

async function saveIdempotencyResult(options: {
  repository: ExternalIdempotencyRepository;
  clientId: string;
  route: string;
  idempotencyKey: string;
  requestId: string;
}): Promise<void> {
  await options.repository.save({
    clientId: options.clientId,
    route: options.route,
    idempotencyKey: options.idempotencyKey,
    requestId: options.requestId,
    createdAt: new Date().toISOString(),
  });
}

function mapSubmitDeliveryEvidenceError(result: Exclude<SubmitDeliveryEvidenceResult, { status: 'submitted' }>): {
  statusCode: number;
  code: string;
  message: string;
  reason: string;
  details?: unknown;
} {
  if (result.status === 'invalidInput') {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'External delivery proof payload is invalid',
      reason: 'invalid_external_delivery_payload',
      details: result.issues,
    };
  }

  if (result.status === 'unauthorized') {
    return {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'External delivery proof submission is not authorized',
      reason: 'external_delivery_unauthorized',
    };
  }

  if (result.status === 'forbidden') {
    return {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'External delivery proof submission is forbidden for this order',
      reason: result.reason,
    };
  }

  if (result.status === 'orderNotFound') {
    return {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Order was not found for external delivery proof submission',
      reason: 'external_delivery_order_not_found',
    };
  }

  return {
    statusCode: 409,
    code: 'CONFLICT',
    message: 'Order must be accepted before external delivery proof can be recorded',
    reason: 'external_delivery_order_not_accepted',
    details: { orderStatus: result.orderStatus },
  };
}

type ExternalDeliveryMapping =
  | {
      ok: true;
      input: Omit<SubmitDeliveryEvidenceInput, 'actorUserId' | 'actorOrganizationId' | 'actorRoleCodes' | 'requestId'> & {
        actorOrganizationId: string;
        lifecycleSourceAction: ProcureToPaySourceAction;
      };
    }
  | { ok: false; message: string; details?: unknown };

function mapIotBodyToDeliveryEvidence(body: IotEventBody): ExternalDeliveryMapping {
  const orderId = requiredString(body.orderId);
  const supplierOrganizationId = requiredString(body.supplierOrganizationId);
  const deviceId = requiredString(body.deviceId);
  const eventType = requiredString(body.eventType);
  const observedAt = requiredString(body.observedAt);

  const issues = [
    !orderId && { path: 'orderId', message: 'Order is required' },
    !supplierOrganizationId && { path: 'supplierOrganizationId', message: 'Supplier organization is required' },
    !deviceId && { path: 'deviceId', message: 'Device id is required' },
    !eventType && { path: 'eventType', message: 'IoT event type is required' },
    !isValidTimestamp(observedAt ?? undefined) && { path: 'observedAt', message: 'Observed timestamp must be a valid ISO timestamp' },
    body.payloadHash !== undefined && !isValidPayloadHash(body.payloadHash) && {
      path: 'payloadHash',
      message: 'Payload hash must be a sha256 hash',
    },
  ].filter(Boolean);

  if (issues.length > 0) {
    return { ok: false, message: 'External IoT event payload is invalid', details: issues };
  }

  const payloadHash = body.payloadHash?.trim().toLowerCase() ?? computeExternalPayloadHash(body);
  return {
    ok: true,
    input: {
      orderId: orderId as string,
      actorOrganizationId: supplierOrganizationId as string,
      evidenceType: 'inspectionRecord',
      evidenceReference: requiredString(body.evidenceReference) ?? `iot:${deviceId}:${eventType}:${observedAt}`,
      evidenceHash: payloadHash,
      notes: safeNote([
        `External IoT event ${eventType}`,
        `device ${deviceId}`,
        `observed ${observedAt}`,
        body.locationId ? `location ${body.locationId}` : undefined,
        body.readingSummary ? `summary ${body.readingSummary}` : undefined,
      ]),
      lifecycleSourceAction: 'deliveryProofSubmitted',
    },
  };
}

function mapQrBodyToDeliveryEvidence(body: QrProofBody): ExternalDeliveryMapping {
  const orderId = requiredString(body.orderId);
  const supplierOrganizationId = requiredString(body.supplierOrganizationId);
  const qrProofId = requiredString(body.qrProofId);
  const publicKeyId = requiredString(body.publicKeyId);
  const observedAt = requiredString(body.observedAt);

  const issues = [
    !orderId && { path: 'orderId', message: 'Order is required' },
    !supplierOrganizationId && { path: 'supplierOrganizationId', message: 'Supplier organization is required' },
    !qrProofId && { path: 'qrProofId', message: 'QR proof id is required' },
    !publicKeyId && { path: 'publicKeyId', message: 'Public key id is required' },
    !isValidDetachedSignature(body.signature) && {
      path: 'signature',
      message: 'QR proof signature metadata must be a sha256 hash',
    },
    observedAt !== null && !isValidTimestamp(observedAt) && {
      path: 'observedAt',
      message: 'Observed timestamp must be a valid ISO timestamp',
    },
    body.payloadHash !== undefined && !isValidPayloadHash(body.payloadHash) && {
      path: 'payloadHash',
      message: 'Payload hash must be a sha256 hash',
    },
  ].filter(Boolean);

  if (issues.length > 0) {
    return { ok: false, message: 'External QR proof payload is invalid', details: issues };
  }

  const payloadHash = body.payloadHash?.trim().toLowerCase() ?? computeExternalPayloadHash({
    payload: body.payload,
    publicKeyId,
    qrProofId,
    signature: body.signature,
  });

  return {
    ok: true,
    input: {
      orderId: orderId as string,
      actorOrganizationId: supplierOrganizationId as string,
      evidenceType: 'deliveryNote',
      evidenceReference: requiredString(body.evidenceReference) ?? `qr:${qrProofId}:${publicKeyId}`,
      evidenceHash: payloadHash,
      notes: safeNote([
        `External QR proof ${qrProofId}`,
        `public key ${publicKeyId}`,
        observedAt ? `observed ${observedAt}` : undefined,
      ]),
      lifecycleSourceAction: 'deliveryProofSubmitted',
    },
  };
}

function mapEpcisBodyToDeliveryEvidence(body: EpcisEventBody): ExternalDeliveryMapping {
  const orderId = requiredString(body.orderId);
  const supplierOrganizationId = requiredString(body.supplierOrganizationId);
  const eventType = requiredString(body.type);
  const eventTime = requiredString(body.eventTime);

  const issues = [
    !orderId && { path: 'orderId', message: 'Order is required' },
    !supplierOrganizationId && { path: 'supplierOrganizationId', message: 'Supplier organization is required' },
    (!eventType || !EPCIS_TYPES.has(eventType)) && {
      path: 'type',
      message: 'EPCIS event type is not supported',
    },
    !isValidTimestamp(eventTime ?? undefined) && {
      path: 'eventTime',
      message: 'EPCIS event time must be a valid ISO timestamp',
    },
    body.epcList !== undefined && (!Array.isArray(body.epcList) || body.epcList.some(item => typeof item !== 'string')) && {
      path: 'epcList',
      message: 'EPCIS epcList must contain string identifiers only',
    },
    body.payloadHash !== undefined && !isValidPayloadHash(body.payloadHash) && {
      path: 'payloadHash',
      message: 'Payload hash must be a sha256 hash',
    },
  ].filter(Boolean);

  if (issues.length > 0) {
    return { ok: false, message: 'External EPCIS event payload is invalid', details: issues };
  }

  const payloadHash = body.payloadHash?.trim().toLowerCase() ?? computeExternalPayloadHash(body);
  return {
    ok: true,
    input: {
      orderId: orderId as string,
      actorOrganizationId: supplierOrganizationId as string,
      evidenceType: 'warehouseReceipt',
      evidenceReference: requiredString(body.evidenceReference) ?? `epcis:${eventType}:${eventTime}:${body.bizStep ?? 'visibility'}`,
      evidenceHash: payloadHash,
      notes: safeNote([
        `External EPCIS ${eventType}`,
        body.bizStep ? `bizStep ${body.bizStep}` : undefined,
        body.disposition ? `disposition ${body.disposition}` : undefined,
        body.readPoint ? `readPoint ${body.readPoint}` : undefined,
        body.epcList ? `epcCount ${body.epcList.length}` : undefined,
      ]),
      lifecycleSourceAction: 'logisticsEventRecorded',
    },
  };
}

async function handleExternalDeliveryProof<Body extends ExternalDeliveryBaseBody>(
  request: FastifyRequest<{ Body: Body }>,
  reply: FastifyReply,
  options: ExternalApiRoutesOptions,
  route: string,
  action: string,
  requiredScope: 'evidence:write' | 'logistics:write',
  mapBody: (body: Body) => ExternalDeliveryMapping,
) {
  const auth = await authenticateExternalRequest({
    method: request.method,
    path: route,
    headers: request.headers,
    body: request.body,
    requiredScope,
    clientRepository: options.clientRepository,
    sharedSecret: options.sharedSecret,
  });

  if (!auth.ok) {
    await auditExternalRequest({
      repository: options.auditRepository,
      clientId: auth.clientId,
      action,
      route,
      method: request.method,
      outcome: 'rejected',
      reason: auth.reason,
      idempotencyKey: auth.idempotencyKey,
    });

    return reply.code(auth.statusCode).send({
      error: {
        code: auth.code,
        message: auth.message,
      },
    });
  }

  const mapped = mapBody((request.body ?? {}) as Body);
  if (!mapped.ok) {
    await auditExternalRequest({
      repository: options.auditRepository,
      clientId: auth.client.clientId,
      action,
      route,
      method: request.method,
      outcome: 'rejected',
      reason: 'invalid_external_delivery_payload',
      idempotencyKey: auth.idempotencyKey,
    });

    return validationError(reply, mapped.message, mapped.details);
  }

  const replay = await findIdempotencyReplay({
    repository: options.idempotencyRepository,
    clientId: auth.client.clientId,
    route,
    idempotencyKey: auth.idempotencyKey,
  });

  if (replay) {
    await auditExternalRequest({
      repository: options.auditRepository,
      clientId: auth.client.clientId,
      action,
      route,
      method: request.method,
      outcome: 'accepted',
      reason: 'idempotency_replay',
      idempotencyKey: auth.idempotencyKey,
    });

    return reply.code(200).send({
      data: {
        accepted: true,
        replayed: true,
        requestId: replay.requestId,
        clientId: auth.client.clientId,
        scope: requiredScope,
      },
    });
  }

  const requestId = randomUUID();
  const result = await submitDeliveryEvidence({
    orderId: mapped.input.orderId,
    evidenceType: mapped.input.evidenceType,
    evidenceReference: mapped.input.evidenceReference,
    evidenceHash: mapped.input.evidenceHash,
    notes: mapped.input.notes,
    lifecycleSourceAction: mapped.input.lifecycleSourceAction,
    actorUserId: `external:${auth.client.clientId}`,
    actorOrganizationId: mapped.input.actorOrganizationId,
    actorRoleCodes: ['supplier'],
    requestId,
  }, {
    orderRepository: options.orderRepository,
    evidenceRepository: options.evidenceRepository,
    lifecycleEventRepository: options.lifecycleEventRepository,
    blockchainAnchorGateway: options.blockchainAnchorGateway,
    blockchainAnchorMetadataRepository: options.blockchainAnchorMetadataRepository,
  });

  if (result.status !== 'submitted') {
    const mappedError = mapSubmitDeliveryEvidenceError(result);
    await auditExternalRequest({
      repository: options.auditRepository,
      clientId: auth.client.clientId,
      action,
      route,
      method: request.method,
      outcome: 'rejected',
      reason: mappedError.reason,
      idempotencyKey: auth.idempotencyKey,
    });

    return reply.code(mappedError.statusCode).send({
      error: {
        code: mappedError.code,
        message: mappedError.message,
        ...(mappedError.details !== undefined && { details: mappedError.details }),
      },
    });
  }

  await saveIdempotencyResult({
    repository: options.idempotencyRepository,
    clientId: auth.client.clientId,
    route,
    idempotencyKey: auth.idempotencyKey,
    requestId,
  });

  await auditExternalRequest({
    repository: options.auditRepository,
    clientId: auth.client.clientId,
    action,
    route,
    method: request.method,
    outcome: 'accepted',
    idempotencyKey: auth.idempotencyKey,
  });

  return reply.code(202).send({
    data: {
      accepted: true,
      replayed: false,
      requestId,
      clientId: auth.client.clientId,
      scope: requiredScope,
      evidence: {
        evidenceId: result.evidence.evidenceId,
        orderId: result.evidence.orderId,
        evidenceType: result.evidence.evidenceType,
        evidenceHash: result.evidence.evidenceHash,
        verificationStatus: result.evidence.verificationStatus,
        lifecycleEventId: result.evidence.lifecycleEventId,
        anchorStatus: result.evidence.blockchainAnchor?.anchorStatus ?? 'notAnchored',
      },
    },
  });
}

export const registerExternalApiRoutes: FastifyPluginAsync<ExternalApiRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.post('/external/proof/verify', async (request: FastifyRequest<{ Body: ProofVerifyBody }>, reply) => {
    const auth = await authenticateExternalRequest({
      method: request.method,
      path: PROOF_VERIFY_ROUTE,
      headers: request.headers,
      body: request.body,
      requiredScope: 'proof:verify',
      clientRepository: options.clientRepository,
      sharedSecret: options.sharedSecret,
    });

    if (!auth.ok) {
      await auditExternalRequest({
        repository: options.auditRepository,
        clientId: auth.clientId,
        action: 'externalProofVerify',
        route: PROOF_VERIFY_ROUTE,
        method: request.method,
        outcome: 'rejected',
        reason: auth.reason,
        idempotencyKey: auth.idempotencyKey,
      });

      return reply.code(auth.statusCode).send({
        error: {
          code: auth.code,
          message: auth.message,
        },
      });
    }

    if (!request.body?.eventId?.trim() || !isValidPayloadHash(request.body.payloadHash)) {
      await auditExternalRequest({
        repository: options.auditRepository,
        clientId: auth.client.clientId,
        action: 'externalProofVerify',
        route: PROOF_VERIFY_ROUTE,
        method: request.method,
        outcome: 'rejected',
        reason: 'invalid_external_proof_verify_payload',
        idempotencyKey: auth.idempotencyKey,
      });

      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'External proof verification requires eventId and sha256 payloadHash',
        },
      });
    }

    const existing = await options.idempotencyRepository.find({
      clientId: auth.client.clientId,
      route: PROOF_VERIFY_ROUTE,
      idempotencyKey: auth.idempotencyKey,
    });

    if (existing) {
      await auditExternalRequest({
        repository: options.auditRepository,
        clientId: auth.client.clientId,
        action: 'externalProofVerify',
        route: PROOF_VERIFY_ROUTE,
        method: request.method,
        outcome: 'accepted',
        reason: 'idempotency_replay',
        idempotencyKey: auth.idempotencyKey,
      });

      return reply.code(200).send({
        data: {
          accepted: true,
          replayed: true,
          requestId: existing.requestId,
          clientId: auth.client.clientId,
          scope: 'proof:verify',
        },
      });
    }

    const requestId = randomUUID();
    await options.idempotencyRepository.save({
      clientId: auth.client.clientId,
      route: PROOF_VERIFY_ROUTE,
      idempotencyKey: auth.idempotencyKey,
      requestId,
      createdAt: new Date().toISOString(),
    });

    await auditExternalRequest({
      repository: options.auditRepository,
      clientId: auth.client.clientId,
      action: 'externalProofVerify',
      route: PROOF_VERIFY_ROUTE,
      method: request.method,
      outcome: 'accepted',
      idempotencyKey: auth.idempotencyKey,
    });

    return reply.code(202).send({
      data: {
        accepted: true,
        replayed: false,
        requestId,
        clientId: auth.client.clientId,
        scope: 'proof:verify',
      },
    });
  });

  fastify.post('/external/iot/events', async (request: FastifyRequest<{ Body: IotEventBody }>, reply) => (
    handleExternalDeliveryProof(
      request,
      reply,
      options,
      IOT_EVENT_ROUTE,
      'externalIotDeliveryProofSubmitted',
      'evidence:write',
      mapIotBodyToDeliveryEvidence,
    )
  ));

  fastify.post('/external/qr/proofs', async (request: FastifyRequest<{ Body: QrProofBody }>, reply) => (
    handleExternalDeliveryProof(
      request,
      reply,
      options,
      QR_PROOF_ROUTE,
      'externalQrDeliveryProofSubmitted',
      'evidence:write',
      mapQrBodyToDeliveryEvidence,
    )
  ));

  fastify.post('/external/epcis/events', async (request: FastifyRequest<{ Body: EpcisEventBody }>, reply) => (
    handleExternalDeliveryProof(
      request,
      reply,
      options,
      EPCIS_EVENT_ROUTE,
      'externalEpcisLogisticsEventRecorded',
      'logistics:write',
      mapEpcisBodyToDeliveryEvidence,
    )
  ));
};
