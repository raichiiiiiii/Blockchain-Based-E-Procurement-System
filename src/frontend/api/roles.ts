import { requestJson } from './http-client';
import type { CreateRoleRequest, UpdateRoleRequest, RoleResponse } from '../types/role';

export async function listRoles(): Promise<RoleResponse[]> {
  return requestJson<RoleResponse[]>('/api/v1/roles');
}

export async function createRole(payload: CreateRoleRequest): Promise<RoleResponse> {
  return requestJson<RoleResponse>('/api/v1/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function updateRole(
  roleId: string,
  payload: UpdateRoleRequest
): Promise<RoleResponse> {
  return requestJson<RoleResponse>(`/api/v1/roles/${roleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
