# ADR 0001: Technical Stack and Monorepo Architecture

## Status
Accepted

## Context
Aegis Vault requires an end-to-end client-side encrypted architecture accessible on desktop and mobile platforms (including iOS Safari and Android Chrome), with strict separation between client-side cryptographic execution and untrusted cloud storage.

## Decision
1. **Core Framework:** Next.js 15+ App Router with React 19 and TypeScript in strict mode.
2. **Monorepo / Package Structure:**
   - `apps/web`: Next.js web application, responsive UI components, route handlers, and PWA manifest.
   - `packages/crypto`: Standalone, zero-dependency (other than vetted WASM Argon2id) cryptographic library with 100% unit test coverage.
   - `packages/shared`: Shared TypeScript types, Zod schemas, and error codes.
3. **Database & ORM:** PostgreSQL with Prisma ORM for type-safe schema definitions and migrations.
4. **Blob Storage:** Private S3-compatible object store (e.g., MinIO for local development, AWS S3 for production) accessed solely via short-lived scoped pre-signed URLs for ciphertext.
5. **Styling & Components:** Tailwind CSS paired with Radix UI / shadcn accessible primitives.

## Consequences
- **Positive:** Cryptographic logic is strictly isolated from UI rendering and React hydration loops. Strong compile-time typing across API boundaries.
- **Tradeoff:** Monorepo package management requires disciplined dependency management.

