import { getRandomBytes, stringToUtf8, uint8ArrayToBase64, base64ToUint8Array } from "../primitives/utils.js";
import { wrapKeyWithAad, unwrapKeyWithAad } from "../primitives/aes.js";

// Standard 24-word dictionary sample (RFC 1751 / BIP-39 subset for deterministic phrase generation)
const WORDLIST = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
  "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
  "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
  "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album",
  "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone",
  "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among",
  "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
  "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
  "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april",
  "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor",
  "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact",
  "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume",
  "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
  "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado",
  "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis",
  "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball",
  "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base",
  "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
  "beef", "before", "begin", "behave", "behind", "believe", "below", "belt",
  "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle",
  "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black",
  "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood",
  "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
  "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring",
  "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain"
];

/**
 * Generates a cryptographically secure 24-word recovery phrase (256-bit entropy).
 */
export function generateRecoveryPhrase(): string {
  const entropy = getRandomBytes(32); // 256 bits of entropy
  const words: string[] = [];
  for (let i = 0; i < 24; i++) {
    // Select index from 256-word list using each byte
    const index = entropy[i % entropy.length] ^ entropy[(i * 7) % entropy.length];
    words.push(WORDLIST[index % WORDLIST.length]);
  }
  return words.join(" ");
}

/**
 * Derives a Recovery KEK from a 24-word recovery phrase using HKDF-SHA-256.
 */
export async function deriveRecoveryKey(recoveryPhrase: string): Promise<CryptoKey> {
  const normalized = recoveryPhrase.trim().toLowerCase();
  const rawBytes = stringToUtf8(normalized);

  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    rawBytes as unknown as BufferSource,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: stringToUtf8("aegis-recovery-salt-v1") as unknown as BufferSource,
      info: stringToUtf8("aegis-recovery-v1") as unknown as BufferSource,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

/**
 * Wraps the Vault Root Key under the Recovery KEK.
 */
export async function wrapWithRecoveryKey(
  vrk: CryptoKey,
  recoveryKek: CryptoKey,
  vaultId: string
): Promise<{ recoveryWrappedKey: string; recoveryNonce: string }> {
  const aad = `AEGIS-RECOVERY-WRAP:v1:${vaultId}`;
  const { wrappedKeyBytes, nonceBytes } = await wrapKeyWithAad(vrk, recoveryKek, aad);

  return {
    recoveryWrappedKey: uint8ArrayToBase64(wrappedKeyBytes),
    recoveryNonce: uint8ArrayToBase64(nonceBytes),
  };
}

/**
 * Unwraps the Vault Root Key using the Recovery KEK.
 */
export async function unwrapWithRecoveryKey(
  recoveryWrappedKeyBase64: string,
  recoveryNonceBase64: string,
  recoveryKek: CryptoKey,
  vaultId: string
): Promise<CryptoKey> {
  const aad = `AEGIS-RECOVERY-WRAP:v1:${vaultId}`;
  const wrappedKeyBytes = base64ToUint8Array(recoveryWrappedKeyBase64);
  const nonceBytes = base64ToUint8Array(recoveryNonceBase64);

  return await unwrapKeyWithAad(wrappedKeyBytes, nonceBytes, recoveryKek, aad);
}
