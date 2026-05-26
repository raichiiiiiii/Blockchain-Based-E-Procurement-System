import type { OperationalIncident, OperationalIncidentSource } from '../application/operational-incident.js';
import type { OperationalIncidentRepository } from '../application/operational-incident-repository.js';

export class InMemoryOperationalIncidentRepository implements OperationalIncidentRepository {
  private readonly incidents = new Map<string, OperationalIncident>();

  constructor(seed: OperationalIncident[] = []) {
    for (const incident of seed) {
      this.incidents.set(incident.incidentId, { ...incident });
    }
  }

  async save(incident: OperationalIncident): Promise<void> {
    this.incidents.set(incident.incidentId, { ...incident });
  }

  async list(): Promise<OperationalIncident[]> {
    return [...this.incidents.values()].map(incident => ({ ...incident }));
  }

  async resolveOpenBySource(source: OperationalIncidentSource, resolvedAt: string): Promise<void> {
    for (const incident of this.incidents.values()) {
      if (incident.source === source && incident.status === 'open') {
        this.incidents.set(incident.incidentId, {
          ...incident,
          status: 'resolved',
          resolvedAt,
        });
      }
    }
  }
}
