import type { Role } from '../domain/role.js';
import type { RoleRepository } from './role-repository.js';

export type CreateRoleResult = 
  | { status: 'duplicate' }
  | { status: 'created', role: Role };

export async function createRole(role: Role, repository: RoleRepository): Promise<CreateRoleResult> {
  const existingRole = await repository.findByRoleCode(role.roleCode, role.scope);
  
  if (existingRole) {
    return { status: 'duplicate' };
  }
  
  await repository.save(role);
  return { status: 'created', role };
}
