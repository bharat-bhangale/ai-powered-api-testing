import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypts a plaintext string using the provided master key.
 * Returns a base64 encoded string containing the salt, iv, tag, and ciphertext.
 */
export function encryptValue(plaintext: string, masterKeyHex: string): string {
  // Convert hex master key to buffer
  const keyBuf = Buffer.from(masterKeyHex, 'hex');
  if (keyBuf.length !== 32) {
    throw new Error('Master key must be exactly 32 bytes');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive a key using pbkdf2
  const derivedKey = crypto.pbkdf2Sync(keyBuf, salt, 100000, 32, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: salt:iv:tag:ciphertext
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64 encoded string using the provided master key.
 */
export function decryptValue(encryptedBase64: string, masterKeyHex: string): string {
  const keyBuf = Buffer.from(masterKeyHex, 'hex');
  if (keyBuf.length !== 32) {
    throw new Error('Master key must be exactly 32 bytes');
  }

  const dataBuf = Buffer.from(encryptedBase64, 'base64');

  const salt = dataBuf.subarray(0, SALT_LENGTH);
  const iv = dataBuf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = dataBuf.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = dataBuf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const derivedKey = crypto.pbkdf2Sync(keyBuf, salt, 100000, 32, 'sha512');

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}
