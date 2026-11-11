# ADR 0004: Decoupling Account Authentication and Vault Unlock

## Status
Accepted

## Context
Many web applications conflate login credentials with encryption keys, meaning server authentication compromise automatically results in total data compromise.

## Decision
1. **Two-Factor Independent Boundaries:**
   - **Boundary 1 (Identity/Session):** Authenticates the client to the cloud API using email and login password or passkey. Grants access to encrypted API endpoints.
   - **Boundary 2 (Cryptographic Unlock):** Executes entirely on the client using the separate Vault Passphrase to derive the KEK and unwrap the VRK.
2. **Server Obliviousness:**
   - The server never receives, hashes, or checks the Vault Passphrase.
   - Even a compromised cloud administrator cannot decrypt stored items or generate valid decryption keys.
3. **Session Revocation:**
   - Revoking a device session terminates its access to fetch future sync deltas.
   - Revocation does not retroactively delete already-downloaded ciphertext.

## Consequences
- Requires users to manage both a login credential and a vault passphrase (or secure recovery key).
- Ensures absolute zero-knowledge guarantees even against subpoena or database exfiltration.
