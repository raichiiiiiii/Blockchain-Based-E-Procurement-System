import { requestJson } from './http-client';
import type {
  CreateRoleAssignmentRequest,
  RoleAssignmentResponse,
  ChangeRoleAssignmentRequest,
  ChangeRoleAssignmentResponse,
  RemoveRoleAssignmentRequest,
  RemoveRoleAssignmentResponse
} from '../types/role-assignment';

export async function createRoleAssignment(
  payload: CreateRoleAssignmentRequest
): Promise<RoleAssignmentResponse> {
  return requestJson<RoleAssignmentResponse>('/api/v1/role-assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function changeRoleAssignment(
  payload: ChangeRoleAssignmentRequest
): Promise<ChangeRoleAssignmentResponse> {
  return requestJson<ChangeRoleAssignmentResponse>('/api/v1/role-assignments/change', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function removeRoleAssignment(
  payload: RemoveRoleAssignmentRequest
): Promise<RemoveRoleAssignmentResponse> {
  const params = new URLSearchParams({
    userId: payload.userId,
    organizationId: payload.organizationId,
    roleId: payload.roleId
  });

  return requestJson<RemoveRoleAssignmentResponse>(
    `/api/v1/role-assignments?${params.toString()}`,
    {
      method: 'DELETE'
    }
  );
}
