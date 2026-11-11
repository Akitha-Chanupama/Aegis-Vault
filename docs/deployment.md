# Aegis Vault - Deployment & Operations Guide

## 1. Production Architecture Overview

Aegis Vault is designed to run in a hardened containerized environment with managed PostgreSQL and an S3-compatible private object store.

```
       [ Public Internet ]
                |
                v  (HTTPS / TLS 1.3 - Strict HSTS)
       [ Reverse Proxy / Cloudflare / Nginx ]
                |
                v  (Internal Network)
       [ Aegis Web App Container (Node.js) ]
          |                           |
          v (Private Subnet)          v (HTTPS Scoped Presigned)
       [ PostgreSQL DB ]         [ Private S3 Bucket ]
       (Encrypted at rest)       (Block all public access)
```

---

## 2. Environment Configuration

All production secrets must be managed using an enterprise secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault) and injected as environment variables.

| Variable | Description | Example / Requirement |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/aegisvault?sslmode=require` |
| `AUTH_SECRET` | 32+ byte random secret for session cookie signing | `openssl rand -hex 32` |
| `APP_BASE_URL` | Canonical origin of the web application | `https://vault.example.com` |
| `S3_ENDPOINT` | Endpoint for private S3 storage | `https://s3.us-east-1.amazonaws.com` |
| `S3_REGION` | AWS Region for S3 bucket | `us-east-1` |
| `S3_BUCKET` | Dedicated private bucket name | `aegis-vault-ciphertext-prod` |
| `S3_ACCESS_KEY_ID` | IAM User / Role Access Key with scoped Put/Get | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | IAM Secret Access Key | Scoped strictly to bucket prefix |
| `LOG_LEVEL` | Application logging verbosity | `info` (Redacts all sensitive inputs) |

---

## 3. Local Development Setup (Docker Compose)

For local development and testing, a `docker-compose.yml` provides local PostgreSQL and MinIO (S3-compatible) instances:

```bash
# 1. Clone repository and install dependencies
npm install

# 2. Copy development environment file
cp .env.example .env.local

# 3. Start local Postgres and MinIO containers
docker compose up -d

# 4. Run Prisma database migrations
npm run db:migrate

# 5. Start Next.js development server
npm run dev
```

---

## 4. Security Hardening Checklist

1. **Content Security Policy (CSP):**
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' https://*.amazonaws.com; frame-ancestors 'none'; object-src 'none';
   ```
2. **HTTP Security Headers:**
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
3. **Database Security:**
   - Database storage volume encrypted at rest with AES-256.
   - Enforce SSL connections (`sslmode=require`).
   - Daily automated logical backups + transaction log archiving.
4. **Blob Storage Security:**
   - S3 Bucket configured with `Block Public Access = true`.
   - Pre-signed URLs restricted to 15-minute maximum TTL.
   - Bucket encryption enabled with AWS KMS customer-managed keys.
5. **Log Redaction:**
   - Server logs MUST NEVER record request bodies containing passwords, passphrases, notes, or raw ciphertext.
   - User IPs are truncated/anonymized in application logs.
