import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type SecurityAlertSeverity = 'info' | 'warning' | 'critical';
export type SecurityAlertType = 'deniedAction' | 'proofFailure';
export type SecurityAlertSource = 'accessAudit' | 'blockchainAnchor';

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
};

function emptySecurityAlertsSummary(): SecurityAlertsSummary {
  return {
    generatedAt: new Date().toISOString(),
    items: [],
    deniedActions: [],
    proofFailures: [],
  };
}

function toSummary(response: SecurityAlertsResponse): SecurityAlertsSummary {
  return {
    ...response,
    deniedActions: response.items.filter(alert => alert.alertType === 'deniedAction'),
    proofFailures: response.items.filter(alert => alert.alertType === 'proofFailure'),
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
