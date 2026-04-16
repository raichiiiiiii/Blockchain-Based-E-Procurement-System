import type { UserExistenceLookup } from '../../shared/application/user-existence-lookup.js';

interface InMemoryUserExistenceLookupOptions {
  existingUserIds?: string[];
}

export class InMemoryUserExistenceLookup implements UserExistenceLookup {
  private readonly userIds: Set<string>;

  constructor(options: InMemoryUserExistenceLookupOptions = {}) {
    this.userIds = new Set(options.existingUserIds ?? []);
  }

  async userExists(userId: string): Promise<boolean> {
    return this.userIds.has(userId);
  }
}
