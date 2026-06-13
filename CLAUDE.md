# CLAUDE.md — Arbeitskontext für Claude Code

Diese Datei ist die verbindliche Orientierung für jede Code-Arbeit an diesem Projekt.
Lies sie vollständig, bevor du Dateien änderst.

## Was das hier ist

ANNA-lyst — eine B2B-Industrie-Matchmaking-Plattform. Sie dreht das Modell klassischer
Branchenverzeichnisse (IndustryStock, wlw, diribo) um: Statt passiver Stichwortsuche
beschreibt der Nutzer sein Anliegen, und die Plattform sucht **aktiv** passende
Geschäftspartner inklusive Ansprechpartner und Kontaktdaten — als Verkäufer (neue
Absatzmärkte) oder Einkäufer (neue Lieferanten). Betreiber ist die ANNA Lyst GmbH.

## Stack

Next.js 15 (App Router, TypeScript) · Drizzle ORM · Neon/PostgreSQL · Auth.js · Tailwind.
Paketmanager: pnpm. Entwicklung lokal via Claude Code, Vorschau in Replit, Versionierung
über GitHub (`Silvio-at-AnnaL/B2B_IMC`).

## Architekturprinzipien (nicht aufweichen)

1. **Eine Infrastruktur-ENV-Variable: `DATABASE_URL`** (+ `APP_ENCRYPTION_KEY`,
   `AUTH_SECRET`). Alle anderen Zugangsdaten — LLM-Keys, SMTP, Serper, Hunter, Unipile,
   diribo, IndustryStock — liegen **verschlüsselt in der DB** und werden im Admin-Bereich
   verwaltet. Ziel: kein IT-Profi muss in den Quellcode, um Schnittstellen zu pflegen.
2. **Jeder statische UI-Text ist ein Label** (`labels` / `label_translations`), abgerufen
   über `src/lib/i18n/labels.ts`. Niemals UI-Text hartkodieren. Fallback-Kette:
   Zielsprache → Englisch → Label-Key sichtbar. Eine Sprache wird im Frontend wählbar,
   sobald ein einziges Label in ihr existiert. (Gilt nur für statische Texte, nicht für
   LLM-generierte Inhalte wie `match_reason` — deren Sprache steuert `searches.output_lang`.)
3. **Geld immer in Cents (integer) + Währungscode.** Niemals Float.
4. **Credits sind ein Ledger** (`credit_ledger`, +/- Buchungen), kein mutierter Zähler.
5. **Prompts sind versioniert** (`prompt_versions`, genau eine aktive Version je Prompt).
   Prompt-Änderungen brauchen kein Deployment.
6. **Datenquellen sind Adapter** (`integrations`). Jede Quelle hat ein einheitliches
   Interface, wird im Admin aktiviert/konfiguriert und über `cascade_priority` in der
   Enrichment-Kaskade einsortiert.

## Harte Regeln

- **Niemals Secrets committen.** Keine `.env`, keine echten Keys im Code. `.gitignore`
  schützt `.env`; verlass dich nicht allein darauf, prüf jeden Commit.
- **DB-URL gehört NICHT in die `settings`-Tabelle** (Henne-Ei + Leak-Risiko) — nur ENV.
- **Credentials in der DB werden verschlüsselt**, nie im Klartext: `src/lib/crypto.ts`
  (AES-256-GCM). Login-Passwörter werden dagegen **gehasht** (bcrypt), nie verschlüsselt.
- **Jeder gefundene Personendatensatz trägt Quelle + Quell-URL** (`search_results.source`,
  `source_url`) — DSGVO Art. 14 Transparenz. Gelöschte Personen kommen ins
  `erasure_registry` (sha256 der E-Mail) und werden in künftigen Suchen unterdrückt.
- **Keine Binär-Blobs in der DB.** Logos/Fotos/Exporte als Datei-/Objektspeicher-Verweis.
- Vor jedem Commit: `npx tsc --noEmit` muss fehlerfrei sein.

## Verzeichnis

```
src/db/schema/index.ts   Gesamtes Datenmodell (siehe Tabellenüberblick unten)
src/db/seed.ts           DEV-Seed (Sprachen, Pläne, Prompts, Integrations, Admin-User)
src/lib/crypto.ts        AES-256-GCM für DB-Credentials
src/lib/settings.ts      KV-Settings mit transparenter Ver-/Entschlüsselung (is_encrypted)
src/lib/i18n/labels.ts   Label-Resolver mit EN-Fallback
src/auth.ts              Auth.js, Rollen: admin / staff / customer
src/middleware.ts        Zugriffsschutz /admin (admin|staff), /account (eingeloggt)
src/app/admin/           Verwaltungsbereich — Navigationsgerüst steht, CRUD folgt
src/app/account/         Kundenbackend — Navigationsgerüst steht, Inhalte folgen
src/app/robots.txt/      robots.txt dynamisch aus settings
src/app/llms.txt/        llms.txt dynamisch aus settings
```

Tabellen (in `schema/index.ts`): users, verification_codes, customers, customer_contacts,
plans, contracts, invoices, payments, credit_ledger, searches, search_results, favorites,
erasure_registry, shared_searches, share_access_log, search_exports, languages, labels,
label_translations, llm_providers, prompts, prompt_versions, integrations, settings,
seo_pages, audit_log.

## Enrichment-Kaskade (Kontaktdaten)

Pro Ergebnis von kostenlos nach teuer, Abbruch sobald ein Kontakt steht. Reihenfolge über
`integrations.cascade_priority` (klein = zuerst):
1. Verzeichnis-APIs: diribo (`https://api.diribo.com/v1/de`), IndustryStock, wlw
2. Eigenes Website-Scraping der Kandidaten-Firma (Impressum/Team/Kontakt) + LLM-Extraktion
3. Unipile (LinkedIn, vorhandener Zugang)
4. Optional je Plan: Hunter.io (E-Mail-Finder/Verifizierung)

Free-Tier ohne Stufen 3+4, Kontaktdaten verpixelt (`plans.includes_contact_data = false`).

## Phase 1 — aktueller Auftrag: Such-Pipeline

Ziel: Der Kern-Usecase funktioniert end-to-end. Reihenfolge:

1. **Login-Seite** (`/login`) — fehlt noch; Auth.js ist konfiguriert, die Seite nicht.
   Inklusive erzwungenem Passwortwechsel bei `users.must_change_pw`.
2. **Suchformular** (Seller/Buyer, Firmenname, URL, Produkt, Zielregion) — Texte als Labels.
3. **Pipeline-Runner** als DB-gestützter Job (`searches.status`, `pipeline_state`):
   - URL-Scraping der Nutzer-Firma
   - Prompt-Chain Schritt 1–3 (Prompts liegen versioniert in der DB, über
     `prompt_versions.active` laden — nicht hartkodieren)
   - Quellen-Adapter aufrufen (zunächst Serper + Website-Scraping; diribo/IndustryStock
     als Adapter-Stubs mit klarem Interface, bis Zugangsdaten da sind)
   - Scoring, Ergebnisse nach `search_results` schreiben (mit Quelle + Quell-URL)
   - Credit-Abbuchung als Ledger-Buchung
4. **Ergebnisseite** — Liste mit Score, Begründung, Kontaktdaten (im Free-Tier verpixelt).

LLM-Aufrufe gehen über den aktiven `llm_providers`-Eintrag (Key entschlüsseln via
`crypto.ts`). Beginne mit der Login-Seite und dem Suchformular, dann die Pipeline.

## Bekannte Blocker / nicht erfinden

- diribo- und IndustryStock-API: Endpunkt-Doku + Keys kommen vom Betreiber. Bis dahin
  Adapter-Interface bauen, aber keine erfundenen Endpunkte/Felder annehmen.
- wlw: kein bekannter API-Zugang — Adapter bleibt inaktiv.
- Rechtsgrundlage Kontaktdaten (DSGVO Art. 6 lit. f / Art. 14): anwaltlich zu klären,
  blockiert den Launch, nicht die Entwicklung. Technik (Quelle, Löschregister) ist da.

## Stil

Commits klein und thematisch, aussagekräftige Messages. Bei Unsicherheit über eine
Produktentscheidung nachfragen statt raten. Kommentare und UI-Texte auf Deutsch,
Code-Bezeichner auf Englisch.
