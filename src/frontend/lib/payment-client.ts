import type { AuthenticatedFrontendSession } from './session-state';
import { requestJson } from '../api/http-client';
import { createLocalDemoFallbackDisabledError, isLocalDemoFallbackEnabled } from './runtime-config';

export type PaymentInstructionStatus =
  | 'pending'
  | 'accepted'
  | 'failed'
  | 'settled'
  | 'cancelled';

export type PaymentInstruction = {
  paymentInstructionId: string;
  escrowId: string;
  amount: string;
  currency: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  status: PaymentInstructionStatus;
  paymentReference: string;
  adapterName: 'manualSettlement' | 'localSandbox';
  adapterReference?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

function authHeaders(session?: AuthenticatedFrontendSession): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.source === 'backend') {
    headers.Authorization = `Bearer ${session.sessionToken}`;
  }

  return headers;
}

function assertBackendSession(session?: AuthenticatedFrontendSession): void {
  if (session?.source !== 'backend') {
    if (!isLocalDemoFallbackEnabled()) {
      throw createLocalDemoFallbackDisabledError('Payment instructions');
    }
  }
}

export async function createPaymentInstruction(
  escrowId: string,
  amount: string,
  currency: string,
  session?: AuthenticatedFrontendSession,
): Promise<PaymentInstruction> {
  assertBackendSession(session);
  if (session?.source !== 'backend' && isLocalDemoFallbackEnabled()) {
    return {
      paymentInstructionId: `local-payment-${Date.now()}`,
      escrowId,
      amount,
      currency,
      debtorOrganizationId: session?.actor.actorOrganizationId ?? 'local-demo-org',
      creditorOrganizationId: 'local-demo-supplier',
      status: 'accepted',
      paymentReference: `escrow:${escrowId}`,
      adapterName: 'localSandbox',
      adapterReference: `sandbox-payment:${escrowId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return requestJson<PaymentInstruction>('/api/v1/payments/instructions', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({
      escrowId,
      amount,
      currency,
      adapterName: 'localSandbox',
    }),
  });
}

export async function reconcilePaymentInstruction(
  paymentInstructionId: string,
  status: PaymentInstructionStatus,
  session?: AuthenticatedFrontendSession,
): Promise<PaymentInstruction> {
  assertBackendSession(session);
  if (session?.source !== 'backend' && isLocalDemoFallbackEnabled()) {
    return {
      paymentInstructionId,
      escrowId: 'local-demo-escrow',
      amount: '68000.00',
      currency: 'MYR',
      debtorOrganizationId: session?.actor.actorOrganizationId ?? 'local-demo-org',
      creditorOrganizationId: 'local-demo-supplier',
      status,
      paymentReference: `escrow:${paymentInstructionId}`,
      adapterName: 'localSandbox',
      adapterReference: `sandbox-payment:${paymentInstructionId}`,
      failureReason: status === 'failed' ? 'Sandbox reconciliation marked the instruction failed' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return requestJson<PaymentInstruction>(`/api/v1/payments/instructions/${paymentInstructionId}/reconcile`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ status }),
  });
}
