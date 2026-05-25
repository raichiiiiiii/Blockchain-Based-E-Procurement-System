import type { EscrowRecord } from '../domain/escrow.js';
import type { EscrowRepository } from './escrow-repository.js';

export type GetEscrowResult =
  | { status: 'found'; escrow: EscrowRecord }
  | { status: 'invalidInput'; issues: { path: string; message: string }[] }
  | { status: 'notFound' };

export async function getEscrow(
  repository: EscrowRepository,
  escrowId: string,
): Promise<GetEscrowResult> {
  if (!escrowId || escrowId.trim().length === 0) {
    return {
      status: 'invalidInput',
      issues: [{
        path: 'escrowId',
        message: 'escrowId is required and cannot be blank',
      }],
    };
  }

  const escrow = await repository.findById(escrowId.trim());
  if (!escrow) {
    return { status: 'notFound' };
  }

  return { status: 'found', escrow };
}
