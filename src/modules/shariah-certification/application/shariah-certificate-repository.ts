import type { ShariahCertificate } from '../domain/shariah-certificate.js';

export interface ShariahCertificateRepository {
  save(certificate: ShariahCertificate): Promise<ShariahCertificate>;
  findById(certificateId: string): Promise<ShariahCertificate | null>;
  list(): Promise<ShariahCertificate[]>;
}
