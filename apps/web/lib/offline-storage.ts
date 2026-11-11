import { ItemEncryptionEnvelope, VaultKeyEnvelope } from "@aegis/shared";

const ENVELOPES_STORAGE_KEY = "aegis_encrypted_envelopes";
const KEY_ENVELOPE_STORAGE_KEY = "aegis_key_envelope";

/**
 * Persists ciphertext envelopes to client browser storage for offline access.
 * Note: NEVER stores plaintext items, passphrases, or decrypted master keys.
 */
export function saveEncryptedEnvelopesToStorage(envelopes: ItemEncryptionEnvelope[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENVELOPES_STORAGE_KEY, JSON.stringify(envelopes));
  } catch {
    // Quota exceeded or private browsing restrictions
  }
}

/**
 * Loads cached ciphertext envelopes from client browser storage.
 */
export function loadEncryptedEnvelopesFromStorage(): ItemEncryptionEnvelope[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ENVELOPES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists the user's wrapped key envelope (ciphertext only) locally.
 */
export function saveKeyEnvelopeToStorage(envelope: VaultKeyEnvelope): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_ENVELOPE_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage error
  }
}

/**
 * Loads the user's wrapped key envelope (ciphertext only) from local storage.
 */
export function loadKeyEnvelopeFromStorage(): VaultKeyEnvelope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_ENVELOPE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears local offline cache when logging out.
 */
export function clearOfflineCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ENVELOPES_STORAGE_KEY);
  localStorage.removeItem(KEY_ENVELOPE_STORAGE_KEY);
}

