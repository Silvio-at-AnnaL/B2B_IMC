/**
 * ANNA-lyst B2B Matchmaking Platform — Datenbankschema (Drizzle / PostgreSQL)
 *
 * Strukturprinzipien:
 * - Geld immer in Cents (integer) + Waehrungscode, nie float.
 * - Credits als Ledger (credit_ledger), nie als mutierter Zaehler.
 * - Externe Credentials nur verschluesselt (AES-256-GCM, siehe lib/crypto.ts).
 * - Jeder gefundene Personendatensatz traegt Quelle + Quell-URL (DSGVO Art. 14,
 *   Transparenzpflicht) und ist einzeln loeschbar (Art. 17).
 */
import {
  pgTable, pgEnum, text, varchar, integer, boolean, timestamp,
  jsonb, serial, uniqueIndex, index, date, primaryKey,
} from "drizzle-orm/pg-core";

/* ============================================================
 * 1. Auth & Rollen
 * ============================================================ */
export const userRole = pgEnum("user_role", ["admin", "staff", "customer"]);
export const userStatus = pgEnum("user_status", ["active", "invited", "disabled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash"), // bcrypt — Login-Passwoerter werden gehasht, nie verschluesselt
  firstName: varchar("first_name", { length: 128 }),
  lastName: varchar("last_name", { length: 128 }),
  role: userRole("role").notNull().default("customer"),
  status: userStatus("status").notNull().default("active"),
  /** Erzwungener Passwortwechsel beim naechsten Login (GAIO: must_change_pw). */
  mustChangePw: boolean("must_change_pw").notNull().default(false),
  // Kunden-User gehoeren zu einem CRM-Kunden; admin/staff nicht.
  customerId: integer("customer_id").references(() => customers.id),
  locale: varchar("locale", { length: 8 }).notNull().default("de"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

/** E-Mail-Verifizierung & Passwort-Reset (GAIO: verification_codes). */
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 64 }).notNull(),
  purpose: varchar("purpose", { length: 32 }).notNull(), // email_verify | password_reset
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("verification_codes_user_idx").on(t.userId)]);

/* ============================================================
 * 2. CRM — Kundenverwaltung (Zusatzanweisung 1)
 * ============================================================ */
export const customerStatus = pgEnum("customer_status", ["lead", "active", "paused", "churned"]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyUrl: varchar("company_url", { length: 500 }),
  vatId: varchar("vat_id", { length: 32 }),
  status: customerStatus("status").notNull().default("lead"),
  // Rechnungsadresse
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  zip: varchar("zip", { length: 16 }),
  city: varchar("city", { length: 128 }),
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
  notes: text("notes"),
  ownerUserId: integer("owner_user_id"), // zustaendiger Mitarbeiter (staff/admin)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Mehrere Ansprechpartner je Kunde (Zusatzanweisung 1). */
export const customerContacts = pgTable("customer_contacts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 128 }),
  lastName: varchar("last_name", { length: 128 }).notNull(),
  roleTitle: varchar("role_title", { length: 128 }), // z. B. Einkaufsleiter
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("customer_contacts_customer_idx").on(t.customerId)]);

/* ============================================================
 * 3. Plaene, Vertraege, Rechnungen, Zahlungen, Credits
 * ============================================================ */
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull(), // free | starter | pro | enterprise
  name: varchar("name", { length: 128 }).notNull(),
  monthlyCredits: integer("monthly_credits"), // null = unbegrenzt
  resultsPerSearch: integer("results_per_search").notNull(),
  /** Free-Tier ohne Kontakt-Enrichment (Unit-Economics, siehe Audit Punkt 6). */
  includesContactData: boolean("includes_contact_data").notNull().default(true),
  priceCents: integer("price_cents"), // null = auf Anfrage
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  active: boolean("active").notNull().default(true),
}, (t) => [uniqueIndex("plans_code_uq").on(t.code)]);

export const contractStatus = pgEnum("contract_status", ["active", "cancelled", "expired", "pending"]);

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  planId: integer("plan_id").notNull().references(() => plans.id),
  status: contractStatus("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  billingCycle: varchar("billing_cycle", { length: 16 }).notNull().default("monthly"), // monthly | yearly
  /** Individuelle Abweichung vom Plan (Enterprise-Verhandlung). */
  creditsOverride: integer("credits_override"),
  priceCentsOverride: integer("price_cents_override"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("contracts_customer_idx").on(t.customerId)]);

export const invoiceStatus = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "cancelled"]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  contractId: integer("contract_id").references(() => contracts.id),
  number: varchar("number", { length: 64 }).notNull(), // fortlaufend, GoBD-konform nicht wiederverwendbar
  status: invoiceStatus("status").notNull().default("draft"),
  issuedAt: date("issued_at"),
  dueAt: date("due_at"),
  netCents: integer("net_cents").notNull(),
  vatRate: integer("vat_rate").notNull().default(19), // Prozent
  grossCents: integer("gross_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("invoices_number_uq").on(t.number),
  index("invoices_customer_idx").on(t.customerId),
]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  paidAt: date("paid_at").notNull(),
  amountCents: integer("amount_cents").notNull(),
  method: varchar("method", { length: 32 }).notNull(), // transfer | sepa | card | other
  reference: varchar("reference", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Credits als Buchungsjournal: Gutschriften (+) und Verbrauch (-). */
export const creditLedger = pgTable("credit_ledger", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  delta: integer("delta").notNull(), // +20 Monatsgutschrift, -1 Suche
  reason: varchar("reason", { length: 64 }).notNull(), // monthly_grant | search | manual_adjustment | refund
  searchId: integer("search_id"),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("credit_ledger_customer_idx").on(t.customerId)]);

/* ============================================================
 * 4. Kern-Usecase: Suchen & Ergebnisse
 * ============================================================ */
export const searchMode = pgEnum("search_mode", ["seller", "buyer"]);
export const searchStatus = pgEnum("search_status", ["queued", "running", "completed", "failed", "cancelled"]);

export const searches = pgTable("searches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  mode: searchMode("mode").notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyUrl: varchar("company_url", { length: 500 }),
  product: varchar("product", { length: 255 }).notNull(),
  targetRegion: varchar("target_region", { length: 128 }).notNull(),
  /** Zielsprache der LLM-Ausgaben (match_reason etc.) — folgt der Frontend-Sprache. */
  outputLang: varchar("output_lang", { length: 8 }).notNull().default("de"),
  status: searchStatus("status").notNull().default("queued"),
  /** Zwischenergebnisse der Prompt-Chain (Schritt 1 Kontext, Schritt 2 Strategie). */
  pipelineState: jsonb("pipeline_state"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => [index("searches_user_idx").on(t.userId)]);

export const searchResults = pgTable("search_results", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").notNull().references(() => searches.id, { onDelete: "cascade" }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companyUrl: varchar("company_url", { length: 500 }),
  country: varchar("country", { length: 2 }),
  contactName: varchar("contact_name", { length: 255 }),
  contactTitle: varchar("contact_title", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 64 }),
  matchScore: integer("match_score"), // 0-100
  matchReason: text("match_reason"),
  /** DSGVO: Herkunft jedes Datensatzes ist Pflicht (Transparenz, Art. 14). */
  source: varchar("source", { length: 64 }).notNull(), // serper | hunter | industrystock | ...
  sourceUrl: varchar("source_url", { length: 1000 }),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("search_results_search_idx").on(t.searchId)]);

export const favorites = pgTable("favorites", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resultId: integer("result_id").notNull().references(() => searchResults.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.resultId] })]);

/**
 * DSGVO Art. 17: Loeschregister. Geloeschte Personen werden gehasht vermerkt,
 * damit sie bei kuenftigen Suchen unterdrueckt werden koennen (Suppression List).
 */
export const erasureRegistry = pgTable("erasure_registry", {
  id: serial("id").primaryKey(),
  emailHash: varchar("email_hash", { length: 64 }).notNull(), // sha256(lowercase(email))
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  note: text("note"),
}, (t) => [uniqueIndex("erasure_email_uq").on(t.emailHash)]);

/** Geteilte Suchergebnisse per Link (GAIO: shared_analyses). */
export const sharedSearches = pgTable("shared_searches", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").notNull().references(() => searches.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull(), // URL-Token, kryptographisch zufaellig
  createdByUserId: integer("created_by_user_id").notNull(),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("shared_searches_token_uq").on(t.token)]);

/** Zugriffslog je Freigabe (GAIO: share_access_log). */
export const shareAccessLog = pgTable("share_access_log", {
  id: serial("id").primaryKey(),
  sharedSearchId: integer("shared_search_id").notNull()
    .references(() => sharedSearches.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  accessedAt: timestamp("accessed_at").notNull().defaultNow(),
});

/** Exporte (CSV/XLSX/PDF) von Suchergebnissen (GAIO: analysis_exports). */
export const searchExports = pgTable("search_exports", {
  id: serial("id").primaryKey(),
  searchId: integer("search_id").notNull().references(() => searches.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  format: varchar("format", { length: 8 }).notNull(), // csv | xlsx | pdf
  fileUrl: varchar("file_url", { length: 500 }), // Objektspeicher-Verweis, kein Blob in der DB
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ============================================================
 * 5. Multilang-Labelverwaltung (Zusatzanweisung 5)
 * ============================================================ */
export const languages = pgTable("languages", {
  code: varchar("code", { length: 8 }).primaryKey(), // de, en, fr, ...
  name: varchar("name", { length: 64 }).notNull(),
  active: boolean("active").notNull().default(true),
});

export const labels = pgTable("labels", {
  key: varchar("key", { length: 255 }).primaryKey(), // z. B. "nav.dashboard"
  context: text("context"), // Hinweis fuer Uebersetzer/Redaktion
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const labelTranslations = pgTable("label_translations", {
  labelKey: varchar("label_key", { length: 255 }).notNull()
    .references(() => labels.key, { onDelete: "cascade" }),
  langCode: varchar("lang_code", { length: 8 }).notNull()
    .references(() => languages.code),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.labelKey, t.langCode] })]);

/* ============================================================
 * 6. KI-Verwaltung: LLM-Provider & Prompts (versioniert)
 * ============================================================ */
export const llmProviders = pgTable("llm_providers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(), // "Anthropic Claude"
  vendor: varchar("vendor", { length: 32 }).notNull(), // anthropic | openai | ...
  baseUrl: varchar("base_url", { length: 500 }),
  model: varchar("model", { length: 128 }).notNull(),
  apiKeyEncrypted: text("api_key_encrypted"), // AES-256-GCM, nie im Klartext
  isDefault: boolean("is_default").notNull().default(false),
  active: boolean("active").notNull().default(true),
  config: jsonb("config"), // temperature, max_tokens etc.
});

export const prompts = pgTable("prompts", {
  key: varchar("key", { length: 128 }).primaryKey(), // context_extraction | search_strategy | scoring
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});

export const promptVersions = pgTable("prompt_versions", {
  id: serial("id").primaryKey(),
  promptKey: varchar("prompt_key", { length: 128 }).notNull()
    .references(() => prompts.key, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  systemText: text("system_text").notNull(),
  userTemplate: text("user_template"), // Platzhalter {{company_url}}, {{product}}, ...
  modelParams: jsonb("model_params"),
  active: boolean("active").notNull().default(false), // genau eine aktive Version je Prompt
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("prompt_versions_uq").on(t.promptKey, t.version)]);

/* ============================================================
 * 7. Externe Integrationen — zentral verwaltbar (Zusatzanweisung 3)
 *    Mailserver, Serper, Hunter/Apollo, IndustryStock, diribo, wlw, ...
 *    Jede Quelle ist ein Adapter; Konfiguration & Keys liegen hier.
 * ============================================================ */
export const integrationKind = pgEnum("integration_kind", [
  "search_api",      // Serper, SerpAPI, Bing
  "contact_data",    // Hunter, Unipile, Cognism, Dealfront
  "directory",       // IndustryStock, diribo, wlw
  "scraper",         // eigenes Website-Scraping (Impressum/Team/Kontakt)
  "mail",            // SMTP
  "other",
]);

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull(), // serper | hunter | unipile | smtp | industrystock | ...
  name: varchar("name", { length: 128 }).notNull(),
  kind: integrationKind("kind").notNull(),
  baseUrl: varchar("base_url", { length: 500 }),
  credentialsEncrypted: text("credentials_encrypted"), // JSON verschluesselt (Keys, SMTP-Passwort, ...)
  config: jsonb("config"), // unkritische Einstellungen (Port, From-Adresse, Limits)
  /**
   * Reihenfolge in der Enrichment-Kaskade (klein = zuerst). Die Kaskade bricht je
   * Ergebnis ab, sobald ein Kontakt steht: Verzeichnis-APIs -> eigenes Scraping
   * -> Unipile/LinkedIn -> (optional) Hunter. Im Admin umsortierbar.
   */
  cascadePriority: integer("cascade_priority").notNull().default(100),
  active: boolean("active").notNull().default(false),
}, (t) => [uniqueIndex("integrations_key_uq").on(t.key)]);

/* ============================================================
 * 8. SEO & Plattform-Settings (Zusatzanweisung 4)
 * ============================================================ */
/**
 * Generischer Key-Value-Store, u. a. robots_txt, llms_txt, Branding/Theme,
 * permissions_json. isEncrypted (GAIO-Empfehlung 5): markiert Werte, die
 * get/setSetting transparent ver-/entschluesseln muss.
 */
export const settings = pgTable("settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: jsonb("value").notNull(),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id"),
});

/** Meta-Tags je Route, mehrsprachig (jsonb: { de: {...}, en: {...} }). */
export const seoPages = pgTable("seo_pages", {
  route: varchar("route", { length: 255 }).primaryKey(), // "/", "/pricing", ...
  meta: jsonb("meta").notNull(), // { [lang]: { title, description, ogImage } }
  noindex: boolean("noindex").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ============================================================
 * 9. Audit-Log
 * ============================================================ */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: varchar("action", { length: 64 }).notNull(), // login | search.create | settings.update | ...
  entity: varchar("entity", { length: 64 }),
  entityId: varchar("entity_id", { length: 64 }),
  payload: jsonb("payload"),
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("audit_user_idx").on(t.userId)]);
