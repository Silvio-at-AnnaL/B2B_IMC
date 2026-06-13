# B2B_IMC — ANNA-lyst B2B Industrial Matchmaking Platform

## Project Overview

**ANNA-lyst** is a B2B Industrial Matchmaking Platform that uses AI to actively identify business partners (sellers finding markets, buyers finding suppliers) in the industrial sector.

Built on:
- **Next.js 15** (App Router, TypeScript)
- **Drizzle ORM** + **Neon PostgreSQL** (Replit built-in)
- **Auth.js v5** (Credentials provider, roles: admin / staff / customer)
- **Tailwind CSS** (brand colors: Green #428A44, Blue #1D71B8, Orange #EB9234, Red #D94235, Gray #878787)
- **Anthropic Claude** (AI pipeline: context extraction → search strategy → scoring)
- **AES-256-GCM** encryption for all DB-stored credentials

## Architecture Principles

1. Only 3 environment variables needed outside the app: `DATABASE_URL`, `APP_ENCRYPTION_KEY`, `AUTH_SECRET`
2. All other credentials (LLM keys, SMTP, external APIs) stored encrypted in the DB and managed via Admin UI
3. Multilang label system — every UI text is a label in the DB
4. Credits as a ledger (credit_ledger table), money in cents
5. GDPR by design — every found contact carries source + source URL; erasure registry suppresses deleted persons
6. Versioned prompts — exactly one active version per prompt key

## Environment Secrets

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | Replit built-in PostgreSQL (auto-set) |
| `APP_ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM |
| `AUTH_SECRET` | Auth.js session secret (base64) |

## Initial Admin Login

- Email: `admin@anna-lyst.local`
- Password: `change-me-now` (change immediately after first login)

## Dev Commands

```bash
npm run dev          # Start dev server
npm run db:push      # Push schema to DB (dev)
npm run db:seed      # Seed initial data
npm run db:studio    # Open Drizzle Studio
```

## Roadmap

- **Phase 1:** Search pipeline, search form, results page, credit deduction
- **Phase 2:** Admin CRUD: customers/CRM, contracts, invoices, labels, prompts, LLM, integrations, SEO
- **Phase 3:** Customer backend, email sending, exports, invoice PDF
- **Phase 4:** Landing page (CI design), onboarding, free-tier protection, monitoring

## User Preferences

- Project name: B2B_IMC
- Language: German UI labels, multilang supported
- Database: Replit built-in PostgreSQL (Neon)
