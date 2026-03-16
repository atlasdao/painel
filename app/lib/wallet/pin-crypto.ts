/**
 * PIN encryption/decryption module for wallet mnemonic protection.
 * Uses Web Crypto API (SubtleCrypto) throughout.
 * All binary values are stored as hex strings.
 */

import type { PinEncryptedBlob } from './wallet-types';

const PIN_PBKDF2_ITERATIONS = 100_000;

const WEAK_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444',
  '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '0123', '3210',
]);

// ─── Hex helpers ───

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// ─── Public API ───

/**
 * Generate a 256-bit random salt, returned as hex string.
 */
export function generateDeviceSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(salt);
}

/**
 * Validate a PIN against security rules.
 * Must be exactly 4 digits and not a weak/sequential pattern.
 */
export function validatePin(pin: string): { valid: boolean; reason?: string } {
  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, reason: 'O PIN deve ter exatamente 4 dígitos' };
  }

  if (WEAK_PINS.has(pin)) {
    return { valid: false, reason: 'PIN muito fraco. Evite sequências e repetições' };
  }

  return { valid: true };
}

/**
 * Derive an AES-256-GCM key from PIN + deviceSalt via PBKDF2.
 */
async function deriveKeyFromPin(
  pin: string,
  deviceSalt: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const password = encoder.encode(pin + deviceSalt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    password,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PIN_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a mnemonic with a 4-digit PIN using AES-256-GCM.
 *
 * @param mnemonic - The mnemonic phrase to encrypt
 * @param pin - A valid 4-digit PIN
 * @param existingDeviceSalt - Reuse an existing device salt (hex), or generate a new one
 * @returns PinEncryptedBlob with all binary fields as hex strings
 */
export async function encryptWithPin(
  mnemonic: string,
  pin: string,
  existingDeviceSalt?: string,
): Promise<PinEncryptedBlob> {
  const deviceSalt = existingDeviceSalt || generateDeviceSalt();
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPin(pin, deviceSalt, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(mnemonic);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer, tagLength: 128 },
    key,
    plaintext,
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(ciphertextBuf)),
    iv: bytesToHex(iv),
    salt: bytesToHex(salt),
    deviceSalt,
    iterations: PIN_PBKDF2_ITERATIONS,
  };
}

/**
 * Decrypt a PIN-encrypted mnemonic.
 *
 * @param blob - The PinEncryptedBlob to decrypt
 * @param pin - The 4-digit PIN used for encryption
 * @returns The decrypted mnemonic string
 * @throws Error('PIN incorreto') on decryption failure
 */
export async function decryptWithPin(
  blob: PinEncryptedBlob,
  pin: string,
): Promise<string> {
  const salt = hexToBytes(blob.salt);
  const iv = hexToBytes(blob.iv);
  const ciphertext = hexToBytes(blob.ciphertext);

  const key = await deriveKeyFromPin(pin, blob.deviceSalt, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer, tagLength: 128 },
      key,
      ciphertext.buffer as ArrayBuffer,
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('PIN incorreto');
  }
}
