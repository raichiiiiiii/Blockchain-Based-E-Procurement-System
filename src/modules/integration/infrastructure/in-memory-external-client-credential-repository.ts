import type { ExternalClientCredential } from '../application/external-client-credential.js';
import type { ExternalClientCredentialRepository } from '../application/external-client-credential-repository.js';

export class InMemoryExternalClientCredentialRepository implements ExternalClientCredentialRepository {
  private readonly clients = new Map<string, ExternalClientCredential>();

  constructor(seedClients: ExternalClientCredential[] = []) {
    for (const client of seedClients) {
      this.clients.set(client.clientId, { ...client, scopes: [...client.scopes] });
    }
  }

  async findByClientId(clientId: string): Promise<ExternalClientCredential | null> {
    const client = this.clients.get(clientId);
    return client ? { ...client, scopes: [...client.scopes] } : null;
  }
}
