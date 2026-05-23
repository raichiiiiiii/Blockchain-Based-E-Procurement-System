import type { PlatformUserCredential } from '../domain/platform-user-credential.js';

export interface PlatformUserCredentialRepository {
  save(credential: PlatformUserCredential): Promise<PlatformUserCredential>;
  findByUsername(username: string): Promise<PlatformUserCredential | null>;
  findByUserId(userId: string): Promise<PlatformUserCredential | null>;
}