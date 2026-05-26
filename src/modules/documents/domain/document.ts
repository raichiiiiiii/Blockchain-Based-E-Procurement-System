export type DocumentType =
  | 'contract'
  | 'purchaseOrder'
  | 'deliveryProof'
  | 'invoice'
  | 'exportBundle'
  | 'shariahCertificate'
  | 'other';

export const documentTypes: readonly DocumentType[] = [
  'contract',
  'purchaseOrder',
  'deliveryProof',
  'invoice',
  'exportBundle',
  'shariahCertificate',
  'other',
];

export type MalwareScanStatus = 'notScanned' | 'passed' | 'failed' | 'unsupported';
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
  malwareScanStatus: MalwareScanStatus;
  extractionStatus: ExtractionStatus;
  signatureStatus: SignatureStatus;
  signatureMetadata?: DocumentSignatureMetadata;
  createdAt: string;
};

export type MachineReadableContractFields = {
  parties?: {
    buyer?: string;
    supplier?: string;
    financier?: string;
  };
  registrationNumbers?: string[];
  contractTitle?: string;
  effectiveDate?: string;
  expiryDate?: string;
  goodsOrServices?: string;
  quantities?: string;
  price?: string;
  currency?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  escrowTerms?: string;
  disputeClause?: string;
  governingLaw?: string;
  signatures?: string[];
  attachments?: string[];
  clauseReferences?: string[];
};

export type DocumentExtractionRecord = {
  documentId: string;
  status: ExtractionStatus;
  language?: string;
  extractionConfidence?: number;
  extractedText?: string;
  extractedFields: MachineReadableContractFields;
  unmappedSections: string[];
  warnings: string[];
  createdAt: string;
};

export function isDocumentType(value: string): value is DocumentType {
  return documentTypes.includes(value as DocumentType);
}
