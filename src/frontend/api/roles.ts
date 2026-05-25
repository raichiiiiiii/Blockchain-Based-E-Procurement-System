import { requestJson } from './http-client';
import { createSessionHeaders } from './auth-headers';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { CreateRoleRequest, UpdateRoleRequest, RoleResponse } from '../types/role';

export async function listRoles(session?: AuthenticatedFrontendSession): Promise<RoleResponse[]> {
  return requestJson<RoleResponse[]>('/api/v1/roles', {
    headers: createSessionHeaders(session)
  });
}

export async function createRole(payload: CreateRoleRequest, session?: AuthenticatedFrontendSession): Promise<RoleResponse> {
  return requestJson<RoleResponse>('/api/v1/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}

export async function updateRole(
  roleId: string,
  payload: UpdateRoleRequest,
  session?: AuthenticatedFrontendSession
): Promise<RoleResponse> {
  return requestJson<RoleResponse>(`/api/v1/roles/${roleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}
