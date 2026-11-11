import { getRandomBytes, stringToUtf8 } from "./utils.js";

const crypto = globalThis.crypto;

/**
 * Imports a raw 32-byte key buffer into a Web Crypto AES-GCM CryptoKey.
 */
export async function importRawKey(
  rawBytes: Uint8Array,
  usages: KeyUsage[] = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    rawBytes as unknown as BufferSource,
    { name: "AES-GCM", length: 256 },
    true,
    usages
  );
}

/**
 * Exports a CryptoKey to raw 32-byte Uint8Array.
 */
export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(exported);
}

/**
 * Generates a random 256-bit AES-GCM Vault Root Key (VRK).
 */
export async function generateVaultRootKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

/**
 * Derives a domain-separated subkey from a master key using HKDF-SHA-256.
 */
export async function deriveSubkey(
  masterKeyBytes: Uint8Array,
  saltString: string,
  infoString: string
): Promise<CryptoKey> {
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    masterKeyBytes as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: stringToUtf8(saltString) as unknown as BufferSource,
      info: stringToUtf8(infoString) as unknown as BufferSource,
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Wraps a target CryptoKey using AES-256-GCM with authenticated associated data.
 */
export async function wrapKeyWithAad(
  keyToWrap: CryptoKey,
  wrappingKey: CryptoKey,
  aadString: string
): Promise<{ wrappedKeyBytes: Uint8Array; nonceBytes: Uint8Array }> {
  const nonceBytes = getRandomBytes(12); // 96-bit nonce
  const rawTargetBytes = await exportRawKey(keyToWrap);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonceBytes as unknown as BufferSource,
      additionalData: stringToUtf8(aadString) as unknown as BufferSource,
      tagLength: 128,
    },
    wrappingKey,
    rawTargetBytes as unknown as BufferSource
  );

  return {
    wrappedKeyBytes: new Uint8Array(ciphertextBuffer),
    nonceBytes,
  };
}

/**
 * Unwraps a wrapped CryptoKey using AES-256-GCM and verifies AAD.
 */
export async function unwrapKeyWithAad(
  wrappedKeyBytes: Uint8Array,
  nonceBytes: Uint8Array,
  unwrappingKey: CryptoKey,
  aadString: string
): Promise<CryptoKey> {
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonceBytes as unknown as BufferSource,
      additionalData: stringToUtf8(aadString) as unknown as BufferSource,
      tagLength: 128,
    },
    unwrappingKey,
    wrappedKeyBytes as unknown as BufferSource
  );

  return await importRawKey(new Uint8Array(decryptedBuffer));
}

/**
 * Encrypts arbitrary plaintext bytes with AES-256-GCM and AAD.
 */
export async function encryptAesGcm(
  key: CryptoKey,
  plaintextBytes: Uint8Array,
  aadString: string
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const nonce = getRandomBytes(12);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce as unknown as BufferSource,
      additionalData: stringToUtf8(aadString) as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    plaintextBytes as unknown as BufferSource
  );

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    nonce,
  };
}

/**
 * Decrypts AES-256-GCM ciphertext bytes and verifies canonical AAD.
 */
export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextBytes: Uint8Array,
  nonceBytes: Uint8Array,
  aadString: string
): Promise<Uint8Array> {
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonceBytes as unknown as BufferSource,
      additionalData: stringToUtf8(aadString) as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  return new Uint8Array(plaintextBuffer);
}
