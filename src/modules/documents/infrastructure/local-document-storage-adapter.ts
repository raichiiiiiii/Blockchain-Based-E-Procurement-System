import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DocumentStoragePort, StoreDocumentInput, StoredDocumentObject } from '../application/document-storage-port.js';

function safeFilename(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return sanitized || 'document.bin';
}

export class LocalDocumentStorageAdapter implements DocumentStoragePort {
  constructor(private readonly rootDirectory = process.env.DOCUMENT_STORAGE_DIR ?? '.local-documents') {}

  async store(input: StoreDocumentInput): Promise<StoredDocumentObject> {
    const directory = join(this.rootDirectory, input.documentId);
    const filename = safeFilename(input.filename);
    const path = join(directory, filename);
    const bytes = Buffer.from(input.bytes);

    await mkdir(directory, { recursive: true });
    await writeFile(path, bytes);

    return {
      storageRef: `local-documents://${input.documentId}/${encodeURIComponent(filename)}`,
      sizeBytes: bytes.byteLength,
      sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    };
  }
}
