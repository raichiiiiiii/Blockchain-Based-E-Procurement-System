import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type SecurityAlertSeverity = 'info' | 'warning' | 'critical';
export type SecurityAlertType = 'deniedAction' | 'proofFailure' | 'proofMismatch' | 'unavailableProof';

export type SecurityAlert = {
  alertId: string;
  type: SecurityAlertType;
  severity: SecurityAlertSeverity;
  occurredAt: string;
  title: string;
  summary: string;
  actorUserId?: string;
  target?: string;
  proofState?: string;
  payloadHash?: string;
};

export type SecurityAlertsSummary = {
  generatedAt: string;
  deniedActions: SecurityAlert[];
  proofFailures: SecurityAlert[];
};

const localSecurityAlerts: SecurityAlert[] = [
  {
    alertId: 'alert-denied-1',
    type: 'deniedAction',
    severity: 'warning',
    occurredAt: '2026-05-25T04:04:00.000Z',
    title: 'Denied role change',
    summary: 'A buyer session attempted to open administrator role controls and was blocked.',
    actorUserId: 'demo-buyer-user',
    target: 'Roles',
  },
  {
    alertId: 'alert-proof-1',
    type: 'proofFailure',
    severity: 'critical',
    occurredAt: '2026-05-25T04:08:00.000Z',
    title: 'Anchoring failed',
    summary: 'A governed event remains recorded off-chain while Fabric anchoring requires operator follow-up.',
    target: 'roleAssignmentUpdated',
    proofState: 'failed',
    payloadHash: `sha256:${'4'.repeat(64)}`,
  },
  {
    alertId: 'alert-proof-2',
    type: 'proofMismatch',
    severity: 'critical',
    occurredAt: '2026-05-25T04:11:00.000Z',
    title: 'Proof mismatch',
    summary: 'Submitted event hash differs from the anchored hash and needs audit review.',
    target: 'purchaseOrderAccepted',
    proofState: 'mismatch',
    payloadHash: `sha256:${'9'.repeat(64)}`,
  },
  {
    alertId: 'alert-proof-3',
    type: 'unavailableProof',
    severity: 'warning',
    occurredAt: '2026-05-25T04:14:00.000Z',
    title: 'Proof service unavailable',
    summary: 'Proof verification could not reach the verification service.',
    target: 'deliveryRecorded',
    proofState: 'unavailable',
    payloadHash: `sha256:${'f'.repeat(64)}`,
  },
];

export async function getSecurityAlerts(
  session: AuthenticatedFrontendSession,
): Promise<SecurityAlertsSummary> {
  if (!session.actor.actorRoleCodes.includes('securityOperator')) {
    return {
      generatedAt: new Date().toISOString(),
      deniedActions: [],
      proofFailures: [],
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    deniedActions: localSecurityAlerts.filter(alert => alert.type === 'deniedAction'),
    proofFailures: localSecurityAlerts.filter(alert => alert.type !== 'deniedAction'),
  };
}
