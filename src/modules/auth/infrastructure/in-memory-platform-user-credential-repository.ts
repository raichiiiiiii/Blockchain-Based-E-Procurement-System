import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import type { PlatformUserCredentialRepository } from '../application/platform-user-credential-repository.js';

export class InMemoryPlatformUserCredentialRepository implements PlatformUserCredentialRepository {
  private readonly credentials: PlatformUserCredential[] = [];

  async save(credential: PlatformUserCredential): Promise<PlatformUserCredential> {
    const existingIndex = this.credentials.findIndex(c => c.username === credential.username);
    
    if (existingIndex >= 0) {
      this.credentials[existingIndex] = { ...credential };
      return { ...this.credentials[existingIndex] };
    }

    const newCredential = { ...credential };
    this.credentials.push(newCredential);
    return { ...newCredential };
  }

  async findByUsername(username: string): Promise<PlatformUserCredential | null> {
    const credential = this.credentials.find(c => c.username === username);
    return credential ? { ...credential } : null;
  }

  async findByUserId(userId: string): Promise<PlatformUserCredential | null> {
    const credential = this.credentials.find(c => c.userId === userId);
    return credential ? { ...credential } : null;
  }
}