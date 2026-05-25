import type { EscrowRecord } from '../domain/escrow.js';
import { isActiveEscrowStatus } from '../domain/escrow.js';
import type { EscrowRepository } from '../application/escrow-repository.js';

export type EscrowPersistenceErrorReason =
  | 'duplicateEscrowId'
  | 'escrowNotFound'
  | 'duplicateActiveOrderEscrow';

export class EscrowPersistenceError extends Error {
  constructor(
    public readonly reason: EscrowPersistenceErrorReason,
    message: string,
  ) {
    super(message);
    this.name = 'EscrowPersistenceError';
  }
}

function cloneEscrow(escrow: EscrowRecord): EscrowRecord {
  return JSON.parse(JSON.stringify(escrow)) as EscrowRecord;
}

export class InMemoryEscrowRepository implements EscrowRepository {
  private readonly escrows = new Map<string, EscrowRecord>();

  constructor(seedEscrows: EscrowRecord[] = []) {
    for (const escrow of seedEscrows) {
      this.escrows.set(escrow.escrowId, cloneEscrow(escrow));
    }
  }

  async create(escrow: EscrowRecord): Promise<EscrowRecord> {
    if (this.escrows.has(escrow.escrowId)) {
      throw new EscrowPersistenceError(
        'duplicateEscrowId',
        `Escrow '${escrow.escrowId}' already exists`,
      );
    }

    const activeEscrow = await this.findActiveByOrderId(escrow.orderId);
    if (activeEscrow) {
      throw new EscrowPersistenceError(
        'duplicateActiveOrderEscrow',
        `Order '${escrow.orderId}' already has an active escrow`,
      );
    }

    this.escrows.set(escrow.escrowId, cloneEscrow(escrow));
    return cloneEscrow(escrow);
  }

  async update(escrow: EscrowRecord): Promise<EscrowRecord> {
    if (!this.escrows.has(escrow.escrowId)) {
      throw new EscrowPersistenceError(
        'escrowNotFound',
        `Escrow '${escrow.escrowId}' was not found`,
      );
    }

    this.escrows.set(escrow.escrowId, cloneEscrow(escrow));
    return cloneEscrow(escrow);
  }

  async findById(escrowId: string): Promise<EscrowRecord | null> {
    const escrow = this.escrows.get(escrowId);
    return escrow ? cloneEscrow(escrow) : null;
  }

  async findActiveByOrderId(orderId: string): Promise<EscrowRecord | null> {
    const escrow = [...this.escrows.values()].find(candidate => (
      candidate.orderId === orderId && isActiveEscrowStatus(candidate.status)
    ));

    return escrow ? cloneEscrow(escrow) : null;
  }
}
