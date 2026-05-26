import type { ShariahCertificate } from '../domain/shariah-certificate.js';
import type { ShariahCertificateRepository } from '../application/shariah-certificate-repository.js';

function clone(certificate: ShariahCertificate): ShariahCertificate {
  return JSON.parse(JSON.stringify(certificate)) as ShariahCertificate;
}

export class InMemoryShariahCertificateRepository implements ShariahCertificateRepository {
  private readonly certificates = new Map<string, ShariahCertificate>();

  constructor(seedCertificates: ShariahCertificate[] = []) {
    for (const certificate of seedCertificates) {
      this.certificates.set(certificate.certificateId, clone(certificate));
    }
  }

  async save(certificate: ShariahCertificate): Promise<ShariahCertificate> {
    const stored = clone(certificate);
    this.certificates.set(stored.certificateId, stored);
    return clone(stored);
  }

  async findById(certificateId: string): Promise<ShariahCertificate | null> {
    const certificate = this.certificates.get(certificateId);
    return certificate ? clone(certificate) : null;
  }

  async list(): Promise<ShariahCertificate[]> {
    return [...this.certificates.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.certificateId.localeCompare(right.certificateId))
      .map(clone);
  }
}
