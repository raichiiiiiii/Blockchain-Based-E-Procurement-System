import { BackendApiError } from '../api/errors';
import { requestJson } from '../api/http-client';

export type BlockchainAnchorStatus = 'notAnchored' | 'pending' | 'anchored' | 'failed';
export type BlockchainVerificationStatus = 'verified' | 'mismatch' | 'notFound' | 'unavailable';
export type BlockchainProofDataSource = 'backend' | 'localDemoAdapter';

export type BlockchainProofRecord = {
  eventId: string;
  anchorStatus: BlockchainAnchorStatus;
  payloadHash?: string;
  blockchainNetwork?: 'fabric-local' | 'fabric';
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
  source?: BlockchainProofDataSource;
};

export type BlockchainVerificationResult = {
  eventId: string;
  verificationStatus: BlockchainVerificationStatus;
  submittedPayloadHash: string;
  anchoredPayloadHash?: string;
  anchoredAt?: string;
  source?: BlockchainProofDataSource;
};

export type VerifyBlockchainProofInput = {
  eventId: string;
  payloadHash?: string;
};

const localProofRecords: Record<string, BlockchainProofRecord> = {
  'audit-event-anchored': {
    eventId: 'audit-event-anchored',
    anchorStatus: 'anchored',
    payloadHash: 'sha256:8f31c92af4d3b51658f4b84e2b0c1320b10a7716f6c5d0cb9b2f3dd781cf94a5',
    blockchainNetwork: 'fabric-local',
    channelName: 'procurement-channel',
    chaincodeName: 'audit-anchor',
    anchoredAt: '2026-05-24T10:00:00.000Z',
    source: 'localDemoAdapter',
  },
  'audit-event-mismatch': {
    eventId: 'audit-event-mismatch',
    anchorStatus: 'anchored',
    payloadHash: 'sha256:9a41f2d08a7b9df38c69d93f8c7ea95fb8c15b8fb32ad179a6d239d79a40f2ef',
    blockchainNetwork: 'fabric-local',
    channelName: 'procurement-channel',
    chaincodeName: 'audit-anchor',
    anchoredAt: '2026-05-24T10:06:00.000Z',
    source: 'localDemoAdapter',
  },
  'audit-event-not-found': {
    eventId: 'audit-event-not-found',
    anchorStatus: 'anchored',
    payloadHash: 'sha256:2f1119b4cc0d45bd16f734f59be31afc5192f92a2efde805088d2cce128b36ac',
    blockchainNetwork: 'fabric-local',
    channelName: 'procurement-channel',
    chaincodeName: 'audit-anchor',
    source: 'localDemoAdapter',
  },
  'audit-event-unavailable': {
    eventId: 'audit-event-unavailable',
    anchorStatus: 'anchored',
    payloadHash: 'sha256:fb7e2a191fa3cc941b513f7c8deff2f33b5a70f37d55be64c3ca83bf79f5a2b8',
    blockchainNetwork: 'fabric-local',
    channelName: 'procurement-channel',
    chaincodeName: 'audit-anchor',
    source: 'localDemoAdapter',
  },
  'audit-event-pending': {
    eventId: 'audit-event-pending',
    anchorStatus: 'pending',
    payloadHash: 'sha256:79d31a602f8269fe324f509d14d5ee844a0717dc96ee0df16e2f3f627998a0c3',
    source: 'localDemoAdapter',
  },
  'audit-event-failed': {
    eventId: 'audit-event-failed',
    anchorStatus: 'failed',
    payloadHash: 'sha256:434d708f7c7fa18e9c9e0b18468d833767bb89d6227729be0323929213fd06d2',
    failureReason: 'Fabric proof service is unavailable. The off-chain event remains recorded.',
    source: 'localDemoAdapter',
  },
  'audit-event-not-anchored': {
    eventId: 'audit-event-not-anchored',
    anchorStatus: 'notAnchored',
    payloadHash: 'sha256:0b2dd536812ef31cbf4c553e9b1cfe854a5f23eb5c54f8e9bb858fabf3e41c12',
    source: 'localDemoAdapter',
  },
  'escrow-created-pending': {
    eventId: 'escrow-created-pending',
    anchorStatus: 'pending',
    payloadHash: 'sha256:60bbd179b6c8d614109f6ba4fd161b97589f8e6e54c4abec2ce9e07a6f49160b',
    source: 'localDemoAdapter',
  },
};

const localVerificationResults: Record<string, BlockchainVerificationResult> = {
  'audit-event-anchored': {
    eventId: 'audit-event-anchored',
    verificationStatus: 'verified',
    submittedPayloadHash: localProofRecords['audit-event-anchored'].payloadHash ?? '',
    anchoredPayloadHash: localProofRecords['audit-event-anchored'].payloadHash,
    anchoredAt: localProofRecords['audit-event-anchored'].anchoredAt,
    source: 'localDemoAdapter',
  },
  'audit-event-mismatch': {
    eventId: 'audit-event-mismatch',
    verificationStatus: 'mismatch',
    submittedPayloadHash: localProofRecords['audit-event-mismatch'].payloadHash ?? '',
    anchoredPayloadHash: 'sha256:712cb4f2c9af8d44f117a0df10657f7ef84c66702f5b54fcb5ff35f8ab13f4a1',
    anchoredAt: localProofRecords['audit-event-mismatch'].anchoredAt,
    source: 'localDemoAdapter',
  },
  'audit-event-not-found': {
    eventId: 'audit-event-not-found',
    verificationStatus: 'notFound',
    submittedPayloadHash: localProofRecords['audit-event-not-found'].payloadHash ?? '',
    source: 'localDemoAdapter',
  },
  'audit-event-unavailable': {
    eventId: 'audit-event-unavailable',
    verificationStatus: 'unavailable',
    submittedPayloadHash: localProofRecords['audit-event-unavailable'].payloadHash ?? '',
    source: 'localDemoAdapter',
  },
};

function withBackendSource(record: BlockchainProofRecord): BlockchainProofRecord {
  return {
    ...record,
    source: 'backend',
  };
}

function withBackendVerificationSource(result: BlockchainVerificationResult): BlockchainVerificationResult {
  return {
    ...result,
    source: 'backend',
  };
}

function createUnavailableVerification(input: VerifyBlockchainProofInput): BlockchainVerificationResult {
  return {
    eventId: input.eventId,
    verificationStatus: 'unavailable',
    submittedPayloadHash: input.payloadHash ?? '',
    source: 'localDemoAdapter',
  };
}

export function getLocalDemoProofRecord(eventId: string): BlockchainProofRecord {
  return localProofRecords[eventId] ?? {
    eventId,
    anchorStatus: 'notAnchored',
    source: 'localDemoAdapter',
  };
}

export function getLocalDemoProofRecords(eventIds: string[]): BlockchainProofRecord[] {
  return eventIds.map(eventId => getLocalDemoProofRecord(eventId));
}

export async function getBlockchainProof(eventId: string): Promise<BlockchainProofRecord> {
  try {
    return withBackendSource(await requestJson<BlockchainProofRecord>(
      `/api/v1/blockchain/anchors/${encodeURIComponent(eventId)}`,
    ));
  } catch (error) {
    if (error instanceof BackendApiError || error instanceof TypeError) {
      return getLocalDemoProofRecord(eventId);
    }

    throw error;
  }
}

export async function verifyBlockchainProof(
  input: VerifyBlockchainProofInput,
): Promise<BlockchainVerificationResult> {
  try {
    return withBackendVerificationSource(await requestJson<BlockchainVerificationResult>(
      `/api/v1/blockchain/anchors/${encodeURIComponent(input.eventId)}/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payloadHash: input.payloadHash ?? '' }),
      },
    ));
  } catch (error) {
    if (error instanceof BackendApiError || error instanceof TypeError) {
      return localVerificationResults[input.eventId] ?? createUnavailableVerification(input);
    }

    throw error;
  }
}
