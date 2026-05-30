import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type RuntimeReadinessStatus = 'ready' | 'degraded';
export type RuntimePersistenceMode = 'memory' | 'postgres';
export type RuntimeFabricMode = 'disabled' | 'local' | 'configured' | 'unavailable';
export type RuntimeProofAdapterMode = 'disabled' | 'in-memory' | 'fabric-local' | 'fabric';
export type RuntimePaymentMode = 'notConfigured' | 'manual' | 'sandbox' | 'external';

export type OperationalIncident = {
  incidentId: string;
  severity: 'info' | 'warning' | 'critical';
  source: 'database' | 'fabric' | 'payment' | 'runtime';
  message: string;
  status: 'open' | 'resolved';
  occurredAt: string;
  resolvedAt?: string;
};

export type RuntimeReadiness = {
  status: RuntimeReadinessStatus;
  checks: {
    database: {
      mode: RuntimePersistenceMode;
      reachable: boolean;
    };
    fabric: {
      mode: RuntimeFabricMode;
      proofAdapter?: RuntimeProofAdapterMode;
      configured?: boolean;
      available?: boolean;
      simulated?: boolean;
      reason?: string;
      missingConfiguration?: string[];
      channelName?: string;
      chaincodeName?: string;
      connectionProfileConfigured?: boolean;
      walletPathConfigured?: boolean;
      identityConfigured?: boolean;
    };
    payment: {
      mode: RuntimePaymentMode;
      configured: boolean;
    };
    demoSeed: {
      enabled: boolean;
    };
  };
};

export type OpsStatusResponse = {
  generatedAt: string;
  readiness: RuntimeReadiness;
  incidents: OperationalIncident[];
};

export async function getOpsStatus(
  session: AuthenticatedFrontendSession,
): Promise<OpsStatusResponse> {
  return requestJson<OpsStatusResponse>('/api/v1/ops/status', {
    headers: createSessionHeaders(session),
  });
}
