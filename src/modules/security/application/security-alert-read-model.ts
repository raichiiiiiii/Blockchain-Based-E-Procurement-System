import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import type { AccessAuditEvent } from '../../shared/application/access-audit-event.js';
import type { BlockchainAnchorMetadata } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { OperationalIncidentRepository } from '../../ops/application/operational-incident-repository.js';
import type { OperationalIncident } from '../../ops/application/operational-incident.js';

export type SecurityAlertType = 'deniedAction' | 'proofFailure' | 'operationalIncident';
export type SecurityAlertSeverity = 'info' | 'warning' | 'critical';
export type SecurityAlertSource = 'accessAudit' | 'blockchainAnchor' | 'operational';

export type SecurityAlert = {
  alertId: string;
  alertType: SecurityAlertType;
  severity: SecurityAlertSeverity;
  source: SecurityAlertSource;
  actorUserId?: string;
  actorOrganizationId?: string;
  relatedEventId?: string;
  relatedProofStatus?: BlockchainAnchorMetadata['anchorStatus'];
  message: string;
  occurredAt: string;
};

export type SecurityAlertSummary = {
  generatedAt: string;
  items: SecurityAlert[];
};

export type SecurityAlertReadModelDependencies = {
  accessAuditEventRepository?: AccessAuditEventRepository;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  operationalIncidentRepository?: OperationalIncidentRepository;
};

export type SecurityAlertReadModelOptions = {
  limit?: number;
};

const DEFAULT_ALERT_LIMIT = 50;

function deniedActionMessage(event: AccessAuditEvent): string {
  const action = event.action || 'Protected action';
  const target = event.targetType && event.targetId
    ? `${event.targetType} ${event.targetId}`
    : event.targetType || 'protected resource';
  const reason = event.reason ? ` Reason: ${event.reason}.` : '';

  return `${action} was denied for ${target}.${reason}`;
}

function proofFailureMessage(metadata: BlockchainAnchorMetadata): string {
  const reason = metadata.failureReason ? ` Reason: ${metadata.failureReason}.` : '';
  return `Blockchain proof anchoring failed for event ${metadata.eventId}.${reason}`;
}

function toDeniedActionAlert(event: AccessAuditEvent): SecurityAlert {
  return {
    alertId: `security-alert-denied-${event.eventId}`,
    alertType: 'deniedAction',
    severity: 'warning',
    source: 'accessAudit',
    actorUserId: event.actorUserId,
    relatedEventId: event.eventId,
    message: deniedActionMessage(event),
    occurredAt: event.occurredAt,
  };
}

function toProofFailureAlert(metadata: BlockchainAnchorMetadata): SecurityAlert {
  return {
    alertId: `security-alert-proof-${metadata.eventId}`,
    alertType: 'proofFailure',
    severity: 'critical',
    source: 'blockchainAnchor',
    relatedEventId: metadata.eventId,
    relatedProofStatus: metadata.anchorStatus,
    message: proofFailureMessage(metadata),
    occurredAt: metadata.updatedAt || metadata.createdAt,
  };
}

function toOperationalIncidentAlert(incident: OperationalIncident): SecurityAlert {
  return {
    alertId: `security-alert-ops-${incident.incidentId}`,
    alertType: 'operationalIncident',
    severity: incident.severity,
    source: 'operational',
    relatedEventId: incident.incidentId,
    message: incident.message,
    occurredAt: incident.occurredAt,
  };
}

export async function listSecurityAlerts(
  dependencies: SecurityAlertReadModelDependencies,
  options: SecurityAlertReadModelOptions = {},
): Promise<SecurityAlertSummary> {
  const [accessAuditEvents, anchorMetadata, operationalIncidents] = await Promise.all([
    dependencies.accessAuditEventRepository?.list() ?? Promise.resolve([]),
    dependencies.blockchainAnchorMetadataRepository?.list() ?? Promise.resolve([]),
    dependencies.operationalIncidentRepository?.list() ?? Promise.resolve([]),
  ]);

  const deniedActionAlerts = accessAuditEvents
    .filter(event => event.outcome === 'forbidden')
    .map(toDeniedActionAlert);

  const proofFailureAlerts = anchorMetadata
    .filter(metadata => metadata.anchorStatus === 'failed')
    .map(toProofFailureAlert);

  const operationalIncidentAlerts = operationalIncidents
    .filter(incident => incident.status === 'open')
    .map(toOperationalIncidentAlert);

  const limit = options.limit && options.limit > 0 ? options.limit : DEFAULT_ALERT_LIMIT;
  const items = [...deniedActionAlerts, ...proofFailureAlerts, ...operationalIncidentAlerts]
    .sort((left, right) => (
      right.occurredAt.localeCompare(left.occurredAt) ||
      left.alertId.localeCompare(right.alertId)
    ))
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
}
