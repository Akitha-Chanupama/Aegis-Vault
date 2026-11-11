# Aegis Vault - Milestone Implementation Plan

## Milestone Overview

| Milestone | Scope | Deliverables | Verification Gates |
|---|---|---|---|
| **M0** | Discovery & Design Contract | `docs/architecture.md`, `docs/crypto-design.md`, `docs/threat-model.md`, `docs/ui-planning.md`, ADRs 0001-0004, schema and API specs. | Cryptographic specification and threat model complete. |
| **M1** | Foundation & Project Scaffolding | Next.js App Router, Tailwind CSS design system, responsive `AppShell` (desktop nav + mobile bottom tab bar), Prisma schema, local dev environment. | Lint, TypeScript compilation, and responsive layout tests at 320px, 390px, 768px, 1024px. |
| **M2** | Secure Enrollment & Crypto Vertical Slice | `packages/crypto` core (Argon2id + AES-256-GCM + AAD), independent auth session + vault initialization, single password item encrypted CRUD vertical slice. | Cryptographic unit tests with golden test vectors; proof that server never receives plaintext. |
| **M3** | Full Passwords & Notes Features | Credential manager (CRUD, generator, copy/reveal, tags, favorites), secure note editor with autosave, in-memory transient search. | End-to-end credential and note lifecycle with zero plaintext server leakage. |
| **M4** | Encrypted Media Locker & Personal Records | Chunked AES-GCM file encryption, client-side thumbnail generator, private gallery, encrypted document upload/download, structured personal records. | Bounded memory usage during file encryption; EXIF data stripped locally; verified encrypted preview. |
| **M5** | Cross-Device Sync, Recovery & Mobile PWA | Monotonic change cursor sync, revision conflict detection UI, 24-word recovery phrase generator & vault recovery, PWA install manifest. | Concurrent edit conflict resolution test without data loss; recovery phrase restores vault key. |
| **M6** | Security Validation, Hardening & Release Audit | Security test suite (tampered tags, swapped IDs, replay attacks), CSP validation, accessibility audit (WCAG 2.2 AA), release readiness report. | All security gates in §19 verified. |
