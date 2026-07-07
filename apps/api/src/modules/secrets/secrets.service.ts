import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbProvider } from '../../data/database-provider';
import { encryptValue, decryptValue } from './crypto.util';

// Format of the secrets JSON file
interface SecretsData {
  [secretRefId: string]: string; // Maps ID -> encrypted base64 string
}

export class SecretsService {
  private getSecretsFilePath(): string {
    const userData = process.env.ATX_USER_DATA_PATH || process.cwd();
    return path.join(userData, 'secrets.json');
  }

  private readSecretsFile(): SecretsData {
    const filePath = this.getSecretsFilePath();
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to read secrets file', e);
      return {};
    }
  }

  private writeSecretsFile(data: SecretsData): void {
    const filePath = this.getSecretsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  private getMasterKey(): string {
    const key = process.env.ATX_MASTER_KEY || process.env.ATX_WEB_MASTER_KEY;
    if (!key) {
      throw new Error('Master key is not configured for encryption.');
    }
    return key;
  }

  /**
   * Sets a secret value. Encrypts it and stores the ciphertext, then creates/updates the reference.
   */
  async setSecret(userId: string, scope: string, label: string, plaintextValue: string): Promise<any> {
    const masterKey = this.getMasterKey();
    const id = crypto.randomUUID();

    // Generate redacted preview
    const redacted = '*'.repeat(Math.min(plaintextValue.length, 8));

    // Encrypt the value
    const encrypted = encryptValue(plaintextValue, masterKey);

    // Save metadata
    const ref = await dbProvider.secretReferences.create({
      id,
      userId,
      scope,
      label,
      keychainService: 'atx-desktop',
      keychainAccount: id,
      redactedPreview: redacted,
    });

    // Save ciphertext
    const secretsData = this.readSecretsFile();
    secretsData[id] = encrypted;
    this.writeSecretsFile(secretsData);

    return ref;
  }

  /**
   * Retrieves and decrypts a secret value.
   */
  async getSecret(userId: string, id: string): Promise<string> {
    const ref = await dbProvider.secretReferences.getById({ id, userId });
    if (!ref) {
      throw new Error('Secret reference not found');
    }

    const masterKey = this.getMasterKey();
    const secretsData = this.readSecretsFile();
    const encrypted = secretsData[id];

    if (!encrypted) {
      throw new Error('Ciphertext missing from secure storage');
    }

    return decryptValue(encrypted, masterKey);
  }

  /**
   * Lists metadata for all secrets belonging to a user.
   */
  async listSecrets(userId: string): Promise<any[]> {
    return await dbProvider.secretReferences.listByUser(userId);
  }

  /**
   * Deletes a secret and its reference.
   */
  async deleteSecret(userId: string, id: string): Promise<void> {
    // Delete metadata
    await dbProvider.secretReferences.delete({ id, userId });

    // Delete ciphertext
    const secretsData = this.readSecretsFile();
    if (secretsData[id]) {
      delete secretsData[id];
      this.writeSecretsFile(secretsData);
    }
  }
}
