export type StoreDocumentInput = {
  documentId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type StoredDocumentObject = {
  storageRef: string;
  sizeBytes: number;
  sha256: string;
};

export interface DocumentStoragePort {
  store(input: StoreDocumentInput): Promise<StoredDocumentObject>;
}
