export type OperationalIncidentSeverity = 'info' | 'warning' | 'critical';

export type OperationalIncidentSource = 'database' | 'fabric' | 'payment' | 'runtime';

export type OperationalIncidentStatus = 'open' | 'resolved';

export type OperationalIncident = {
  incidentId: string;
  severity: OperationalIncidentSeverity;
  source: OperationalIncidentSource;
  message: string;
  status: OperationalIncidentStatus;
  occurredAt: string;
  resolvedAt?: string;
};
