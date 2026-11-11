# Aegis Vault - System Architecture

## 1. Overview & Architectural Goals

Aegis Vault is an end-to-end client-side encrypted, zero-knowledge digital safe designed for secure management of website credentials, encrypted notes, private images, documents, and structured personal records.

### Core Architectural Axioms
1. **Zero-Knowledge at Rest & In-Flight:** The cloud server acts purely as an opaque persistence, synchronization, and quota coordination layer. Plaintext passwords, note contents, original file names, image pixels, and vault root keys never leave the client runtime.
2. **Strict Identity vs. Decryption Separation:** Account authentication (proving identity to access the cloud storage) and Vault Unlock (deriving local keys to decrypt vault contents) are strictly decoupled. Compromise of the login session alone cannot decrypt vault ciphertext.
3. **Defense-in-Depth:** Every API endpoint validates ownership, authorization, and rate limits. Database rows are partitioned by owner user ID and vault ID.
4. **Resilient Sync & Conflict Resolution:** Optimistic concurrency using monotonic revisions prevents silent data loss during multi-device synchronization.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                           CLIENT TIER (Trusted Boundary)                          |
|  Desktop Browser / Mobile Safari / Mobile Chrome / Installable PWA               |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | User Interface Layer (Next.js / React / Tailwind CSS / Radix UI Primitives) |  |
|  | - Dark / Light Adaptive Design System (WCAG 2.2 AA compliant)              |  |
|  | - Responsive Layouts: Desktop Collapsible Nav / Mobile Bottom Tab Bar       |  |
|  | - Ephemeral Decrypted State (TanStack Query / Zustand in-memory only)       |  |
|  | - Local Transient Search Index (In-memory, purged on lock)                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Cryptography & Key Management Core (packages/crypto)                        |  |
|  | - Argon2id KDF (passphrase -> KEK)                                          |  |
|  | - Web Crypto API (AES-256-GCM, CSPRNG 96-bit nonces)                        |  |
|  | - HKDF key derivation (Domain separation for items, files, thumbnails)      |  |
|  | - Auto-lock timer & in-memory key disposal                                  |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|  +-----------------------------------------------------------------------------+  |
|  | Sync & Blob Pipeline                                                        |  |
|  | - Revision check, cursor polling / incremental sync, tombstone reconcile   |  |
|  | - Client-side image thumbnailing & EXIF stripping                           |  |
|  | - Chunked authenticated file encryption (bounded RAM, stream processing)   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTPS / TLS 1.3
                                          | JSON REST API & Scoped S3 Signed URLs
                                          v
+-----------------------------------------------------------------------------------+
|                         APPLICATION API TIER (Untrusted)                         |
|  Next.js Route Handlers / Node.js Secure API Runtime                             |
|                                                                                   |
|  +-----------------------------------+   +-------------------------------------+  |
|  | Auth & Session Management         |   | Vault & Ciphertext Controller       |  |
|  | - HttpOnly, Secure, SameSite      |   | - Vault envelope initialization     |  |
|  | - Rate limiting (anti-bruteforce) |   | - Opaque item CRUD & validation     |  |
|  | - Device/session list & revoke    |   | - Monotonic revision checking       |  |
|  +-----------------------------------+   +-------------------------------------+  |
|  +-----------------------------------+   +-------------------------------------+  |
|  | Sync Cursor Coordinator           |   | Scoped Blob Storage Authorizer      |  |
|  | - Sequence generation             |   | - Signed S3 upload/download URLs    |  |
|  | - Delta retrieval (`/api/v1/sync`)|   | - Quota enforcement                 |  |
|  | - Tombstone lifecycle manager     |   | - Manifest verification on commit   |  |
|  +-----------------------------------+   +-------------------------------------+  |
+-----------------------------------------------------------------------------------+
                           |                                   |
         Prisma ORM Client |                                   | AWS SDK S3 Client
                           v                                   v
+--------------------------------------+   +----------------------------------------+
| DATABASE TIER (PostgreSQL)           |   | OBJECT STORAGE TIER (Private S3)       |
| - users & sessions                   |   | - Encrypted file chunks (opaque UUIDs) |
| - vaults (wrapped keys, KDF params)  |   | - Encrypted thumbnail blobs            |
| - vault_items (envelopes, revisions) |   | - Opaque chunk naming (no user names)  |
| - file_objects (encrypted manifests) |   | - Bucket policy: private, no public    |
| - sync_events (monotonic sequences)  |   |   access, pre-signed URL access only   |
+--------------------------------------+   +----------------------------------------+
```

---

## 3. Trust Boundaries & Security Classifications

| Component | Trust Status | Knowledge of Plaintext Secrets | Notes |
|---|---|---|---|
| Client Browser Memory (Unlocked) | **Trusted** | Plaintext, Master Key, Items | Active only while unlocked; cleared on lock/timeout |
| Client Storage (IndexedDB / LocalStorage) | **Untrusted** | Never stored in plaintext | No master key or unencrypted items in browser disk storage |
| Network Transport (TLS 1.3) | **Encrypted Channel** | Only sees ciphertext & metadata | Protects session cookies, API metadata, and ciphertext payloads |
| Cloud API Server | **Untrusted for Secrets** | Zero plaintext knowledge | Manages auth, sessions, rate limits, and stores opaque blobs |
| Database (PostgreSQL) | **Untrusted for Secrets** | Only ciphertext, salts, & nonces | DB dump reveals no credentials, notes, or file contents |
| Object Store (S3 Bucket) | **Untrusted for Secrets** | Only encrypted chunks & manifests | Random UUID keys; no original filenames or EXIF metadata |

---

## 4. Key Subsystems & Responsibilities

### 4.1 Client Architecture (`apps/web`)
- **Shell & Navigation:** Responsive adaptive shell with collapsible sidebar for desktop (>=1024px) and mobile bottom tab bar (<768px). Touch targets meet 44x44px min.
- **State Engine:**
  - *Auth Store:* Tracks server login session status (active session token cookie, user email, device ID).
  - *Vault State:* Holds derived in-memory cryptographic keys, lock status, auto-lock timeout reference. Never serializes keys to persistent storage.
  - *Vault Cache:* In-memory TanStack query cache of decrypted items, purged instantly when vault locks.
- **Crypto Package (`packages/crypto`):** Isolated, independently tested cryptographic primitives using Web Crypto API and Argon2id WASM.

### 4.2 Application API Layer (`apps/web/app/api/v1`)
- **Strict Authorization Middleware:** All endpoints authenticate the caller session and ensure every accessed `vault_id` or `item_id` belongs to the authenticated user.
- **Revision & Concurrency Engine:** Updates must supply `expectedRevision`. If `item.revision != expectedRevision`, the server returns HTTP `409 REVISION_CONFLICT`.
- **Envelope Validation:** Enforces payload size limits, schema compliance, and base64 encoding integrity without attempting server-side decryption.

### 4.3 Database Schema & Indexing
- Built on PostgreSQL with Prisma ORM.
- Compound unique indexes on `(vault_id, id)` ensure multi-tenant isolation.
- Sequential `seq` index on `sync_events` ensures millisecond-accurate delta synchronization across devices.

---

## 5. Metadata Minimization Strategy
While ciphertext is completely unreadable to the server, certain metadata is structurally required. Aegis Vault minimizes leaked metadata as follows:
- **Item Kind:** The item type in `vault_items` can be an opaque category or encrypted inside the payload. In v1, item type is preserved at envelope level for fast item filtering, while all titles, websites, usernames, tags, and notes are strictly inside the ciphertext payload.
- **File Names:** Original filenames, MIME types, and file extensions are encrypted inside the item envelope. S3 storage keys are purely random UUIDv4 strings.
- **Timestamps:** Item creation/modification timestamps are encrypted inside the payload; server maintains only coarse `server_updated_at` for sync coordination.

