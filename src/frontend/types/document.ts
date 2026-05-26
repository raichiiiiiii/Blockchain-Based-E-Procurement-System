export type DocumentType =
  | 'contract'
  | 'purchaseOrder'
  | 'deliveryProof'
  | 'invoice'
  | 'exportBundle'
  | 'shariahCertificate'
  | 'other';

export type ExtractionStatus = 'pending' | 'extracted' | 'failed' | 'unsupported';
export type SignatureStatus = 'notProvided' | 'pending' | 'verified' | 'invalid' | 'unsupported';

export type DocumentSignatureInput = {
  signatureType?: string;
  signatureValue?: string;
  certificateId?: string;
  signerName?: string;
  signedAt?: string;
};

export type DocumentSignatureMetadata = {
  signatureStatus: SignatureStatus;
  signatureType?: string;
  certificateId?: string;
  signerName?: string;
  signedAt?: string;
  trustModel?: 'localMetadataOnly';
  verificationSummary?: string;
};

export type DocumentMetadata = {
  documentId: string;
  ownerOrganizationId: string;
  uploadedByUserId: string;
  documentType: DocumentType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageRef: string;
  sha256: string;
  malwareScanStatus: 'notScanned' | 'passed' | 'failed' | 'unsupported';
  extractionStatus: ExtractionStatus;
  signatureStatus: SignatureStatus;
  signatureMetadata?: DocumentSignatureMetadata;
  createdAt: string;
};

export type DocumentExtractionRecord = {
  documentId: string;
  status: ExtractionStatus;
  language?: string;
  extractionConfidence?: number;
  extractedText?: string;
  extractedFields: Record<string, unknown>;
  unmappedSections: string[];
  warnings: string[];
  createdAt: string;
};

export type UploadDocumentRequest = {
  documentType: DocumentType;
  filename: string;
  mimeType: string;
  textContent?: string;
  contentBase64?: string;
  signature?: DocumentSignatureInput;
};
