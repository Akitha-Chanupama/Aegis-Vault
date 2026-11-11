# ADR 0003: Client Storage, Ephemeral Decryption, and Zero-Knowledge Boundaries

## Status
Accepted

## Context
Persistent browser storage (`localStorage`, `sessionStorage`, `IndexedDB`) is vulnerable to extraction if a device is stolen, seized, or compromised via local malware or malicious scripts.

## Decision
1. **Default Storage Policy:** Aegis Vault operates on an **online-first, memory-only** decryption policy by default.
2. **Key Material in Memory:** The Vault Root Key (VRK) and derived item keys are held strictly in private module memory variables during an active session and are never written to `localStorage` or unencrypted `IndexedDB`.
3. **Decrypted Caches:** Decrypted item payloads in TanStack Query exist only in memory and are purged completely on manual lock or auto-lock timeout.
4. **Offline Mode:** If an offline cache is enabled in future releases, it will store only encrypted envelopes and never unencrypted items.
5. **DOM Media Previews:** Decrypted images and documents use short-lived `blob:` URLs that are explicitly revoked with `URL.revokeObjectURL()` upon navigation or vault lock.

## Consequences
- Maximizes security against data extraction at rest on the client.
- Closing or reloading the tab locks the vault and requires passphrase re-entry.
