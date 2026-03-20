import type { RoleRepository } from '../application/role-repository.js';
import type { Role, RoleScope } from '../domain/role.js';

export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, Role>();

  private getKey(roleCode: string, scope: RoleScope): string {
    return `${roleCode}:${scope}`;
  }

  async save(role: Role): Promise<void> {
    const key = this.getKey(role.roleCode, role.scope);
    this.roles.set(key, role);
  }

  async findByRoleCode(roleCode: string, scope: RoleScope): Promise<Role | null> {
    const key = this.getKey(roleCode, scope);
    return this.roles.get(key) ?? null;
  }
}
