# AEGIS VAULT

> **Project specification and implementation contract**  
> A private, responsive, zero-knowledge cloud vault for passwords, encrypted notes, images, documents, and personal records.

**Status:** Build specification (not an assertion that the software is secure or complete)  
**Primary client:** Responsive web application / installable Progressive Web App (PWA)  
**Target devices:** Desktop browsers, Android phones, iPhones, tablets  
**Initial audience:** Single owner / private account (architecture can support future users)  
**Product language:** English (prepare for future localization)  
**Working name:** Aegis Vault (easy to rename)  
**Primary goal:** A beautiful, trustworthy vault usable daily from a laptop and mobile phone.

---

## 0. Instructions to the AI Development Agent

You are the lead full-stack engineer, security engineer, and product designer for **Aegis Vault**. Implement this as a real application, not merely a mockup. Treat the security requirements as **release blockers**. Never invent your own cryptographic algorithm or claim security is proven by passing unit tests.

**Execution rules:**

1. Read this entire file before writing code. Create `docs/architecture.md`, `docs/threat-model.md`, `docs/crypto-design.md`, `docs/decisions/`, and `docs/deployment.md` as you work.
2. Before implementing encryption or authentication, document the exact protocols, key lifecycle, and threat model. Use audited, actively maintained libraries, well-defined protocols, and vetted examples; request human security review for the architecture before real secrets are imported.
3. Prefer small, independently verifiable milestones. Implement a runnable vertical slice first; add features incrementally. After each milestone, run lint, typecheck, tests, and builds and report results.
4. Use **synthetic/test secrets only** during development and QA. Never place actual user secrets, master passwords, raw encryption keys, or decrypted content in source control, logs, screenshots, seed data, telemetry, or AI prompts.
5. Never substitute server-side encryption for client-side encryption while claiming a zero-knowledge design. If a design cannot satisfy this specification, surface the tradeoff and stop that feature until resolved.
6. The UI must be original, polished, desktop-quality, and genuinely usable on narrow mobile screens, including Safari on iOS. Do not create a generic admin template.
7. Prioritize: **security and correctness → data durability → mobile usability → visual polish → nonessential enhancements**.
8. Make reasonable non-security implementation decisions without repeatedly asking for direction, but record them in Architecture Decision Records (ADRs). Security-sensitive changes require explicit design review.
9. Deliver full source, migrations, `.env.example`, seed fixtures with fake data, setup commands, CI pipeline, tests, operational documentation, and a clear release readiness checklist.
10. Do not mark the application production-ready until the security gate in §19 is met.

**Definition of done:** A private account owner can enroll, unlock on desktop/mobile, create/read/update/delete password entries and notes, upload/download encrypted media, sync among devices, recover from a backup, and manage sessions without server access to plaintext vault contents; all critical security tests pass and the experience is accessible and responsive.

---

## 1. Product Vision

Build a **private cloud-based digital safe** that combines:

- A password manager for website and application credentials.
- An encrypted notes workspace.
- A private photo and image gallery.
- An encrypted file/document locker.
- A structured personal-record library (licenses, memberships, recovery codes, etc.).

The user's data is **encrypted in the browser before upload**. The cloud coordinates authentication, opaque encrypted storage, device sync, quotas, versioning, and backups; it should not receive plaintext notes, plaintext passwords, image pixels, original filenames, or vault decryption keys.

### Product principles

- **Private by design:** zero-knowledge at the application layer; explicit and documented metadata leakage.
- **Cloud convenience:** access from a phone or computer on the same account over HTTPS.
- **Fast and calm:** minimal clutter, quick search and capture, sensible defaults.
- **Beautiful but functional:** refined typography, purposeful motion, polished dark/light themes.
- **No lock-in:** portable encrypted exports, documented format, backup verification.
- **Safe failures:** do not silently overwrite conflicting changes, lose offline edits, or reveal secrets.

### Out of scope for v1

- Sharing vault entries with other people; public links; social features.
- Team accounts, role-based organizational administration, enterprise SSO.
- Autofill browser extension, native iOS/Android apps, third-party AI processing of vault content.
- Server-side full-text indexing of decrypted content or server-side media thumbnail generation.
- Unrestricted HTML/Markdown execution, public media URLs, or external analytics trackers.
- Automatic account recovery by a support administrator (would violate the default zero-knowledge model).

---

## 2. Users, Platforms, and Core Journeys

### Personas

- **Owner:** One person managing valuable private information on desktop and smartphone.
- **Additional device:** The same owner unlocking the vault on another trusted browser/device.

### Critical user journeys

1. **First visit:** Create a private account → verify email / establish secure authentication → set and confirm a strong vault passphrase → download an encrypted backup/recovery material → enter the empty vault.
2. **Save a credential:** Open quick-add → choose Login → enter site, username, password and optional 2FA recovery codes → save encrypted → find from search.
3. **Use a credential on phone:** Open PWA or mobile browser → authenticate if needed → unlock vault locally → find entry → reveal or copy selected field → clear feedback, auto-hide.
4. **Save private note:** Create note → rich but sanitized editor → autosave locally + sync encrypted revision → view edits from another device.
5. **Store private media:** Select photos/documents → validate locally → encrypt bytes, metadata and optional thumbnails locally → upload ciphertext → view/decrypt on authorized device.
6. **Handle loss of connection:** Existing unlocked session can use a previously synced cache if enabled → edits queue locally → reconcile on reconnect.
7. **Handle an unknown device:** Authenticate session, then **independently unlock vault** using passphrase or a previously provisioned device key; the server must not be able to decrypt it.
8. **Manage access:** List active sessions/devices, revoke a session, configure lock timer; understand that revoking login does not retroactively erase a previously downloaded encrypted copy.
9. **Backup and restore:** Export versioned, authenticated encrypted archive → verify contents/integrity → restore safely in a clean test account/environment.

---

## 3. Scope and Priorities

| Area | MVP (required) | V1.1 / Later |
|---|---|---|
| Account | Private signup or invite-only, verified email, login/logout, sessions | Passkey login, extra device enrollment options |
| Vault unlock | Separate vault passphrase, local key derivation, lock/unlock | Biometric-assisted local unlock on supported devices |
| Passwords | CRUD, search, password generator, copy/reveal, tags, favorites | TOTP generation after review, browser extension |
| Notes | CRUD, simple safe rich text, autosave, tags | Markdown enhancements, backlinks |
| Images | Encrypted upload, gallery, viewer, download, delete | Albums, batch actions, advanced media previews |
| Documents | Encrypted upload/download, file list, metadata | Local PDF preview, advanced filters |
| Records | Custom fields, simple templates | More record templates |
| Sync | Cross-device encrypted sync and version conflicts | Selective offline caching |
| Security | Rate limits, hardened session management, lock, export/restore | Security dashboard and advanced audit tools |
| PWA | Responsive, installable, basic offline shell | Fully supported encrypted offline workflows |
| Design | Excellent desktop/mobile, dark/light, accessibility | Additional customization |

**MVP is not safe for real secrets until the full release gates pass.** Scope may be delivered in stages, but don't imply partial implementations provide full vault security.

---

## 4. User Experience & Visual Design System

### Design direction

**Visual personality:** premium, sophisticated, quietly futuristic, confident, minimal, highly polished. Take inspiration from contemporary high-quality productivity tools, but create an original identity.

- **Dark theme (primary):** midnight navy / deep graphite canvas, layered slate surfaces, violet/indigo accents, subtle emerald for verified/success states.
- **Light theme:** warm near-white canvas, soft cool-gray cards, dark ink text, restrained indigo accents.
- **Avoid:** neon overload, excessive gradients/glass blur, stock security shields everywhere, tiny text, busy dashboards, generic Bootstrap admin styling.
- **Surfaces:** distinct depth through borders, shadows, and consistent spacing; subtle gradients only in hero/empty states.
- **Typography:** clear modern sans-serif (for example Inter or Geist), with a consistent scale; monospaced treatment for generated passwords and verification codes.
- **Spacing:** 4/8px rhythm; generously spaced desktop layouts and compact-but-readable mobile controls.
- **Corners:** balanced 12–18px radius for cards; consistent 8–12px inputs/buttons.
- **Icons:** coherent stroke-based set such as Lucide; labels remain visible for important actions.
- **Animation:** restrained 120–240ms transitions; respect `prefers-reduced-motion`; never animate secret text reveal in a way that exposes it accidentally.
- **Themes:** dark, light, and system, persisting a non-sensitive preference.

### Suggested tokens (finalize for WCAG compliance)

```css
:root {
  --bg: #0B1020;
  --surface: #121A2A;
  --surface-raised: #192338;
  --border: #2B3650;
  --text: #F5F7FC;
  --text-muted: #AAB7CD;
  --accent: #8B7CF6;
  --accent-hover: #A79AFB;
  --success: #38C998;
  --warning: #F4B86A;
  --danger: #F47B85;
  --radius-card: 16px;
}
```

**Do not use these colors blindly:** test foreground/background combinations against WCAG 2.2 AA, including muted labels, pills, form borders, and focus indicators.

### Layout: desktop ≥ 1024px

```text
┌────────────────┬──────────────────────────────────────────────────┐
│ Brand / Aegis  │ Search vault...        Quick add     Profile     │
│                ├──────────────────────────────────────────────────┤
│ Overview       │ Greeting / overview / security status           │
│ All Items      │ [Passwords] [Notes] [Images] [Documents]        │
│ Passwords      │                                                  │
│ Secure Notes   │ Favorites / Recently Updated                     │
│ Private Photos │                                                  │
│ Documents      │ Item cards / filtered list / details side panel  │
│ Records        │                                                  │
│ Favorites      │                                                  │
│ Trash          │                                                  │
│                │                                                  │
│ Settings       │                                                  │
└────────────────┴──────────────────────────────────────────────────┘
```

- Left navigation: collapsible, persistent on desktop.
- Header: scoped/global search (only after unlock), quick-add, sync indicator, user menu.
- Main content: fluid responsive grid; detail view as a right drawer when space allows.
- Provide useful empty states and skeletons (never show fake sensitive content).

### Layout: mobile 320–767px

- One-column flow; **bottom tab bar**: Home, Vault, Add, Gallery, Settings (max five destinations).
- Search at top of Vault; filters as horizontal chips or bottom-sheet controls.
- Use full-screen detail pages or bottom sheets rather than cramped desktop drawers.
- Floating quick actions only if they do not overlap important content.
- At least 44×44 CSS pixel interactive targets where feasible; generous touch spacing.
- Avoid horizontal page scrolling and text truncation that hides entry names irreversibly.
- Respect notch/safe-area insets: `env(safe-area-inset-*)`.
- Password field action buttons (reveal/copy) large and easy to reach with one hand.
- Image gallery uses 2–3 columns based on width and preserves correct aspect ratios.
- Upload uses native file picker; camera capture can be offered as a convenience where supported.
- Lock screen, onboarding, login, restore, and error states must be mobile-first too.

### Responsive breakpoints

- Small mobile: 320–389px; large mobile: 390–767px.
- Tablet: 768–1023px; desktop: 1024–1439px; wide: ≥1440px.
- Prefer container queries and content-based responsiveness over rigid device assumptions.

### UX details that matter

- Global command palette on desktop (`Ctrl/Cmd + K`), with accessible search on mobile.
- Quick add keyboard shortcut on desktop, visible mobile Add tab.
- Secret fields masked by default; copy feedback uses a toast and optional clipboard expiry **on a best-effort basis** (never promise reliable clipboard clearing).
- Password generator: cryptographically secure RNG, configurable length and character sets; unbiased character selection.
- Auto-lock after inactivity and when user manually locks; on browser backgrounding, lock based on configured policy with explicit warnings about mobile browser limitations.
- Clearly distinguish **logged in** from **vault unlocked**.
- Distinct screens for locked, offline, syncing, conflict, upload failed, and key/backup errors.
- Honor keyboard navigation, semantic HTML, focus management, accessible dialog labels, screen-reader announcements, and reduced-motion settings.

### Screens the agent must design and build

1. Marketing-free welcome / auth screen.
2. First-run setup and vault passphrase enrollment.
3. Recovery/backup onboarding acknowledgment.
4. Locked vault screen.
5. Home dashboard.
6. Unified vault list with filters and search.
7. Password list and create/edit/detail screens.
8. Secure notes list, editor, detail screens.
9. Private gallery and encrypted image viewer.
10. Documents list, upload drop zone, file details.
11. Personal records and custom fields.
12. Favorites, tags/folders, archive/trash.
13. Device/session/security settings.
14. Profile and theme/settings.
15. Import/export/backup and restore screens.
16. Empty, loading, offline, conflicts, and error states.

### Quality bar for the interface

Produce a consistent, reusable component library: `AppShell`, `Sidebar`, `MobileTabBar`, `TopBar`, `VaultCard`, `VaultList`, `SecretField`, `RevealButton`, `SearchCommand`, `TagChip`, `CategoryFilter`, `UploadDropzone`, `GalleryGrid`, `VaultLockScreen`, `ConfirmDialog`, `Toast`, `EmptyState`, `SyncStatus`, and `Skeleton`. Test all layouts at widths **320, 375, 390, 768, 1024, and 1440px** plus mobile landscape.

---

## 5. Technology Stack

Use a stable, maintained dependency set; **pin exact working versions in lockfiles** at implementation time, check release notes/security advisories, and record versions in an ADR.

| Layer | Recommendation | Notes |
|---|---|---|
| App framework | Next.js App Router + React + TypeScript | Responsive PWA, SSR only for non-sensitive shell |
| Styling | Tailwind CSS + shadcn/ui primitives | Accessible custom design system; not a default template |
| Forms | React Hook Form + Zod | Client and server boundary validation |
| Client state | TanStack Query + lightweight state store | Never persist decrypted secrets by default |
| Server/API | Next.js route handlers or isolated Node API | All authenticated endpoints enforce ownership |
| Database | PostgreSQL + Prisma | Opaque encrypted records and metadata |
| Blob storage | Private S3-compatible bucket | Ciphertext only; short-lived scoped signed URLs |
| Authentication | Audited library/service configured for secure sessions | Separate from local vault cryptography |
| Encryption | Browser Web Crypto API + vetted Argon2id implementation | Use reviewed primitives and explicit versioning |
| Background work | Small queue/worker as needed | Metadata-only tasks; no plaintext processing |
| Testing | Vitest, Testing Library, Playwright, axe-core | Crypto vectors, integration, mobile, accessibility |
| Infra | Docker, managed Postgres, S3-compatible storage, HTTPS | Secrets manager, backups, hardened hosting |
| Monitoring | Privacy-safe metrics and redacted errors | No plaintext or secrets in monitoring |

**Security design note:** Browser Web Crypto is a low-level primitive interface, not a completed security protocol. Carefully specify all message formats, key separation, encryption context, key wrapping, and recovery; obtain expert review. Do not use arbitrary third-party encryption examples as production architecture.

---

## 6. System Architecture

```text
Desktop Browser / Android Browser / iOS Safari / Installed PWA
  ├─ UI & state
  ├─ Local vault unlock and key operations
  ├─ Client-side encryption/decryption
  ├─ Local transient search index (while unlocked)
  ├─ Optional encrypted IndexedDB cache
  └─ Sync engine
            │ HTTPS authenticated API + encrypted blobs
            ▼
Application API
  ├─ Identity/session authorization
  ├─ Rate limits / anti-abuse
  ├─ Account-owned ciphertext CRUD
  ├─ Encrypted blob upload authorization
  ├─ Change cursors / conflicts / tombstones
  └─ Backup/export orchestration (ciphertext only)
            │                         │
            ▼                         ▼
   PostgreSQL                     Private Object Storage
  accounts, sessions,             encrypted file chunks,
  item envelopes, revisions       encrypted thumbnails
  and opaque metadata
```

### Trust boundaries

- **Trusted only while unlocked:** the user's current browser/device runtime. A compromised endpoint or malicious browser extension can see decrypted data; a web app cannot fully prevent that.
- **Untrusted for plaintext:** cloud API, database administrators, file-store operators, backups, and logs.
- **Transport:** HTTPS/TLS required; certificate validation handled by platform.
- **Authentication:** proves which account is accessing ciphertext; **vault unlock** locally provides decryption capability. Authentication alone must never disclose vault contents.
- **Metadata:** server will necessarily see some metadata (account identifier/email, record IDs, storage size, upload timestamps, network/device/session information). Minimize and document all visible metadata.

### Zero-knowledge limitations

- This is an application-layer claim, not a guarantee against compromised browsers, malicious delivered JavaScript, phishing, weak passphrases, compromised devices, or clipboard contents.
- Secure deployment needs a strong Content Security Policy, no arbitrary third-party scripts, audited dependencies, subresource controls, and controlled release/asset delivery; web clients remain particularly vulnerable to compromised frontend supply chains.
- Server cannot scan or thumbnail client-encrypted content without plaintext access. Use client-side processing and safe preview formats.

---

## 7. Authentication, Vault Unlock & Key Management

**Critical:** Do not confuse the login password, vault passphrase, and derived encryption key.

### Preferred initial model

1. **Account authentication:** Use a reputable, audited session system with email verification, secure login, recovery of login access, anti-enumeration, session revocation, and CSRF protection as applicable. Favor a passwordless/passkey-based account login where supported, with a well-tested fallback. No secret vault contents are used in authentication.
2. **Independent vault passphrase:** Used **locally** to derive a key-encryption key (KEK). Its plaintext never goes to the server, nor to analytics, logs, error reports, or third-party SDKs.
3. **Random vault data key:** Generate a 256-bit vault key with a CSPRNG on the client at enrollment. Encrypt actual vault entries using per-item keys derived/managed under a reviewed hierarchy, rather than reusing raw key material ad hoc.
4. **Wrap vault key:** Encrypt/wrap the vault key under the passphrase-derived KEK using authenticated encryption. Upload only the versioned wrapped key, KDF parameters, random salts, and necessary nonsecret metadata.
5. **Unlock from a new device:** After account authentication, download wrapped key → derive KEK locally from entered vault passphrase → unwrap vault key → decrypt synced items locally.
6. **Optional quick unlock:** Future version may protect a device-scoped credential with WebAuthn/OS secure-key facilities if the platform supports the required key handling. Do **not** assume passkey login alone decrypts the vault. No insecure persistent master key in localStorage.
7. **Logout vs lock:** Lock clears local unlocked state and ephemeral caches best-effort; logout also revokes the login session. Note JS cannot guarantee memory zeroization.

### KDF and crypto protocol requirements

- Prefer **Argon2id** as a memory-hard passphrase KDF, with independent random salt and recorded KDF parameters per account. Benchmark on low-memory phones; select security-reviewed parameters at least meeting current OWASP password-storage guidance, without freezing arbitrary weak defaults.
- Argon2id may require a maintained WASM implementation; audit its distribution and CSP requirements. Do not silently fall back to insecure hashing.
- Prefer **AES-256-GCM**, unique 96-bit nonces per encryption **under a given key**, cryptographically random nonce generation as specified in the protocol, and authenticated associated data (AAD) binding account/vault ID, item ID, item type, and envelope version.
- Use strict domain separation for key derivation/usage (e.g., independent keys for entry encryption, file encryption, thumbnail encryption, and key wrapping). Define this rigorously in `docs/crypto-design.md`.
- Store `cryptoVersion`, algorithm identifiers, KDF parameters, salts, nonce(s), ciphertext, authentication tags, item ID, revision and needed AAD fields in a versioned envelope.
- Never reuse an AES-GCM nonce with the same key. Handle retries safely; generate new nonces when re-encrypting. Never reuse a pair simply because a database operation was retried.
- Do not implement custom stream encryption, custom crypto, or unreviewed chunk framing. For big files, choose a **reviewed chunked authenticated-encryption design** with per-file keys, chunk indexes/lengths/total count/manifest authentication, and explicit integrity checking against reordering/truncation/substitution. Bound memory use on mobile.
- Use authenticated encryption; reject modified, truncated, wrong-account or wrong-version envelopes. Fail closed with clear user-facing recovery messaging.
- Keys and secrets must not be printed, serialized to diagnostics, or passed to React server components or hydration payloads.

### Changing vault passphrase

- After old passphrase verification locally, derive a new KEK and **rewrap** the existing vault root key without requiring plaintext to travel to the server.
- Rotate key material and invalidate older wrapped-key references according to a documented threat model; do not promise that passphrase change retroactively protects already-stolen encrypted backups.
- Password reset **for login** must not reset the encrypted vault. Explain the difference prominently in UI.

### Forgotten vault passphrase

- Default: **no administrator backdoor or server-side decryption**.
- Provide a user-held recovery mechanism only if designed and reviewed (e.g., a high-entropy recovery key that wraps the vault key), generated locally and shown once, and backed by clear restore tests.
- If neither passphrase nor valid recovery key/device remains, ciphertext cannot be recovered. State that plainly; do not silently generate a replacement vault over existing encrypted records.

### Account session rules

- Cookies: `HttpOnly`, `Secure`, `SameSite` configured appropriately, short session lifetimes and refresh rotation according to vetted auth solution; do not place long-lived bearer tokens in localStorage.
- Verify authorization on every API read/write and signed URL request. Rate-limit authentication, enrollment, upload, export, and sensitive operations.
- Offer recent device/session list and revoke capability. Require recent authentication for dangerous account actions. Hide sensitive details from notification emails.

---

## 8. Data Types and Item Behavior

All **names, descriptions, user-entered fields, tags/folders if sensitive, filenames, image thumbnails, and passwords** belong within the encrypted payload unless an explicitly accepted tradeoff states otherwise. Keep only the minimum opaque type/IDs/revision fields server-visible.

### Item kinds

**Login**
- Display name, website URL, username/email, password, notes, optional custom fields, recovery codes, tags, favorite flag.
- Mask password and recovery codes; one-click copy; optional reveal; generated passwords from secure random source.
- Basic URL parsing/sanitization; never automatically navigate to untrusted javascript/data URLs.

**Secure note**
- Title, content, optional limited formatting, tags, favorites, created/updated times (encrypted where practical).
- Sanitize all rendered content; default to plain-text/limited rich-text; block inline JS and unsafe embeds.
- Debounced autosave, save state indicator, confirm before destructive operations.

**Image**
- Encrypted original bytes, encrypted locally-generated thumbnail, encrypted original filename/caption/album information.
- Client-side preview via ephemeral Blob URL and secure image decoding with appropriate CSP.
- Strip EXIF/geolocation on import if user selects; otherwise encrypt metadata and avoid server visibility.
- No server-side image transformations that require decryption.

**Document / file**
- Encrypted bytes, filename, MIME type, category, description, optional tags, size.
- Allowlist formats initially: PDF, TXT, PNG, JPEG, WEBP (extend only after review); enforce maximum sizes and quotas.
- File type sniffing locally for UX and on server for coarse policy only if possible without seeing plaintext; recognize that encrypted blobs cannot be reliably content-scanned server-side.
- Secure previews: avoid active PDF/HTML rendering in main app origin; prefer sandboxed or download-only approach after threat review.

**Personal record**
- Display title, type/template, encrypted custom key/value fields, notes, favorite/tags.
- Templates: license key, membership information, software credentials, important reference numbers, miscellaneous.

### Shared controls

- CRUD, favorites, tags, folder/category, sorting, filter, delete to trash, restore.
- Password and note search only after local decrypt while unlocked; no plaintext search terms sent to server.
- Search index in memory by default; if indexing offline, encrypt it and document its lifecycle.
- All destructive actions confirm intent; allow reasonable trash retention (e.g. 30 days) with a clear permanent delete option.
- Deleted bytes may remain in versioned backups or object-store retention until their retention window ends; explain limits of deletion.

---

## 9. Database Schema (Logical Model)

Use UUIDs (or equivalent opaque identifiers). All account-owned operations **must** be checked server-side. This is a logical schema; refine with migrations and security review.

```text
users
  id PK
  email UNIQUE (normalized), email_verified_at
  auth_provider_ref / hashed auth credentials managed by auth system
  created_at, updated_at

vaults
  id PK, owner_user_id FK UNIQUE
  crypto_version, wrapped_root_key, wrap_nonce, kdf_salt, kdf_params_json
  recovery_wrapped_key NULLABLE, recovery_metadata_json NULLABLE
  created_at, updated_at

vault_items
  id PK, vault_id FK, owner_user_id FK
  opaque_item_type, encrypted_payload, nonce, crypto_version
  revision INTEGER, is_deleted BOOLEAN, server_updated_at
  created_at
  UNIQUE(vault_id, id)

file_objects
  id PK, vault_id FK, item_id FK
  storage_key (server-generated, never original filename)
  encrypted_manifest, chunk_count, ciphertext_bytes
  status (initiated/uploaded/committed/deleting)
  created_at, updated_at

sync_events
  seq BIGSERIAL PK, vault_id FK, item_id, revision
  event_type, created_at

sessions / authenticators
  Managed by selected auth solution; owner scoped, revocable

backup_jobs / export_records (optional)
  id, vault_id, encrypted_artifact_reference, status, created_at
  Never contain plaintext data
```

**Indexes:** owner/vault scope, revision, change sequence, deletion status. Do not index plaintext secrets, original URLs, plaintext filenames, or search text. If using multiple tenants later, add database row-level security as defense-in-depth, not a substitute for API authorization.

### Example encryption envelope (illustrative shape, NOT a finalized crypto format)

```json
{
  "cryptoVersion": 1,
  "itemId": "opaque-uuid",
  "kind": "login",
  "revision": 5,
  "alg": "AES-256-GCM",
  "nonce": "base64-random-nonce",
  "ciphertext": "base64-authenticated-ciphertext"
}
```

The final spec must document exact byte encodings, nonce/key generation, AAD serialization, whether the tag is appended or separate, and authenticated item/revision handling. `kind` here is optionally server-visible; decide whether to hide item kind by using a universal opaque type at the cost of some queries.

---

## 10. API Contract (Initial)

All paths below are relative to `/api/v1`; return stable JSON errors with codes and safe messages. Never return plaintext vault fields. Use validated request bodies, anti-CSRF protections where relevant, authenticated ownership checks, quotas, and conservative request limits.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/account` | Authenticated account and nonsecret settings |
| POST | `/vault/initialize` | Initialize wrapped vault key and crypto parameters exactly once |
| GET | `/vault/key-envelope` | Download wrapped key / KDF info |
| POST | `/vault/key-envelope/rotate` | Replace wrapped key after fresh auth and concurrency check |
| GET | `/items?cursor=&limit=` | Page opaque encrypted entries |
| POST | `/items` | Create ciphertext item |
| GET | `/items/:id` | Read ciphertext item |
| PUT | `/items/:id` | Update ciphertext item with expected revision |
| DELETE | `/items/:id` | Soft-delete item / append tombstone |
| POST | `/items/:id/restore` | Restore eligible tombstoned item |
| GET | `/sync?since=&limit=` | Fetch ordered change events and encrypted revisions |
| POST | `/files/initiate` | Reserve encrypted blob upload, enforce quota |
| POST | `/files/:id/commit` | Finalize upload after consistency checks |
| GET | `/files/:id/download` | Authorize brief scoped download of ciphertext |
| DELETE | `/files/:id` | Delete or queue delete encrypted blob |
| GET | `/sessions` | List own device sessions |
| DELETE | `/sessions/:id` | Revoke own session |
| POST | `/export` | Prepare/download owner-authorized encrypted data export |
| POST | `/restore/validate` | Validate uploaded encrypted archive format before user-controlled restore |

Additional endpoints are allowed if justified and documented. Prefer REST semantics consistently; don't expose arbitrary internal database queries. All list responses must be paginated.

### Request/response behaviors

- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND` (avoid resource enumeration), `409 REVISION_CONFLICT`, `413 FILE_TOO_LARGE`, `422 INVALID_ENVELOPE`, `429 RATE_LIMITED`, `503 TEMPORARY_FAILURE`.
- Mutation requests require an idempotency mechanism where retries might duplicate operations.
- Set `Cache-Control: no-store` for sensitive API responses, redirects and HTML pages where appropriate.
- For uploads use short-lived per-object signed URLs **only for ciphertext**, strict key scope, content length constraints, and completion verification.
- Prevent IDOR by binding every requested vault/item/file/session to authenticated owner before returning information or upload authorization.
- Validate encrypted envelope structure and max sizes without attempting to decrypt it server-side.

---

## 11. Cross-Device Sync and Offline Strategy

**Initial online-first model:** Desktop and phone authenticate independently and unlock locally. Both receive encrypted revisions from the same cloud vault.

### Sync contract

1. After unlock, fetch encrypted items/changes and decrypt locally.
2. Keep a monotonic server change cursor scoped to a single vault; support pagination.
3. Every item has revision/ETag; writes supply expected revision (`If-Match` or explicit field).
4. On conflict, **do not overwrite silently**. Present compare/keep-local/keep-remote/duplicate flow after decrypting both variants on the client. For non-mergeable blobs, duplicate or choose explicitly.
5. Deletions create versioned tombstones so offline devices do not resurrect deleted data.
6. Handle retry, exponential backoff, interrupted uploads, stale sessions, reauthentication, and key rotation.
7. Avoid storing plaintext in service-worker caches or HTTP cache.

### Optional offline extension

- PWA app shell can load without connectivity; actual vault content offline only if the user has opted into a **device-local encrypted cache**.
- Cache contains ciphertext and no passphrase; unlock still requires vault secret/device-protected key.
- IndexedDB encrypted cache is not a guaranteed permanent backup; browser eviction/clear-storage can remove it.
- Test iOS Safari/PWA browser lifecycle, background suspension, and storage eviction behavior. Do not assume background sync reliably runs on all platforms.

### Device settings

- Default to no long-lived plaintext cache.
- Auto-lock configurable (suggest: 1, 5, 15 minutes; and immediately).
- Remembering the device for login must not silently remember vault unlock secret.

---

## 12. Encrypted Media Handling

1. Choose allowed file; validate declared MIME, basic magic bytes, size, and UX constraints locally.
2. Generate a unique file key under the reviewed key hierarchy, and encrypt content in bounded-size authenticated chunks for large files.
3. Encrypt original filename, caption, thumbnail and relevant metadata locally. Generate thumbnail in browser; avoid leaking through browser caches, screenshots, analytics and logs.
4. Upload only ciphertext and authenticated encrypted manifest to private object storage.
5. Commit server-side only after all expected chunks/objects exist and match known lengths/manifest claims (the client verifies cryptographic integrity upon decrypt).
6. Download into client, decrypt and verify entire manifest and required chunks before claiming integrity, and display via ephemeral, revoked object URLs.
7. Revoke object URLs and remove previews from rendered DOM on lock/logout. This is best-effort; browser/OS memory remains outside guaranteed control.
8. Ensure dangerous formats cannot execute as same-origin script; use restrictive CSP, safe media rendering, sandboxed isolated preview origin if required, and safe `Content-Disposition` for downloads.
9. Provide upload progress, cancel/retry, clear quota errors, deduplication only if privacy-reviewed (do **not** use unkeyed content hashes that leak file equality).
10. Enforce realistic per-file and per-account storage limits; initial configurable defaults: 25 MB per image, 100 MB per document, 1 GB private quota. These are product defaults, not security claims.

**Scanning caveat:** A zero-knowledge server cannot inspect encrypted file contents for malware. Limit file types and render safely; optionally support user-controlled local scanning, but don't claim the cloud has checked ciphertext for malware.

---

## 13. Security & Privacy Requirements

### Required controls

- Secure HTTPS, HSTS, secure cookies, CSRF protections as required by auth design.
- Strict CSP (no unnecessary `unsafe-inline`/`unsafe-eval`), `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, appropriate `Referrer-Policy` and permissions policy.
- No third-party trackers, ad SDKs, session replay, remote fonts requiring user activity tracking, or scripts receiving decrypted contents.
- Strong server-side access control on **every** object and upload/download URL; protection against IDOR, injection, XSS, SSRF, path traversal, request smuggling where relevant.
- Treat imported/exported data, filenames, note text, URLs, and media as untrusted at every render boundary.
- No logging of plaintext secrets, decrypted file contents, passphrases, recovery codes, key material, search terms, or full request payloads.
- Strict secret management, dependency scanning, secret scanning, code review, SAST, and regular security updates.
- Multi-device session management, reauthentication for account deletion/export/change of sensitive security settings.
- Rate limits and abuse monitoring without recording sensitive content.
- Secure key versioning, explicit migration strategy, envelope integrity checks, robust exception handling.
- Backup encryption at rest and access-controlled operations, periodic automated restore drills.
- Avoid plaintext credentials in email notifications, analytics, server error reports, support channels or screenshots.
- Separate development, staging and production; never use real user data in staging.
- `robots.txt` and `noindex` where appropriate for private app UI, but do not confuse these with security mechanisms.

### Threat model: minimum scenarios

Document mitigations and residual risk for:

1. Stolen database/storage backup.
2. Malicious or compromised cloud operator.
3. User account/session token theft.
4. Weak or reused vault passphrase and offline brute-force against stolen wrapped keys.
5. Compromised laptop/phone, hostile browser extension or keylogger.
6. Supply-chain compromise / malicious frontend deployment that steals secrets at unlock time.
7. XSS in notes, filenames, previews, third-party components, or imports.
8. CSRF, account enumeration, credential stuffing, session fixation, IDOR.
9. AES-GCM nonce reuse, malformed envelopes, downgrade/rollback, cross-vault substitution.
10. Interrupted uploads, missing chunks, sync race conditions and stale writes.
11. Backup corruption, lost keys, forgotten passphrase, lost phone.
12. Deleted items surviving in replicas/backups; metadata leakage.

**Security reality:** “Zero knowledge” protects data at rest in the cloud when implemented correctly; it does not make the client invulnerable. Never present the app as externally audited unless an actual qualified independent review is completed.

---

## 14. PWA & Mobile Engineering

- Responsive web-first; installable PWA via manifest and appropriate icons, service worker only when justified and secure.
- Use current Safari, Chrome, Firefox, and Edge. Test iOS Safari browser and standalone PWA separately.
- No reliance on WebAuthn PRF, native biometric APIs, storage persistence or background sync without tested support and fallback.
- Prevent sensitive data appearing in notification previews, browser history URLs, page titles, Open Graph tags, or URL query parameters.
- Provide `autocomplete` intelligently on **account auth**; do not accidentally expose vault secrets to ordinary autofill forms or browser password prompts.
- No decrypted data in server-rendered HTML, static generation artifacts, service-worker cache, `localStorage` or browser history state.
- Mobile safe areas, virtual keyboard layout, focus/scroll handling, touch targets, native file chooser and accessible bottom sheets are required.
- Target smooth interaction on modest mobile hardware; avoid huge decryption bursts or all-images-at-once decoding; use lazy loading and bounded concurrency.
- On background/lock, hide sensitive views when possible; recognize that web apps cannot fully block operating-system screenshots/app-switcher previews on all devices.

---

## 15. Repository Structure

Recommended monorepo (adapt if needed, preserve separation of trusted cryptographic code and app code):

```text
/
├─ README.md
├─ apps/
│  └─ web/
│     ├─ app/                   # Routes, layouts, auth boundaries
│     ├─ components/            # Design system + vault UI
│     ├─ features/              # passwords, notes, gallery, files, records
│     ├─ lib/                   # typed API, auth adapters, validation
│     ├─ styles/                # theme tokens
│     └─ public/                # PWA manifest and icons, no private files
├─ packages/
│  ├─ crypto/                   # reviewed client protocol, strict unit tests
│  ├─ shared/                   # schemas, errors, types
│  ├─ database/                 # Prisma schema and migrations
│  └─ ui/                       # shared visual primitives if useful
├─ tests/
│  ├─ e2e/
│  ├─ integration/
│  ├─ security/
│  └─ fixtures/                # dummy vault only
├─ docs/
│  ├─ architecture.md
│  ├─ crypto-design.md
│  ├─ threat-model.md
│  ├─ deployment.md
│  ├─ recovery-runbook.md
│  └─ decisions/
├─ .github/workflows/
├─ .env.example
├─ docker-compose.yml          # local dev only
└─ package.json
```

Rules: strict TypeScript; no `any` without justification; schemas at boundaries; small composable modules; clean dependency direction; no crypto inside UI components; no plaintext payloads crossing into server-only code.

---

## 16. Development Setup & Configuration

Agent must supply fully working commands, matching actual package manager and deployed infrastructure. Suggested developer workflow:

```bash
# Example only: replace with exact commands after project scaffolding
cp .env.example .env.local
pnpm install
# Start local PostgreSQL + S3-compatible test storage
# Run database migrations
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Example environment variable names (no values/secrets committed):

```dotenv
DATABASE_URL=
AUTH_SECRET=
APP_BASE_URL=http://localhost:3000
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
EMAIL_PROVIDER_API_KEY=
LOG_LEVEL=info
```

- Document local service setup and separate staging/production config.
- Generate secrets via secure tools, never hardcode or check into Git.
- Use a server-held auth secret **only for authentication**; it must not grant access to vault plaintext.
- Never send `AUTH_SECRET`, S3 secrets, private keys, or database credentials to client bundles.
- CI uses isolated test credentials and synthetic test vaults.

---

## 17. Testing Strategy

### Cryptography

- Golden test vectors for passphrase KDF, key wrapping/unwrapping, entry encryption/decryption, version migration and AAD serialization.
- Failure cases: wrong passphrase, wrong key, swapped item ID, wrong account ID, wrong version, modified tag, flipped bytes, altered file chunk order, missing/truncated chunks, duplicate nonce detection in generated test fixtures.
- Test same ciphertext on desktop and mobile browsers, and future protocol compatibility.
- Fuzz untrusted envelope parsers; property tests for encode/decode and revision handling.

### APIs and authorization

- Authenticated and unauthenticated tests for every endpoint.
- User A must never read/modify/delete User B's items or generate signed URLs for their files.
- Expired/revoked sessions, rate limits, invalid inputs, quotas, replay/idempotency, storage failures, and `409` conflicts.
- Ensure logged-in-but-locked browser cannot accidentally show stale decrypted secrets.

### Functional e2e

- Onboarding and unlock; new device login/unlock.
- Password CRUD, generator/copy/reveal; notes autosave; search/tags/favorites.
- Encrypted media upload/view/download and quota errors.
- Lock after inactivity, logout, session revocation, backup/export/restore.
- Two browsers editing same item simultaneously → deterministic conflict resolution without data loss.
- Offline/reconnect if offline scope is implemented; no plaintext written to browser persistent storage.

### UX and accessibility

- Playwright at 320/375/390/768/1024/1440px; iPhone Safari and Android Chrome on real devices before launch.
- Keyboard-only flows, screen readers, WCAG 2.2 AA review, axe automated checks, visible focus and color-contrast testing.
- Slow network, 3G-like throttling, reduced-motion, dark/light mode, large text, OS font scaling.
- Lighthouse/performance budgets: target excellent scores, but protect security and usability over vanity scores.

### Operational

- Migration forward and rollback strategy.
- Backups under encryption and verified recovery to isolated environment.
- Server crash, storage outage, partial upload cleanup, and sync cursor recovery.
- Vulnerability/dependency scans on each PR and scheduled maintenance.

---

## 18. Deployment & Operations

### Recommended initial hosting

- Private cloud deployment with managed PostgreSQL, private S3-compatible blob bucket and a maintained Node hosting environment.
- HTTPS-only custom domain (optional), automatic TLS renewal, HSTS after confirming deployment stability.
- Restrict database and storage administrative access; least privilege credentials, secret rotation and MFA for cloud accounts.
- Private buckets: **no public listing or anonymous reads**; signed URLs must be narrow and short lived.
- Database encrypted disk backups and cloud object versioning/backup as appropriate; note that both store ciphertext and metadata.
- Separate production/staging environments and separate credentials, storage, and domains.
- Structured observability with strict log redaction; alert on error rate, storage failures, unusual auth rates, backup failures.
- Set data retention, trash retention, audit/log retention, account deletion and backup retention policies.
- Store user email and metadata according to applicable privacy obligations; document subprocessors.
- Prioritize reliable backup and restore over optional scaling infrastructure.

### Backup and recovery plan

1. Periodic server-side backups of database and ciphertext objects; verify consistency and retention.
2. Owner-controlled **client-generated encrypted export**, independently decryptable using owner-held key/recovery materials (format version documented).
3. Validate export manifest, integrity, item counts and file chunk completeness.
4. Restore drill into isolated staging/temporary environment with fake data.
5. Clear workflow for lost device, compromised account, lost passphrase, corrupt archive, and service outage.
6. **No false promises:** if the decryption key is irretrievably lost, zero-knowledge data is not recoverable by support.

---

## 19. Release Gates / Acceptance Criteria

All boxes below are mandatory before inviting actual use with important secrets:

### Security gate

- [ ] Threat model and cryptographic design reviewed by a qualified independent security practitioner.
- [ ] Vetted auth and cryptography libraries; no custom primitives; dependencies checked for known vulnerabilities.
- [ ] All vault data including user-chosen labels, filenames and thumbnails encrypted before upload, or explicitly documented exceptions approved.
- [ ] Server has **no** passphrase/root key/entry plaintext and cannot decrypt any saved item.
- [ ] Unique nonce and correct AAD behavior, key separation, algorithm versioning, recovery documented and tested.
- [ ] Independent login auth and vault unlock verified in test flows.
- [ ] XSS/CSRF/IDOR/session protections and strict CSP audited/tested.
- [ ] Authentication and upload endpoints rate-limited; secrets absent from logs/telemetry.
- [ ] Export/restore reliably works and recovery limits clearly explained.
- [ ] Penetration test or structured independent security review completed, high/critical findings resolved.

### Product gate

- [ ] Owner can complete setup using only mobile, including recovery backup instructions.
- [ ] Vault fully usable on desktop, Android Chrome and iOS Safari.
- [ ] Passwords, notes, images, files and records CRUD work end to end with real client-side encrypted persistence.
- [ ] Edits synchronize on 2 devices; conflict handling prevents silent data loss.
- [ ] Gallery and previews reveal no plaintext to storage/API or service-worker caches.
- [ ] Lock, logout, session listing/revocation and account deletion function as documented.
- [ ] Attractive dark/light themes and responsive layouts tested at required viewport widths.
- [ ] Focus, contrast, labels, keyboard navigation and accessible dialogs meet agreed accessibility bar.
- [ ] Setup, deployment, rollback, backups, recovery and operations documented and exercised.
- [ ] Unit, integration and e2e suites pass; no unaddressed critical bugs.

**Until gates pass:** label environments **DEVELOPMENT — USE TEST DATA ONLY** and do not recommend saving banking, email, primary account or other critical credentials.

---

## 20. Implementation Milestones for the Agent

### M0 — Discovery & design contract

Deliver: architecture diagram, ADRs, UI sitemap and wireframes, design tokens, crypto-design document, threat model, schema and endpoint definitions, development plan. Obtain security review for protocol.

### M1 — Foundation

Deliver: Next.js project, quality tooling, auth scaffolding, database, local Docker setup, design-system components, desktop/mobile shells, CI. Working synthetic demo.

### M2 — Secure enrollment and encryption slice

Deliver: separated login/unlock, versioned wrapped key, real browser-side encryption, secure item CRUD for one dummy password entry, cryptographic and API tests. No real data.

### M3 — Passwords & notes

Deliver: complete password manager CRUD, generator, tags/search, notes editor, autosave, mobile flows and encryption-backed persistence.

### M4 — Encrypted media & records

Deliver: chunked encrypted upload/download after protocol review, thumbnails encrypted locally, document/file management, structured records, storage limits and preview hardening.

### M5 — Sync, recovery & mobile PWA

Deliver: multi-device tests, revision conflicts, tombstones, encrypted export/restore, PWA shell, session management, accessibility and performance improvements.

### M6 — Security validation & production hardening

Deliver: external security review fixes, penetration testing, load/error tests, backup restore drill, monitoring, runbooks, release checklist, deployment.

**Agent reporting format per milestone:** completed files/features; architecture decisions; commands/tests and results; security risks/open questions; screenshots at desktop and mobile widths using fake data; next milestone scope. Don't claim a checklist item is done without demonstrable evidence.

---

## 21. Key Open Decisions to Record (Do Not Guess Silently)

These should be resolved as ADRs before relevant release gates:

- Exact vetted auth provider/library, account login factors and recovery flow.
- Precise key derivation parameters on target phone hardware and a documented acceptable performance threshold.
- Detailed reviewed per-item/file key hierarchy, nonce scheme, serialization, AAD and version migration format.
- Single-user invitation-only setup versus general signup (default: **single-owner/invite-only**).
- Device key persistence/quick unlock guarantees on iOS/Android/browser contexts.
- Whether item category/timestamps are server-visible metadata or client-encrypted.
- File type allowlist and safe PDF preview approach.
- Local offline cache storage/retention policy (default: **online-first and no decrypted persistent cache**).
- Recovery key option and its usability/security review.
- Cloud provider selection, jurisdiction, quotas, pricing and retention.

---

## 22. References / Security Standards

Use these maintained, authoritative resources in addition to current framework-specific security documentation. Re-check them before implementation; security guidance evolves.

- OWASP Cryptographic Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Key Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP MASVS (mobile platform consideration): https://mas.owasp.org/MASVS/
- MDN Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WebAuthn specification: https://www.w3.org/TR/webauthn-3/

---

## 23. Final Engineering Directive

Build **a real, premium, mobile-friendly private cloud vault**, not a design-only prototype. The core differentiators are **end-to-end client-side encrypted storage, reliable cross-device access, safe recoverability, and an outstanding design**. Make secure, testable decisions explicit; ship in phases; use only fake data until independent security review is complete.

**End of specification.**
