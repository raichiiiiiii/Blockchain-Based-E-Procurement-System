import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type SecurityAlertSeverity = 'info' | 'warning' | 'critical';
export type SecurityAlertType = 'deniedAction' | 'proofFailure' | 'operationalIncident';
export type SecurityAlertSource = 'accessAudit' | 'blockchainAnchor' | 'operational';

export type SecurityAlert = {
  alertId: string;
  alertType: SecurityAlertType;
  severity: SecurityAlertSeverity;
  source: SecurityAlertSource;
  actorUserId?: string;
  actorOrganizationId?: string;
  relatedEventId?: string;
  relatedProofStatus?: string;
  message: string;
  occurredAt: string;
};

type SecurityAlertsResponse = {
  generatedAt: string;
  items: SecurityAlert[];
};

export type SecurityAlertsSummary = SecurityAlertsResponse & {
  deniedActions: SecurityAlert[];
  proofFailures: SecurityAlert[];
  operationalIncidents: SecurityAlert[];
};

function emptySecurityAlertsSummary(): SecurityAlertsSummary {
  return {
    generatedAt: new Date().toISOString(),
    items: [],
    deniedActions: [],
    proofFailures: [],
    operationalIncidents: [],
  };
}

function toSummary(response: SecurityAlertsResponse): SecurityAlertsSummary {
  return {
    ...response,
    deniedActions: response.items.filter(alert => alert.alertType === 'deniedAction'),
    proofFailures: response.items.filter(alert => alert.alertType === 'proofFailure'),
    operationalIncidents: response.items.filter(alert => alert.alertType === 'operationalIncident'),
  };
}

export async function getSecurityAlerts(
  session: AuthenticatedFrontendSession,
): Promise<SecurityAlertsSummary> {
  if (session.source !== 'backend') {
    return emptySecurityAlertsSummary();
  }

  const response = await requestJson<SecurityAlertsResponse>('/api/v1/security/alerts', {
    headers: createSessionHeaders(session),
  });

  return toSummary(response);
}
