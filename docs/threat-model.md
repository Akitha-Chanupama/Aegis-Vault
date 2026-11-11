# Aegis Vault - Threat Model & Security Analysis

## 1. Scope & Methodology

This threat model follows the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) and addresses the application-layer zero-knowledge architecture of Aegis Vault.

### Primary Assets Protected
1. **Plaintext Vault Entries:** Passwords, usernames, OTP seeds, secure notes, personal documents, and photos.
2. **Cryptographic Key Material:** Vault Root Key (VRK), Key Encryption Key (KEK), and derived item/file keys.
3. **User Identity & Sessions:** Account credentials, session cookies, and authorization tokens.

---

## 2. Analysis of the 12 Mandatory Threat Scenarios

### Scenario 1: Stolen Database or Object Storage Backup
- **Threat:** An adversary obtains a complete dump of the PostgreSQL database and S3 bucket contents.
- **Impact:** Attacker gains all records, wrapped keys, KDF salts, nonces, and ciphertext blobs.
- **Mitigation:**
  - All vault records, item contents, titles, URLs, notes, and file chunks are encrypted with AES-256-GCM.
  - The Vault Root Key is wrapped under an Argon2id-derived KEK.
  - S3 bucket storage keys are random UUIDs; no original filenames or MIME types are visible.
- **Residual Risk:** Leaked metadata (number of items, item sizes, revision counts, account creation date). Offline dictionary attacks if the user chose a low-entropy passphrase (mitigated by Argon2id memory-hardness).

---

### Scenario 2: Malicious or Compromised Cloud Operator / Rogue Admin
- **Threat:** Cloud infrastructure administrator attempts to read user secrets or tamper with records.
- **Impact:** Attacker controls the API server, database, and S3 bucket.
- **Mitigation:**
  - Zero-knowledge design: the server never possesses the passphrase, KEK, or VRK.
  - Tampering with ciphertext is immediately rejected by client-side AES-GCM authentication tags.
  - Reordering or replacing records across vaults is rejected by AAD binding (`vaultId` and `itemId` bound into AAD).
- **Residual Risk:** A malicious operator who controls the code hosting environment could alter the delivered JavaScript bundle. This is mitigated through strict CI/CD controls, immutable release tags, Subresource Integrity, and strict Content Security Policy (CSP).

---

### Scenario 3: User Account / Session Token Theft
- **Threat:** Adversary steals the user's HTTP session cookie via network interception or physical access to an unattended terminal.
- **Impact:** Attacker can authenticate as the user to the API.
- **Mitigation:**
  - Decoupled authentication and vault unlock: authenticating to the API only grants access to ciphertext.
  - Without the vault passphrase, the adversary cannot decrypt any vault contents.
  - Strict cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`, short expiration with rolling refresh.
  - Device/session management allows the owner to instantly revoke compromised sessions.
- **Residual Risk:** Attacker could delete items (tombstoning) or upload malicious ciphertext (which fails local decryption). Mitigated by re-authentication requirement for destructive actions.

---

### Scenario 4: Weak or Reused Passphrase & Offline Brute-Force
- **Threat:** Adversary with stolen wrapped root key attempts offline dictionary attack.
- **Impact:** Potential discovery of passphrase and unwrap of VRK.
- **Mitigation:**
  - Argon2id with recommended parameters: $m=64\text{ MB}$, $t=3$, $p=4$.
  - 16-byte cryptographically random salt per vault prevents rainbow tables.
  - UI enforces a strong passphrase policy (minimum 14 characters or high-entropy passphrase generator) with real-time zxcvbn strength estimation.
- **Residual Risk:** Extremely short or common passwords could still be cracked by high-resourced attackers. User education and recovery key requirements are critical.

---

### Scenario 5: Compromised Endpoint / Hostile Browser Extension / Keylogger
- **Threat:** Malware, rogue browser extensions, or OS keylogger on the user's machine.
- **Impact:** Adversary captures keystrokes (passphrase) or reads decrypted memory in the DOM.
- **Mitigation:**
  - Secrets are masked by default (`input type="password"`).
  - Clipboard copy operations use brief time-limited copy feedback and best-effort clipboard clearance.
  - Decrypted items in memory are purged immediately when the vault locks or the tab closes.
- **Residual Risk:** No web application can fully defend against a compromised operating system kernel or hostile extensions with `<all_urls>` script injection privileges. The UI alerts users to run the vault in clean browser profiles without untrusted extensions.

---

### Scenario 6: Supply-Chain Compromise / Malicious Frontend Bundle
- **Threat:** Dependency poisoning or malicious update in an npm package delivering malicious JS.
- **Impact:** Exfiltration of passphrase or plaintext keys during unlock.
- **Mitigation:**
  - Strictly pinned dependencies with exact version locks.
  - Minimal dependency footprint for cryptographic code (`packages/crypto` has zero runtime third-party dependencies except vetted Argon2id WASM).
  - Strict Content Security Policy (`connect-src 'self' https://<storage-domain>; script-src 'self' 'wasm-unsafe-eval'`).
  - Strict build verification and automated SAST auditing (`npm audit`).
- **Residual Risk:** Zero-day in build pipeline. Mitigated by automated dependency audits and reproducible builds.

---

### Scenario 7: Cross-Site Scripting (XSS) in Notes, Filenames, or Previews
- **Threat:** Malicious payload injected into a note title, content, or filename to execute arbitrary JS in the vault origin.
- **Impact:** If executed while vault is unlocked, script could exfiltrate in-memory keys.
- **Mitigation:**
  - React automatic JSX escaping for all user strings.
  - DOMPurify sanitization on any rich-text rendering.
  - Unsafe URL schemes (`javascript:`, `data:`, `vbscript:`) explicitly stripped from website login links.
  - Document/image previews rendered strictly via sandboxed `blob:` URLs or isolated iframe sandboxes (`sandbox="allow-scripts"` prohibited).
- **Residual Risk:** Parser differential bypasses. Mitigated by CSP `default-src 'self'`.

---

### Scenario 8: CSRF, Account Enumeration, Credential Stuffing, IDOR
- **Threat:** Web application vulnerabilities targeting API endpoints.
- **Impact:** Unauthorized item manipulation or resource probing.
- **Mitigation:**
  - **CSRF:** Strict `SameSite` cookies + custom header requirement (`X-Requested-With` or `Content-Type: application/json`) on all state-changing endpoints.
  - **Account Enumeration:** Generic error messages on signup and login ("Invalid credentials").
  - **Rate Limiting:** IP-based and user-based token bucket rate limits on `/api/v1/vault/*` and `/api/v1/sessions/*`.
  - **IDOR:** Every single query filters strictly by `owner_user_id == session.userId` and `vault_id == session.vaultId`.
- **Residual Risk:** Distributed botnet attacks against login endpoints. Mitigated by exponential backoff and IP rate limiting.

---

### Scenario 9: Nonce Reuse, Malformed Envelopes, Downgrade Attacks
- **Threat:** Flaws in AES-GCM nonce generation or replay of older encrypted envelopes.
- **Impact:** Loss of confidentiality or integrity.
- **Mitigation:**
  - Every encryption operation generates a fresh 96-bit CSPRNG nonce via `crypto.getRandomValues`.
  - Nonces are never hardcoded or sequentially incremented.
  - Envelope version (`cryptoVersion: 1`) and algorithm (`AES-256-GCM`) are strictly verified.
  - Canonical AAD binds `vaultId`, `itemId`, `kind`, and `revision`. Downgrading revision or altering ID causes GCM auth tag failure.
- **Residual Risk:** Insufficient client entropy if browser CSPRNG is broken. The application verifies entropy sanity at initialization.

---

### Scenario 10: Interrupted Uploads, Missing Chunks, Sync Race Conditions
- **Threat:** Network drop during chunked upload or simultaneous edits on desktop and phone.
- **Impact:** Corrupted file records or silent overwrites.
- **Mitigation:**
  - File commits verify chunk count and manifest consistency server-side before marking file `COMMITTED`.
  - Optimistic locking with monotonic `revision` number on items: writes supply expected revision.
  - HTTP `409 Conflict` returned if remote revision advanced.
  - Conflict resolution UI displays local vs remote differences and offers non-destructive duplication.
- **Residual Risk:** User fatigue when resolving manual conflicts.

---

### Scenario 11: Backup Corruption, Lost Keys, Forgotten Passphrase
- **Threat:** User loses their passphrase or downloads a damaged backup.
- **Impact:** Permanent, unrecoverable data loss.
- **Mitigation:**
  - Clear user education during onboarding: Aegis Vault has no backdoors.
  - Mandatory Recovery Key generation displayed once during setup with copy/download verification step.
  - Backup exports include cryptographic HMAC manifests and integrity verification check before restoration.
- **Residual Risk:** If both passphrase and recovery key are lost, data cannot be recovered by design.

---

### Scenario 12: Deleted Items in Replicas / Metadata Leakage
- **Threat:** Deleted credentials or notes persist in database replicas, storage snapshots, or network caches.
- **Impact:** Exposure of obsolete data or leakage of activity patterns.
- **Mitigation:**
  - Soft-deleted items (trash) retain ciphertext; hard delete scrubs database rows and issues S3 deletion calls.
  - `Cache-Control: no-store` prevents caching of ciphertext in HTTP or service-worker caches.
  - Metadata minimized: no plaintext search index on server; no original filenames stored unencrypted.
- **Residual Risk:** S3 versioning or cloud snapshot retention windows may retain encrypted ciphertext until lifecycle expiration.
