# ADR 0002: Cryptographic Protocol, Key Derivation, and Nonce Discipline

## Status
Accepted

## Context
A zero-knowledge vault must prevent both passive eavesdropping and active ciphertext manipulation, substitution, and replay attacks across items, vaults, and revisions.

## Decision
1. **Passphrase KDF:** Argon2id with parameters $m=64\text{ MB}$, $t=3$, $p=4$, and 16-byte random salt per vault.
2. **Key Hierarchy:**
   - User passphrase derives Key Encryption Key (KEK).
   - KEK wraps the random 256-bit Vault Root Key (VRK) using AES-256-GCM.
   - Per-item keys are derived deterministically using HKDF-SHA-256 (`salt=itemId`, `info="aegis-item-v1"`).
3. **Encryption Algorithm:** AES-256-GCM with 96-bit (12-byte) random nonces generated via `crypto.getRandomValues`.
4. **Authenticated Associated Data (AAD):**
   - Strictly enforced on all item envelopes: `"AEGIS-ITEM:v1:" + vaultId + ":" + itemId + ":" + kind + ":" + revision`.
   - Any modification to item ID, vault ID, or revision invalidates the GCM authentication tag and aborts decryption.
5. **Recovery Material:** High-entropy 256-bit mnemonic key wraps the VRK independently, providing a self-sovereign recovery path without server backdoors.

## Consequences
- Prevents ciphertext transplant and downgrade attacks.
- Passphrase changes only require rewrapping the VRK without re-encrypting the vault database.

