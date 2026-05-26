import type { ExternalClientCredential } from './external-client-credential.js';

export type ExternalClientCredentialRepository = {
  findByClientId(clientId: string): Promise<ExternalClientCredential | null>;
};
