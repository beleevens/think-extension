/**
 * Cryptographic utilities for secure API key storage
 * Uses Web Crypto API with AES-GCM encryption
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Get or generate a device-specific salt for key derivation
 */
async function getSalt(): Promise<Uint8Array> {
  const result = await chrome.storage.local.get('__crypto_salt');

  if (result.__crypto_salt) {
    // Convert stored array back to Uint8Array
    return new Uint8Array(result.__crypto_salt);
  }

  // Generate new salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  await chrome.storage.local.set({ __crypto_salt: Array.from(salt) });
  return salt;
}

/**
 * Get or generate a random master key for encryption
 * This key is generated once per device and stored securely
 */
async function getMasterKey(): Promise<Uint8Array> {
  const result = await chrome.storage.local.get('__master_key');

  if (result.__master_key) {
    // Convert stored array back to Uint8Array
    return new Uint8Array(result.__master_key);
  }

  // Generate random 256-bit master key
  const masterKey = crypto.getRandomValues(new Uint8Array(32));
  await chrome.storage.local.set({ __master_key: Array.from(masterKey) });
  return masterKey;
}

/**
 * Derive an encryption key from random master key
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  // Use random master key as key material
  const masterKey = await getMasterKey();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    masterKey.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 * @param plaintext The string to encrypt
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptValue(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.trim() === '') {
    return '';
  }

  try {
    const salt = await getSalt();
    const key = await deriveKey(salt);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt an encrypted string value
 * @param encrypted Base64-encoded encrypted data with IV prepended
 * @returns Decrypted plaintext string
 */
export async function decryptValue(encrypted: string): Promise<string> {
  if (!encrypted || encrypted.trim() === '') {
    return '';
  }

  try {
    const salt = await getSalt();
    const key = await deriveKey(salt);

    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt value - data may be corrupted');
  }
}

/**
 * Check if a value is encrypted (base64 format with sufficient length)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Check if it's valid base64 and has minimum length
  try {
    const decoded = atob(value);
    return decoded.length >= IV_LENGTH + 16; // IV + minimum encrypted data
  } catch {
    return false;
  }
}

/**
 * Migrate plain text value to encrypted format
 */
export async function migrateToEncrypted(plaintext: string): Promise<string> {
  if (!plaintext) {
    return '';
  }

  // If already encrypted, return as-is
  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  // Encrypt plain text
  return await encryptValue(plaintext);
}

/**
 * Validate API key format before encryption
 */
export function validateApiKeyFormat(key: string, provider: 'venice' | 'claude'): { valid: boolean; error?: string } {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'API key cannot be empty' };
  }

  const trimmedKey = key.trim();

  // Check for common issues
  if (trimmedKey.includes(' ')) {
    return { valid: false, error: 'API key should not contain spaces' };
  }

  if (trimmedKey.length < 20) {
    return { valid: false, error: 'API key is too short' };
  }

  // Provider-specific validation
  if (provider === 'claude') {
    // Claude API keys typically start with 'sk-ant-'
    if (!trimmedKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'Claude API keys should start with "sk-ant-"' };
    }

    if (trimmedKey.length < 40) {
      return { valid: false, error: 'Claude API key appears to be incomplete' };
    }
  } else if (provider === 'venice') {
    // Venice API keys validation (adjust based on actual format)
    if (trimmedKey.length < 32) {
      return { valid: false, error: 'Venice API key appears to be incomplete' };
    }
  }

  return { valid: true };
}
