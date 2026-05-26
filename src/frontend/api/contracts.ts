import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  ContractAcceptanceParty,
  CreateContractRequest,
  MachineReadableTerms,
  ProcurementContract,
} from '../types/contract';

function authHeaders(session: AuthenticatedFrontendSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.sessionToken}`,
  };
}

export async function createContract(
  payload: CreateContractRequest,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementContract> {
  return requestJson<ProcurementContract>('/api/v1/contracts', {
    method: 'POST',
    headers: {
      ...authHeaders(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function listContracts(session: AuthenticatedFrontendSession): Promise<ProcurementContract[]> {
  const response = await requestJson<{ items: ProcurementContract[] }>('/api/v1/contracts', {
    method: 'GET',
    headers: authHeaders(session),
  });

  return response.items;
}

export async function submitContractOffer(
  contractId: string,
  proposedTerms: MachineReadableTerms,
  comment: string,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementContract> {
  return requestJson<ProcurementContract>(`/api/v1/contracts/${contractId}/offers`, {
    method: 'POST',
    headers: {
      ...authHeaders(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ proposedTerms, comment }),
  });
}

export async function acceptContract(
  contractId: string,
  acceptedBy: ContractAcceptanceParty,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementContract> {
  return requestJson<ProcurementContract>(`/api/v1/contracts/${contractId}/acceptance`, {
    method: 'POST',
    headers: {
      ...authHeaders(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ acceptedBy }),
  });
}
