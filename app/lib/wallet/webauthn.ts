/**
 * WebAuthn biometric authentication for wallet unlock.
 * Uses PRF extension when available, SHA-256 fallback otherwise.
 * All operations are client-side only.
 */

export interface BiometricCredentialData {
  credentialId: string;       // base64url
  prfSupported: boolean;
  prfSalt: string;            // base64url, 32 bytes random
  encryptedPassword: string;  // base64, AES-256-GCM ciphertext
  passwordIv: string;         // base64, 12 bytes
  fallbackSalt: string;       // base64, 32 bytes (used in SHA-256 fallback)
  createdAt: string;
  rpId: string;
}

// --- Encoding helpers ---

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// --- Crypto helpers ---

async function deriveKeyFromPRF(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', prfOutput, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function deriveFallbackKey(credentialId: string, fallbackSalt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const data = new Uint8Array([
    ...encoder.encode(credentialId),
    ...new Uint8Array(base64ToBuffer(fallbackSalt)),
  ]);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptPassword(password: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(password);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
}

async function decryptPassword(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

function getRpId(): string {
  return window.location.hostname;
}

// --- Public API ---

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(userId: string, password: string): Promise<BiometricCredentialData> {
  const rpId = getRpId();
  const prfSaltBytes = crypto.getRandomValues(new Uint8Array(32));
  const fallbackSaltBytes = crypto.getRandomValues(new Uint8Array(32));
  const prfSalt = bufferToBase64url(prfSaltBytes.buffer);
  const fallbackSalt = bufferToBase64(fallbackSaltBytes.buffer);

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId.slice(0, 64));

  // Create credential with PRF extension
  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: 'Atlas Wallet', id: rpId },
    user: {
      id: userIdBytes,
      name: `atlas-wallet-${userId.slice(0, 8)}`,
      displayName: 'Atlas Wallet',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    extensions: {
      prf: { eval: { first: prfSaltBytes } },
    } as any,
  };

  const credential = await navigator.credentials.create({
    publicKey: createOptions,
  }) as PublicKeyCredential;

  if (!credential) throw new Error('Falha ao criar credencial biométrica');

  const credentialId = bufferToBase64url(credential.rawId);

  // Check if PRF was supported during creation
  const createExtensions = (credential.getClientExtensionResults() as any);
  let prfSupported = !!(createExtensions?.prf?.enabled);

  let encryptionKey: CryptoKey;

  if (prfSupported) {
    // Do an immediate assertion to get the actual PRF output
    const assertChallenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: assertChallenge,
        rpId,
        allowCredentials: [{ id: credential.rawId, type: 'public-key' }],
        userVerification: 'required',
        extensions: {
          prf: { eval: { first: prfSaltBytes } },
        } as any,
        timeout: 60000,
      },
    }) as PublicKeyCredential;

    const assertExtensions = (assertion.getClientExtensionResults() as any);
    const prfResults = assertExtensions?.prf?.results;

    if (prfResults?.first) {
      encryptionKey = await deriveKeyFromPRF(prfResults.first);
    } else {
      // PRF claimed supported but didn't produce output — fallback
      prfSupported = false;
      encryptionKey = await deriveFallbackKey(credentialId, fallbackSalt);
    }
  } else {
    encryptionKey = await deriveFallbackKey(credentialId, fallbackSalt);
  }

  const { ciphertext, iv } = await encryptPassword(password, encryptionKey);

  return {
    credentialId,
    prfSupported,
    prfSalt,
    encryptedPassword: ciphertext,
    passwordIv: iv,
    fallbackSalt,
    createdAt: new Date().toISOString(),
    rpId,
  };
}

export async function authenticateWithBiometric(credential: BiometricCredentialData): Promise<string> {
  const currentRpId = getRpId();
  if (credential.rpId !== currentRpId) {
    throw new Error('Credencial biométrica inválida para este domínio');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credIdBuffer = base64urlToBuffer(credential.credentialId);
  const prfSaltBytes = new Uint8Array(base64urlToBuffer(credential.prfSalt));

  const getOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: currentRpId,
    allowCredentials: [{ id: credIdBuffer, type: 'public-key' }],
    userVerification: 'required',
    timeout: 60000,
    extensions: credential.prfSupported
      ? { prf: { eval: { first: prfSaltBytes } } } as any
      : undefined,
  };

  const assertion = await navigator.credentials.get({
    publicKey: getOptions,
  }) as PublicKeyCredential;

  if (!assertion) throw new Error('Autenticação biométrica cancelada');

  let decryptionKey: CryptoKey;

  if (credential.prfSupported) {
    const extensions = (assertion.getClientExtensionResults() as any);
    const prfResults = extensions?.prf?.results;

    if (prfResults?.first) {
      decryptionKey = await deriveKeyFromPRF(prfResults.first);
    } else {
      throw new Error('Falha ao obter chave PRF. Tente usar a senha.');
    }
  } else {
    decryptionKey = await deriveFallbackKey(credential.credentialId, credential.fallbackSalt);
  }

  return decryptPassword(credential.encryptedPassword, credential.passwordIv, decryptionKey);
}
