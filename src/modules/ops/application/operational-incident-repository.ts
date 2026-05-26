import type { OperationalIncident, OperationalIncidentSource } from './operational-incident.js';

export type OperationalIncidentRepository = {
  save(incident: OperationalIncident): Promise<void>;
  list(): Promise<OperationalIncident[]>;
  resolveOpenBySource(source: OperationalIncidentSource, resolvedAt: string): Promise<void>;
};
