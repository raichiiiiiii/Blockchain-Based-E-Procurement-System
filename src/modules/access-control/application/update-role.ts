import type { RoleRepository, PersistedRole } from './role-repository.js';

export type UpdateRoleInput = {
  displayName?: string;
  description?: string;
  permissions?: string[];
  status?: 'active' | 'inactive';
};

export type UpdateRoleResult = 
  | { status: 'notFound' }
  | { status: 'updated', role: PersistedRole };

export async function updateRole(id: string, updates: UpdateRoleInput, repository: RoleRepository): Promise<UpdateRoleResult> {
  const existingRole = await repository.findById(id);
  
  if (!existingRole) {
    return { status: 'notFound' };
  }
  
  const updatedRole: PersistedRole = {
    ...existingRole,
    ...updates
  };
  
  const result = await repository.update(updatedRole);
  
  if (!result) {
    return { status: 'notFound' };
  }
  
  return { status: 'updated', role: result };
}
