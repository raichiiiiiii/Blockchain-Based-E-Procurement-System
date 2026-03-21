import type { Role, RoleScope } from '../domain/role.js';

export type PersistedRole = Role & { id: string };

export interface RoleRepository {
  save(role: Role): Promise<PersistedRole>;
  findByRoleCode(roleCode: string, scope: RoleScope): Promise<PersistedRole | null>;
  findAll(): Promise<PersistedRole[]>;
  findById(id: string): Promise<PersistedRole | null>;
}
