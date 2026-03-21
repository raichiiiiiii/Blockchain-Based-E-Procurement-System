import type { RoleRepository } from '../application/role-repository.js';
import type { Role, RoleScope } from '../domain/role.js';
import type { PersistedRole } from '../application/role-repository.js';

export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, PersistedRole>();

  private getKey(roleCode: string, scope: RoleScope): string {
    return `${roleCode}:${scope}`;
  }

  async save(role: Role): Promise<PersistedRole> {
    const key = this.getKey(role.roleCode, role.scope);
    const persistedRole: PersistedRole = {
      ...role,
      id: `role_${Math.random().toString(36).substring(2, 15)}`
    };
    this.roles.set(key, persistedRole);
    return persistedRole;
  }

  async findByRoleCode(roleCode: string, scope: RoleScope): Promise<PersistedRole | null> {
    const key = this.getKey(roleCode, scope);
    return this.roles.get(key) ?? null;
  }

  async findAll(): Promise<PersistedRole[]> {
    return Array.from(this.roles.values());
  }

  async findById(id: string): Promise<PersistedRole | null> {
    for (const role of this.roles.values()) {
      if (role.id === id) {
        return role;
      }
    }
    return null;
  }

  async update(role: PersistedRole): Promise<PersistedRole | null> {
    // Find the existing role by id
    const existingRole = await this.findById(role.id);
    
    // If role doesn't exist, return null
    if (!existingRole) {
      return null;
    }
    
    // Preserve the identity key mapping
    const key = this.getKey(existingRole.roleCode, existingRole.scope);
    
    // Update the role in the map while preserving the id
    this.roles.set(key, role);
    
    return role;
  }
}
