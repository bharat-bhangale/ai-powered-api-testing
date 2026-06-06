import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { app, safeStorage } from 'electron';
import log from 'electron-log';

let isKeychainInitialized = false;
let masterKeyPlaintext: string | null = null;

/**
 * Initializes the master encryption key used by the local API server.
 * Uses Electron's native safeStorage to encrypt a generated master key,
 * storing the ciphertext in the app's userData directory.
 */
export async function initializeKeychain(): Promise<void> {
  if (isKeychainInitialized) return;

  log.info('[Keychain] Initializing desktop keychain...');

  if (!safeStorage.isEncryptionAvailable()) {
    log.error('[Keychain] safeStorage encryption is NOT available on this system.');
    throw new Error('Native OS encryption is unavailable. Cannot securely store secrets.');
  }

  const keyPath = path.join(app.getPath('userData'), 'master.key.enc');

  try {
    if (fs.existsSync(keyPath)) {
      // Read and decrypt existing key
      const encryptedKeyBuf = fs.readFileSync(keyPath);
      masterKeyPlaintext = safeStorage.decryptString(encryptedKeyBuf);
      log.info('[Keychain] Successfully loaded and decrypted existing master key.');
    } else {
      // Generate a new 32-byte (256-bit) cryptographically secure key
      masterKeyPlaintext = crypto.randomBytes(32).toString('hex');
      
      // Encrypt and save
      const encryptedKeyBuf = safeStorage.encryptString(masterKeyPlaintext);
      fs.writeFileSync(keyPath, encryptedKeyBuf);
      log.info('[Keychain] Generated and securely saved a new master key.');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error('[Keychain] Error initializing master key:', msg);
    throw new Error(`Keychain initialization failed: ${msg}`);
  }

  isKeychainInitialized = true;
}

/**
 * Returns the decrypted master key for injecting into the API server environment.
 */
export function getMasterKey(): string {
  if (!isKeychainInitialized || !masterKeyPlaintext) {
    throw new Error('Keychain is not initialized. Cannot retrieve master key.');
  }
  return masterKeyPlaintext;
}
