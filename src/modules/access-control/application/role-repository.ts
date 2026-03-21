import type { Role, RoleScope } from '../domain/role.js';

export interface RoleRepository {
  save(role: Role): Promise<void>;
  findByRoleCode(roleCode: string, scope: RoleScope): Promise<Role | null>;
  findAll(): Promise<Role[]>;
}
