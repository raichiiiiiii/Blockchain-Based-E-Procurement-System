import { requestJson } from './http-client';
import type {
  CreateMemberOrganizationRequest,
  MemberOrganizationResponse
} from '../types/member-organization';

export async function createMemberOrganization(
  payload: CreateMemberOrganizationRequest
): Promise<MemberOrganizationResponse> {
  return requestJson<MemberOrganizationResponse>('/api/v1/member-organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
