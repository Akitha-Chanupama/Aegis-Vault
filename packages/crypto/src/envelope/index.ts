import {
  ItemEncryptionEnvelope,
  DecryptedPayload,
  ItemKind,
} from "@aegis/shared";
import {
  deriveSubkey,
  exportRawKey,
  encryptAesGcm,
  decryptAesGcm,
  wrapKeyWithAad,
  unwrapKeyWithAad,
} from "../primitives/aes.js";
import {
  base64ToUint8Array,
  uint8ArrayToBase64,
  stringToUtf8,
  utf8ToString,
} from "../primitives/utils.js";

/**
 * Builds the canonical Authenticated Associated Data (AAD) string for a vault item.
 * Strictly binds vaultId, itemId, kind, and revision to prevent tampering and transplant attacks.
 */
export function buildItemAad(
  vaultId: string,
  itemId: string,
  kind: string,
  revision: number
): string {
  return `AEGIS-ITEM:v1:${vaultId}:${itemId}:${kind}:${revision}`;
}

/**
 * Builds the canonical AAD for wrapping the Vault Root Key under KEK.
 */
export function buildVaultWrapAad(vaultId: string, userId: string): string {
  return `AEGIS-VAULT-WRAP:v1:${userId}:${vaultId}`;
}

/**
 * Derives a dedicated item encryption key from the Vault Root Key.
 */
export async function deriveItemKey(
  vrk: CryptoKey,
  itemId: string
): Promise<CryptoKey> {
  const masterBytes = await exportRawKey(vrk);
  return await deriveSubkey(masterBytes, itemId, "aegis-item-v1");
}

/**
 * Encrypts a typed item payload into an authenticated encryption envelope.
 */
export async function encryptItemEnvelope(
  vrk: CryptoKey,
  vaultId: string,
  itemId: string,
  kind: ItemKind,
  revision: number,
  payload: DecryptedPayload["data"]
): Promise<ItemEncryptionEnvelope> {
  const itemKey = await deriveItemKey(vrk, itemId);
  const aad = buildItemAad(vaultId, itemId, kind, revision);
  const jsonString = JSON.stringify(payload);
  const plaintextBytes = stringToUtf8(jsonString);

  const { ciphertext, nonce } = await encryptAesGcm(itemKey, plaintextBytes, aad);

  return {
    cryptoVersion: 1,
    vaultId,
    itemId,
    kind,
    revision,
    alg: "AES-256-GCM",
    nonce: uint8ArrayToBase64(nonce),
    ciphertext: uint8ArrayToBase64(ciphertext),
  };
}

/**
 * Decrypts and verifies an authenticated item encryption envelope.
 */
export async function decryptItemEnvelope(
  vrk: CryptoKey,
  envelope: ItemEncryptionEnvelope
): Promise<DecryptedPayload["data"]> {
  if (envelope.cryptoVersion !== 1 || envelope.alg !== "AES-256-GCM") {
    throw new Error(`Unsupported envelope crypto specification: ${envelope.alg} v${envelope.cryptoVersion}`);
  }

  const itemKey = await deriveItemKey(vrk, envelope.itemId);
  const aad = buildItemAad(envelope.vaultId, envelope.itemId, envelope.kind, envelope.revision);
  const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);
  const nonceBytes = base64ToUint8Array(envelope.nonce);

  const decryptedBytes = await decryptAesGcm(itemKey, ciphertextBytes, nonceBytes, aad);
  const jsonString = utf8ToString(decryptedBytes);
  return JSON.parse(jsonString);
}

/**
 * Wraps the Vault Root Key (VRK) under the derived Key Encryption Key (KEK).
 */
export async function wrapVaultRootKey(
  vrk: CryptoKey,
  kek: CryptoKey,
  vaultId: string,
  userId: string
): Promise<{ wrappedRootKey: string; wrapNonce: string }> {
  const aad = buildVaultWrapAad(vaultId, userId);
  const { wrappedKeyBytes, nonceBytes } = await wrapKeyWithAad(vrk, kek, aad);

  return {
    wrappedRootKey: uint8ArrayToBase64(wrappedKeyBytes),
    wrapNonce: uint8ArrayToBase64(nonceBytes),
  };
}

/**
 * Unwraps the Vault Root Key (VRK) using the derived Key Encryption Key (KEK).
 */
export async function unwrapVaultRootKey(
  wrappedRootKeyBase64: string,
  wrapNonceBase64: string,
  kek: CryptoKey,
  vaultId: string,
  userId: string
): Promise<CryptoKey> {
  const aad = buildVaultWrapAad(vaultId, userId);
  const wrappedKeyBytes = base64ToUint8Array(wrappedRootKeyBase64);
  const nonceBytes = base64ToUint8Array(wrapNonceBase64);

  return await unwrapKeyWithAad(wrappedKeyBytes, nonceBytes, kek, aad);
}
