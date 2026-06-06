import https from 'https';
import fs from 'fs';
import { dbProvider } from '../../data/database-provider';
import { SecretsService } from '../secrets/secrets.service';

const secretsService = new SecretsService();

export async function getCertificateAgent(userId: string) {
  const settings = await dbProvider.settings.getAll();
  const certSettings = settings.certificates as { defaultCertificateId?: string | null };

  if (!certSettings || !certSettings.defaultCertificateId) {
    return null;
  }

  const cert = await dbProvider.certificates.getById({ id: certSettings.defaultCertificateId, userId });
  if (!cert || !fs.existsSync(cert.filePath)) {
    return null;
  }

  let passphrase;
  if (cert.passphraseSecretRefId) {
    try {
      passphrase = await secretsService.getSecret(userId, cert.passphraseSecretRefId);
    } catch {
      // Ignored
    }
  }

  const pfx = await fs.promises.readFile(cert.filePath);

  return new https.Agent({
    pfx,
    passphrase,
    rejectUnauthorized: false, // often needed for testing self-signed apis
  });
}
