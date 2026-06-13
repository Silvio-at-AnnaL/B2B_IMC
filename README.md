# AnnaLyst — B2B Industrial Matchmaking Platform

Scaffold **v0.1.1** · Next.js 15 (App Router, TypeScript) · Drizzle ORM · Neon (PostgreSQL) · Auth.js · Tailwind (CI-Farben hinterlegt)

## Architekturprinzipien

1. **Eine** Umgebungsvariable für die Infrastruktur: `DATABASE_URL` (plus zwei Secrets für Verschlüsselung/Sessions). **Alles andere** — LLM-Keys, Mailserver, Serper, Hunter/Apollo, IndustryStock, diribo, wlw — wird verschlüsselt in der DB gespeichert und ausschließlich im Admin-Bereich verwaltet. Kein IT-Profi muss in den Quellcode.
2. **Labelverwaltung Multilang:** jeder UI-Text ist ein Label (`labels` / `label_translations`). Fallback-Kette: Zielsprache → Englisch → Label-Key sichtbar. Eine Sprache erscheint im Frontend, sobald ein einziges Label in ihr existiert.
3. **Credits als Ledger**, Geldbeträge in Cents, Rechnungsnummern eindeutig (GoBD).
4. **DSGVO by design:** jede gefundene Person trägt Quelle + Quell-URL; Löschregister (`erasure_registry`) unterdrückt gelöschte Personen in künftigen Suchen. Die Rechtsgrundlage (Art. 6 lit. f Abwägung, Art.-14-Informationskonzept) ist **vor Launch anwaltlich zu klären**.
5. **Prompts versioniert** (`prompt_versions`), genau eine aktive Version je Prompt; Änderung ohne Deployment.
6. **Quellen-Adapter:** jede Datenquelle (Suche, Kontaktdaten, Verzeichnisse) ist ein Eintrag in `integrations` und wird im Admin aktiviert/konfiguriert.

## Setup (DEV in Replit)

1. `DATABASE_URL`, `APP_ENCRYPTION_KEY` (openssl rand -hex 32), `AUTH_SECRET` (openssl rand -base64 32) als Replit-Secrets setzen.
2. `npm run db:push` — Schema in die Neon-DB schreiben (DEV; später db:generate + db:migrate).
3. `npm run db:seed` — Sprachen, Pläne, Prompts, Labels, Integrations-Platzhalter, Admin-User.
4. `npm run dev` — die Replit-Dev-URL ist der Vorschaulink.

Initialer Admin: `admin@anna-lyst.local` / `change-me-now` (oder `SEED_ADMIN_PASSWORD` setzen). **Sofort ändern** (erzwungener Wechsel beim ersten Login ist aktiv).

## Struktur

src/db/schema/index.ts Datenmodell (Auth, CRM, Verträge/Rechnungen, Credits,
Suchen, Labels/i18n, Prompts/LLM, Integrationen,
SEO/robots/llms.txt, Audit, DSGVO-Löschregister)
src/db/seed.ts DEV-Seed
src/lib/crypto.ts AES-256-GCM für DB-gespeicherte Credentials
src/lib/i18n/labels.ts Label-Resolver mit EN-Fallback
src/lib/settings.ts Key-Value-Settings (transparente Ver-/Entschlüsselung)
src/auth.ts Auth.js (Rollen: admin / staff / customer)
src/middleware.ts Zugriffsschutz /admin und /account
src/app/admin/ Verwaltungsbereich (Navigationsgerüst)
src/app/account/ Kundenbackend (Navigationsgerüst)

## Roadmap

- **Phase 1:** Such-Pipeline (Scraping → Prompt-Chain → Quellen-Adapter → Scoring), Suchformular, Ergebnisseite, Credit-Abbuchung
- **Phase 2:** Admin-CRUD: Kunden/CRM, Verträge, Rechnungen, Labels, Prompts, LLM, Integrationen, SEO
- **Phase 3:** Kundenbackend, Mailversand, Exporte, Rechnungs-PDF
- **Phase 4:** Landing-Page-Design (CI), Onboarding, Free-Tier-Schutz, Monitoring

## Kontaktdaten: Enrichment-Kaskade

Pro Ergebnis von kostenlos nach teuer, Abbruch sobald ein Kontakt steht; Reihenfolge im Admin über `integrations.cascade_priority`:

1. Verzeichnis-APIs: diribo (`https://api.diribo.com/v1/de`), IndustryStock, später wlw — eigener Zugang, Grenzkosten ≈ 0
2. Eigenes Website-Scraping (Impressum/Team/Kontakt) + LLM-Extraktion — nur Token-Kosten
3. Unipile (LinkedIn, vorhandener Zugang) — läuft über das eigene LinkedIn-Konto, ToS-Risiko liegt beim Konto
4. Optional je Plan: Hunter.io als E-Mail-Finder/-Verifizierer für Restlücken

Free-Tier ohne Stufen 3+4, Kontaktdaten verpixelt (`plans.includes_contact_data = false`).

## Bewusst offen / zu klären

- Rechtsgutachten Kontaktdaten (Art. 14 DSGVO) — blockiert den Launch, nicht die Entwicklung
- diribo- und IndustryStock-API: Zugangsdaten + Endpunkt-Doku bereitstellen, dann werden die Adapter implementiert
- wlw: kein bekannter API-Zugang — Adapter bleibt inaktiv
- Zahlungsabwicklung (Stripe vs. Rechnung manuell) — Schema unterstützt beides
