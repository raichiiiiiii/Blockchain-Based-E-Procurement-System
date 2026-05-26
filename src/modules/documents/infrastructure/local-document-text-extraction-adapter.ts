import type { DocumentTextExtractionPort, ExtractDocumentTextInput } from '../application/document-text-extraction-port.js';
import type { DocumentExtractionRecord, MachineReadableContractFields } from '../domain/document.js';

const keyPatterns: Array<[keyof MachineReadableContractFields, RegExp]> = [
  ['contractTitle', /^(?:contract title|title):\s*(.+)$/i],
  ['effectiveDate', /^effective date:\s*(.+)$/i],
  ['expiryDate', /^(?:expiry date|expiration date):\s*(.+)$/i],
  ['goodsOrServices', /^(?:goods\/services|goods or services|services):\s*(.+)$/i],
  ['quantities', /^(?:quantity|quantities):\s*(.+)$/i],
  ['price', /^price:\s*(.+)$/i],
  ['currency', /^currency:\s*(.+)$/i],
  ['deliveryTerms', /^delivery terms:\s*(.+)$/i],
  ['paymentTerms', /^payment terms:\s*(.+)$/i],
  ['escrowTerms', /^escrow terms:\s*(.+)$/i],
  ['disputeClause', /^dispute clause:\s*(.+)$/i],
  ['governingLaw', /^governing law:\s*(.+)$/i],
];

function textFromBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('utf8').replace(/\u0000/g, '');
}

function extractContractFields(text: string): MachineReadableContractFields {
  const fields: MachineReadableContractFields = {};
  const parties: NonNullable<MachineReadableContractFields['parties']> = {};
  const registrationNumbers = new Set<string>();
  const signatures = new Set<string>();
  const attachments = new Set<string>();
  const clauseReferences = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const buyer = /^buyer:\s*(.+)$/i.exec(line);
    if (buyer) {
      parties.buyer = buyer[1].trim();
      continue;
    }

    const supplier = /^supplier:\s*(.+)$/i.exec(line);
    if (supplier) {
      parties.supplier = supplier[1].trim();
      continue;
    }

    const financier = /^financier:\s*(.+)$/i.exec(line);
    if (financier) {
      parties.financier = financier[1].trim();
      continue;
    }

    const registration = /(?:registration number|registration no\.?|reg no\.?):\s*([a-zA-Z0-9._/-]+)/i.exec(line);
    if (registration) {
      registrationNumbers.add(registration[1].trim());
      continue;
    }

    const signature = /^signature:\s*(.+)$/i.exec(line);
    if (signature) {
      signatures.add(signature[1].trim());
      continue;
    }

    const attachment = /^attachment:\s*(.+)$/i.exec(line);
    if (attachment) {
      attachments.add(attachment[1].trim());
      continue;
    }

    const clause = /^(?:clause|section)\s+([a-zA-Z0-9.-]+):/i.exec(line);
    if (clause) {
      clauseReferences.add(clause[1].trim());
    }

    for (const [field, pattern] of keyPatterns) {
      const match = pattern.exec(line);
      if (match) {
        (fields as Record<string, string>)[field] = match[1].trim();
        break;
      }
    }
  }

  if (Object.keys(parties).length > 0) {
    fields.parties = parties;
  }
  if (registrationNumbers.size > 0) {
    fields.registrationNumbers = [...registrationNumbers];
  }
  if (signatures.size > 0) {
    fields.signatures = [...signatures];
  }
  if (attachments.size > 0) {
    fields.attachments = [...attachments];
  }
  if (clauseReferences.size > 0) {
    fields.clauseReferences = [...clauseReferences];
  }

  return fields;
}

export class LocalDocumentTextExtractionAdapter implements DocumentTextExtractionPort {
  async extract(input: ExtractDocumentTextInput): Promise<DocumentExtractionRecord> {
    if (input.mimeType === 'application/pdf' || input.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return {
        documentId: input.documentId,
        status: 'unsupported',
        extractedFields: {},
        unmappedSections: [],
        warnings: ['PDF and DOCX binary text extraction require a production extractor adapter. Raw files are stored off-chain.'],
        createdAt: input.createdAt,
      };
    }

    try {
      const text = textFromBytes(input.bytes);
      const isJson = input.mimeType === 'application/json';
      const extractedFields = isJson
        ? { attachments: Object.keys(JSON.parse(text)).slice(0, 20) }
        : extractContractFields(text);

      return {
        documentId: input.documentId,
        status: 'extracted',
        language: 'en',
        extractionConfidence: Object.keys(extractedFields).length > 0 ? 0.82 : 0.55,
        extractedText: text,
        extractedFields,
        unmappedSections: [],
        warnings: isJson ? ['JSON keys are captured as attachment-style metadata for the MVP extraction seam.'] : [],
        createdAt: input.createdAt,
      };
    } catch (error) {
      return {
        documentId: input.documentId,
        status: 'failed',
        extractedFields: {},
        unmappedSections: [],
        warnings: [error instanceof Error ? error.message : 'Document extraction failed'],
        createdAt: input.createdAt,
      };
    }
  }
}
