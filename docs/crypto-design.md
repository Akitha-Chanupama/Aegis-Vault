# Aegis Vault - Cryptographic Protocol & Key Management Specification

## 1. Cryptographic Primitives & Standards

All cryptographic operations in Aegis Vault are executed strictly on the client side using the standard **W3C Web Crypto API** (`SubtleCrypto`) complemented by a vetted, audited WebAssembly implementation of **Argon2id**.

| Primitive / Algorithm | Standard / RFC | Parameter / Usage |
|---|---|---|
| **Passphrase KDF** | Argon2id (RFC 9106) | Memory: 64MB (`65536 KiB`), Iterations: 3 (`t=3`), Parallelism: 4 (`p=4`), Salt: 16 bytes CSPRNG |
| **Recovery KDF** | HKDF-SHA-256 (RFC 5869) | High-entropy 256-bit recovery phrase expansion to Recovery KEK |
| **Vault Key Generation** | CSPRNG | 256-bit cryptographically secure random key via `crypto.getRandomValues(new Uint8Array(32))` |
| **Symmetric Encryption** | AES-256-GCM (NIST SP 800-38D) | 256-bit key, 96-bit (12-byte) random nonce, 128-bit authentication tag |
| **Key Derivation / Separation** | HKDF-SHA-256 (RFC 5869) | Domain separation for items, files, thumbnails, and key wrapping |
| **Random Number Generation**| Web Crypto CSPRNG | `crypto.getRandomValues` |

---

## 2. Key Hierarchy & Lifecycle

```
[ User Vault Passphrase ]
          |
          v  Argon2id (m=64MB, t=3, p=4, salt=16B)
[ Key Encryption Key (KEK) ] (256-bit)
          |
          | AES-256-GCM Wrap (96-bit Nonce, AAD = AccountId + VaultId + "v1-wrap")
          v
[ Wrapped Vault Root Key ] (Stored in Cloud DB)

-------------------------------------------------------------------------
Unwrapped inside Browser Memory on Unlock:
[ Vault Root Key (VRK) ] (256-bit ephemeral)
          |
          +---> HKDF-SHA-256 (salt=itemId, info="aegis-item-v1")
          |        |
          |        v
          |     [ Item Encryption Key ] ---> AES-256-GCM (Item Payload)
          |
          +---> HKDF-SHA-256 (salt=fileId, info="aegis-file-v1")
          |        |
          |        v
          |     [ File Master Key ] ---> Per-Chunk AES-256-GCM + Manifest
          |
          +---> HKDF-SHA-256 (salt=fileId, info="aegis-thumb-v1")
                   |
                   v
                [ Thumbnail Key ] ---> AES-256-GCM (Encrypted Image Preview)
```

### 2.1 Passphrase Key Derivation (Argon2id)
When the user enters their vault passphrase:
1. Client retrieves `kdf_salt` (16 bytes base64) and `kdf_params` from `/api/v1/vault/key-envelope`.
2. Client executes Argon2id:
   - Output length: 32 bytes (256 bits).
   - Salt: 16 bytes cryptographically random per vault.
   - Parameters: `t=3`, `m=65536` (64 MB), `p=4`.
3. The derived 32-byte buffer is imported into Web Crypto as an `AES-GCM` CryptoKey with `wrapKey` / `unwrapKey` usages.

### 2.2 Vault Root Key Generation & Wrapping
During initial vault enrollment:
1. Client generates 32 random bytes using `crypto.getRandomValues(new Uint8Array(32))` as the `Vault Root Key (VRK)`.
2. Client generates a fresh 12-byte nonce.
3. KEK wraps the VRK using AES-GCM-256.
4. **Authenticated Associated Data (AAD)** binds:
   `"aegis-vault-wrap:v1:" + userId + ":" + vaultId`
5. The result (`wrappedRootKey`, `wrapNonce`, `kdfSalt`, `kdfParams`) is sent to the server.

### 2.3 Recovery Key Flow
1. At enrollment, client also generates 32 bytes of high-entropy recovery material, formatted as a 24-word BIP-39 mnemonic or 256-bit Base58 token.
2. An HKDF derives a `Recovery KEK` with `info="aegis-recovery-v1"`.
3. The VRK is wrapped under the `Recovery KEK` and saved in `recovery_wrapped_key`.
4. If passphrase is lost, entering the recovery phrase derives the same `Recovery KEK`, unwraps VRK, and allows rewrapping under a new passphrase.

---

## 3. Item Encryption Envelope Specification

Every vault item (credential, note, personal record, or file metadata) is encrypted into an immutable envelope before transmission.

### 3.1 Envelope Schema
```typescript
export interface ItemEncryptionEnvelope {
  cryptoVersion: 1;
  vaultId: string;       // UUIDv4
  itemId: string;        // UUIDv4
  kind: "login" | "note" | "card" | "document" | "identity";
  revision: number;      // Monotonic counter starting at 1
  alg: "AES-256-GCM";
  nonce: string;         // Base64-encoded 12-byte random nonce
  ciphertext: string;    // Base64-encoded ciphertext + 16-byte GCM auth tag
}
```

### 3.2 Canonical AAD Construction
To prevent ciphertext transplant attacks (e.g. attacker moving an encrypted password blob from Item A to Item B, or across vaults or revisions), AES-GCM strictly enforces the following canonical AAD binary string:

```
AAD = UTF8("AEGIS-ITEM:v1:" + vaultId + ":" + itemId + ":" + kind + ":" + revision)
```

If any field (including the expected revision or item ID) is manipulated, AES-GCM decryption fails with an authentication error.

### 3.3 Nonce Discipline
- **Rule:** A nonce is NEVER reused under the same key.
- For each update to an item, a brand new 12-byte nonce is produced via `crypto.getRandomValues(new Uint8Array(12))`.
- Since keys are per-item derived (`HKDF(VRK, salt=itemId)`), collision probability across the system with 96-bit random nonces is negligible ($< 2^{-32}$ after $2^{32}$ revisions).

---

## 4. Large File & Media Chunking Protocol

Storing large encrypted media files (documents, high-resolution photos) requires bounded memory consumption on mobile devices and resilience against chunk reordering or truncation.

### 4.1 Chunking Architecture
1. **Chunk Size:** 4 MB per chunk.
2. **File Key:** Derived per file: `FileKey = HKDF(VRK, salt=fileId, info="aegis-file-v1")`.
3. **Chunk Encryption:**
   - Each chunk $i \in [0, N-1]$ is encrypted with AES-256-GCM.
   - Nonce: 12 bytes (`CSPRNG`).
   - Chunk AAD: `UTF8("AEGIS-CHUNK:v1:" + fileId + ":" + chunkIndex + ":" + totalChunks)`
4. **Encrypted Manifest:**
   - Contains: original file name, MIME type, total unencrypted byte length, total chunk count, array of `{ chunkIndex, nonce, sha256Checksum, byteLength }`.
   - Manifest itself is encrypted under `FileKey` with AAD: `UTF8("AEGIS-MANIFEST:v1:" + fileId)`.
5. **Decryption Verification:**
   - Client fetches manifest, decrypts it, and validates the expected chunk count.
   - Chunks are downloaded, decrypted, authenticated against AAD, and verified against sha256 checksums in sequence.

---

## 5. Passphrase Rotation & Rekeying

1. User enters current passphrase -> derives current KEK -> unwraps VRK.
2. User enters new passphrase -> derives new KEK with a newly generated 16-byte `kdf_salt`.
3. New KEK wraps the existing VRK with a fresh 12-byte nonce and fresh AAD.
4. Client uploads the new wrapped key envelope to `/api/v1/vault/key-envelope/rotate`.
5. Since the underlying `VRK` remains unchanged, **no re-encryption of existing vault items is required** during a passphrase change.
6. If the VRK itself must be rotated (e.g. following a suspected compromise), a full re-keying migration decrypts all items and re-encrypts under a newly generated VRK.

---

## 6. In-Memory Key Disposal & Locking Protocol

1. The `VRK` and derived item keys exist exclusively in private TypeScript module closures or memory references.
2. **Auto-lock Triggers:**
   - Inactivity timer (configurable: 1 min, 5 min, 15 min, 30 min).
   - Explicit user click on "Lock Vault".
   - Browser tab closure or reload.
   - `visibilitychange` event on mobile when backgrounded (with configurable tolerance).
3. **Purge Routine:**
   - Vault state is set to `LOCKED`.
   - All references to `VRK` and `KEK` are nulled out.
   - Ephemeral decrypted item caches in TanStack Query are immediately evicted via `queryClient.clear()`.
   - Revoke all active ephemeral image preview `blob:` URLs via `URL.revokeObjectURL()`.

