import { createHash } from 'node:crypto';
import type { DocumentStoragePort, StoreDocumentInput, StoredDocumentObject } from '../application/document-storage-port.js';

export class InMemoryDocumentStorageAdapter implements DocumentStoragePort {
  private readonly objects = new Map<string, Uint8Array>();

  async store(input: StoreDocumentInput): Promise<StoredDocumentObject> {
    const storageRef = `memory-documents://${input.documentId}/${encodeURIComponent(input.filename)}`;
    const bytes = new Uint8Array(input.bytes);
    this.objects.set(storageRef, bytes);

    return {
      storageRef,
      sizeBytes: bytes.byteLength,
      sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    };
  }
}
