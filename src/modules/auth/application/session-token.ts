import { createHash } from 'node:crypto';

/**
 * Hashes a session token for secure storage and comparison
 * @param token The raw session token
 * @returns The hashed token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validates if a session has expired
 * @param expiresAt ISO string representation of expiration time
 * @returns true if expired, false otherwise
 */
export function isSessionExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt);
}
