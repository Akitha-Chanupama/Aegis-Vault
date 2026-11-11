# Aegis Vault - Emergency Recovery Runbook

## 1. Principles of Recovery in a Zero-Knowledge Vault

Aegis Vault enforces strict end-to-end zero-knowledge encryption. By mathematical design:
- The cloud provider does not hold the vault passphrase, root keys, or plaintext data.
- Cloud support personnel **cannot** reset your master passphrase or decrypt your vault contents under any circumstances.
- Recovery relies strictly on self-sovereign user-held cryptographic materials.

---

## 2. Emergency Recovery Scenarios

### Scenario A: Lost Master Passphrase (With 24-Word Recovery Phrase)
1. Navigate to the vault login page.
2. At the "Vault Locked" screen, click **"Forgot passphrase? Use Recovery Phrase"**.
3. Input your 24-word emergency recovery phrase generated during onboarding.
4. The client executes HKDF-SHA-256 to derive the `Recovery KEK` and unwraps the `Vault Root Key (VRK)` locally.
5. Once unlocked, immediately open **Settings & Security**.
6. Enter a new strong master passphrase. The client will derive a new KEK using Argon2id and re-wrap the root key.

### Scenario B: Lost Device or Hardware Failure
1. Obtain your new desktop or mobile device.
2. Open the Aegis Vault web application over HTTPS.
3. Authenticate to your account using your email and login password.
4. The cloud server serves your versioned `VaultKeyEnvelope` (wrapped key, salt, and KDF parameters) and encrypted item envelopes.
5. Enter your Master Vault Passphrase. The client unwraps the root key and decrypts all records locally.

### Scenario C: Cloud Service Outage or Provider Migration
1. Ensure regular backups were downloaded via **Settings > Export Encrypted Vault**.
2. Deploy a new instance of Aegis Vault using the Docker Compose configuration in `docs/deployment.md`.
3. In the new instance, open **Settings > Restore From Backup** and select your encrypted JSON backup file.
4. Unlock the vault using your master passphrase or recovery phrase.

---

## 3. The Unrecoverable Scenario

> [!CAUTION]
> If **both** the Master Vault Passphrase and the 24-Word Recovery Phrase are lost, **all encrypted records are permanently unrecoverable**. There are no backdoors, recovery master keys, or support overrides.

