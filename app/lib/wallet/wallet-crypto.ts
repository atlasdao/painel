/**
 * Main-thread crypto utilities for wallet setup.
 * BIP39 mnemonic generation and AES-256-GCM encryption.
 * These run on the main thread because they don't involve private keys
 * after encryption - the mnemonic is encrypted immediately and the
 * plaintext is discarded.
 */

import type { EncryptedWalletBlob } from './wallet-types';

const PBKDF2_ITERATIONS = 600_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function generateMnemonicWords(): Promise<string[]> {
  const bip39 = await import('bip39');
  const mnemonic = bip39.generateMnemonic(128); // 12 words
  return mnemonic.split(' ');
}

export async function validateMnemonic(words: string[]): Promise<boolean> {
  const bip39 = await import('bip39');
  return bip39.validateMnemonic(words.join(' '));
}

export async function encryptMnemonic(words: string[], password: string): Promise<EncryptedWalletBlob> {
  const mnemonicStr = words.join(' ');
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(mnemonicStr);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    plaintext,
  );

  const ctArray = new Uint8Array(ciphertextBuf);
  const ciphertext = ctArray.slice(0, ctArray.length - 16);
  const authTag = ctArray.slice(ctArray.length - 16);

  return {
    version: 1,
    kdf: 'pbkdf2',
    kdfParams: { iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
    authTag: btoa(String.fromCharCode(...authTag)),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptMnemonic(blob: EncryptedWalletBlob, password: string): Promise<string[]> {
  const salt = Uint8Array.from(atob(blob.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(blob.ciphertext), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(blob.authTag), c => c.charCodeAt(0));

  const key = await deriveKey(password, salt);

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    combined,
  );

  return new TextDecoder().decode(plaintext).split(' ');
}
