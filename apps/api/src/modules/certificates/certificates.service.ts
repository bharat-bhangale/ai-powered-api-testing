import { dbProvider } from '../../data/database-provider';
import crypto from 'crypto';
import { SecretsService } from '../secrets/secrets.service';

const secretsService = new SecretsService();

export class CertificatesService {
  async listCertificates(userId: string) {
    return dbProvider.certificates.listByUser(userId);
  }

  async getCertificate(userId: string, id: string) {
    return dbProvider.certificates.getById({ id, userId });
  }

  async createCertificate(userId: string, input: { label: string; certificateType: string; filePath: string; passphrase?: string }) {
    let passphraseSecretRefId = null;

    if (input.passphrase) {
      const secretRecord = await secretsService.setSecret(
        userId,
        'certificate',
        `Passphrase for certificate ${input.label}`,
        input.passphrase
      );
      passphraseSecretRefId = secretRecord.id;
    }

    return dbProvider.certificates.create({
      id: crypto.randomUUID(),
      userId,
      label: input.label,
      certificateType: input.certificateType,
      filePath: input.filePath,
      passphraseSecretRefId,
    });
  }

  async updateCertificate(userId: string, id: string, input: { label?: string; filePath?: string; passphrase?: string }) {
    let passphraseSecretRefId: string | undefined | null = undefined;

    if (input.passphrase !== undefined) {
      if (input.passphrase === '') {
        passphraseSecretRefId = null;
      } else {
        const secretRecord = await secretsService.setSecret(
          userId,
          'certificate',
          `Updated passphrase for certificate`,
          input.passphrase
        );
        passphraseSecretRefId = secretRecord.id;
      }
    }

    return dbProvider.certificates.update({
      id,
      userId,
      label: input.label,
      filePath: input.filePath,
      passphraseSecretRefId,
    });
  }

  async deleteCertificate(userId: string, id: string) {
    const cert = await dbProvider.certificates.getById({ id, userId });
    if (cert?.passphraseSecretRefId) {
      await secretsService.deleteSecret(userId, cert.passphraseSecretRefId);
    }
    await dbProvider.certificates.delete({ id, userId });
  }
}
