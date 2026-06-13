/**
 * Seed-Daten fuer die DEV-Umgebung.
 * Ausfuehren: pnpm run db:seed  (DATABASE_URL muss gesetzt sein)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  languages, plans, prompts, promptVersions, integrations, labels,
  labelTranslations, users, settings, llmProviders,
} from "./schema";
import { eq } from "drizzle-orm";
import { encryptSecret } from "../lib/crypto";

async function main() {
  // --- Sprachen ---
  await db.insert(languages).values({ code: "en", name: "English", active: true }).onConflictDoNothing();
  await db.insert(languages).values({ code: "de", name: "Deutsch", active: true }).onConflictDoNothing();

  // --- Plaene ---
  await db.insert(plans).values({ code: "free", name: "Free", monthlyCredits: 3, resultsPerSearch: 5, includesContactData: false, priceCents: 0, currency: "EUR", active: true }).onConflictDoNothing();
  await db.insert(plans).values({ code: "starter", name: "Starter", monthlyCredits: 20, resultsPerSearch: 20, includesContactData: true, priceCents: 4900, currency: "EUR", active: true }).onConflictDoNothing();
  await db.insert(plans).values({ code: "pro", name: "Pro", monthlyCredits: 100, resultsPerSearch: 50, includesContactData: true, priceCents: 14900, currency: "EUR", active: true }).onConflictDoNothing();
  await db.insert(plans).values({ code: "enterprise", name: "Enterprise", monthlyCredits: null, resultsPerSearch: 100, includesContactData: true, priceCents: null, currency: "EUR", active: true }).onConflictDoNothing();

  // --- Prompt-Chain (3 Schritte, versioniert) ---
  await db.insert(prompts).values({ key: "context_extraction", name: "Schritt 1 — Unternehmenskontext extrahieren", description: null }).onConflictDoNothing();
  await db.insert(prompts).values({ key: "search_strategy", name: "Schritt 2 — Suchstrategie ableiten", description: null }).onConflictDoNothing();
  await db.insert(prompts).values({ key: "scoring", name: "Schritt 3 — Partnerrecherche & Scoring", description: null }).onConflictDoNothing();

  await db.insert(promptVersions).values({
    promptKey: "context_extraction", version: 1, active: true,
    systemText:
      "Du bist ein B2B-Marktanalyst. Analysiere die Website eines Unternehmens und extrahiere: " +
      "Branche (NACE-Code wenn moeglich), Hauptprodukte/Dienstleistungen, Zertifizierungen (ISO, IATF, ...), " +
      "Positionierung (Nische, Massenmarkt, Premium), Hinweise auf bestehende Maerkte. " +
      "Antworte ausschliesslich als JSON-Objekt.",
    userTemplate: "Website-Inhalt:\n{{scraped_text}}",
    modelParams: null,
    createdByUserId: null,
  }).onConflictDoNothing();

  await db.insert(promptVersions).values({
    promptKey: "search_strategy", version: 1, active: true,
    systemText:
      "Du bist ein B2B-Vertriebsstratege. Leite aus Unternehmensprofil, Modus, Produkt und Zielregion ab: " +
      "relevante Suchbegriffe (Deutsch + Englisch + Landessprache), Zielunternehmensprofil (Branche, Groesse, Typ), " +
      "relevante Berufsbezeichnungen der Ansprechpartner, empfohlene Quellen (Branchenverbaende, Messen, Register). " +
      "Antworte ausschliesslich als JSON-Objekt.",
    userTemplate:
      "Unternehmensprofil: {{company_profile_json}}\nModus: {{mode}}\nProdukt: {{product}}\nZielregion: {{target_region}}",
    modelParams: null,
    createdByUserId: null,
  }).onConflictDoNothing();

  await db.insert(promptVersions).values({
    promptKey: "scoring", version: 1, active: true,
    systemText:
      "Du wertest Suchergebnisse aus und bewertest potenzielle Geschaeftspartner. " +
      "Kriterien: Produktrelevanz, Laendermatch, Unternehmensgroesse, Kontaktverfuegbarkeit. " +
      "Skala 0-100 mit Begruendung in 1-2 Saetzen in der Sprache {{output_lang}}. " +
      "Antworte ausschliesslich als JSON-Array.",
    userTemplate: "Kandidaten:\n{{candidates_json}}",
    modelParams: null,
    createdByUserId: null,
  }).onConflictDoNothing();

  // --- Integrations-Platzhalter ---
  await db.insert(integrations).values({ key: "serper", name: "Serper (Google Search API)", kind: "search_api", baseUrl: "https://google.serper.dev", credentialsEncrypted: null, config: null, cascadePriority: 100, active: false }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "diribo", name: "diribo", kind: "directory", baseUrl: "https://api.diribo.com/v1/de", credentialsEncrypted: null, config: null, cascadePriority: 10, active: false }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "industrystock", name: "IndustryStock", kind: "directory", baseUrl: null, credentialsEncrypted: null, config: null, cascadePriority: 11, active: false }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "wlw", name: "Wer liefert was (Visable)", kind: "directory", baseUrl: null, credentialsEncrypted: null, config: null, cascadePriority: 12, active: false }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "website_scraping", name: "Eigenes Website-Scraping (Impressum/Team/Kontakt)", kind: "scraper", baseUrl: null, credentialsEncrypted: null, config: null, cascadePriority: 20, active: true }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "unipile", name: "Unipile (LinkedIn)", kind: "contact_data", baseUrl: "https://api.unipile.com", credentialsEncrypted: null, config: null, cascadePriority: 30, active: false }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "hunter", name: "Hunter.io (E-Mail-Finder/Verifizierung, optional)", kind: "contact_data", baseUrl: "https://api.hunter.io", credentialsEncrypted: null, config: null, cascadePriority: 40, active: false }).onConflictDoNothing();
  await db.insert(integrations).values({ key: "smtp", name: "Mailserver (SMTP)", kind: "mail", baseUrl: null, credentialsEncrypted: null, config: null, cascadePriority: 100, active: false }).onConflictDoNothing();

  // --- Basis-Labels ---
  const baseLabels: [string, string, string][] = [
    ["nav.home", "Home", "Start"],
    ["nav.dashboard", "Dashboard", "Übersicht"],

    // Generisch
    ["common.loading", "Please wait…", "Bitte warten…"],

    // Login
    ["login.title", "Sign in", "Anmelden"],
    ["login.email", "Email", "E-Mail"],
    ["login.password", "Password", "Passwort"],
    ["login.submit", "Sign in", "Anmelden"],
    ["login.error.invalid", "Invalid email or password.", "E-Mail oder Passwort ist falsch."],
    ["login.changed.success", "Your password has been changed. Please sign in.", "Dein Passwort wurde geändert. Bitte melde dich an."],

    // Passwortwechsel
    ["changepw.title", "Change password", "Passwort ändern"],
    ["changepw.hint", "For security reasons you need to set a new password.", "Aus Sicherheitsgründen musst du ein neues Passwort festlegen."],
    ["changepw.current", "Current password", "Aktuelles Passwort"],
    ["changepw.new", "New password", "Neues Passwort"],
    ["changepw.confirm", "Confirm new password", "Neues Passwort bestätigen"],
    ["changepw.submit", "Save new password", "Neues Passwort speichern"],
    ["changepw.error.session", "Your session has expired. Please sign in again.", "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."],
    ["changepw.error.tooShort", "The new password must be at least 8 characters long.", "Das neue Passwort muss mindestens 8 Zeichen lang sein."],
    ["changepw.error.mismatch", "The new passwords do not match.", "Die neuen Passwörter stimmen nicht überein."],
    ["changepw.error.wrongCurrent", "The current password is incorrect.", "Das aktuelle Passwort ist falsch."],
    ["changepw.error.same", "The new password must differ from the current one.", "Das neue Passwort muss sich vom aktuellen unterscheiden."],

    // Suche
    ["search.title", "Find new business partners", "Neue Geschäftspartner finden"],
    ["search.intro", "Describe your company and your request — we actively search for matching partners.", "Beschreibe dein Unternehmen und dein Anliegen — wir suchen aktiv nach passenden Partnern."],
    ["search.field.mode", "What would you like to do?", "Was möchtest du tun?"],
    ["search.mode.seller", "I am selling — find new markets", "Ich verkaufe — neue Absatzmärkte finden"],
    ["search.mode.buyer", "I am buying — find new suppliers", "Ich kaufe ein — neue Lieferanten finden"],
    ["search.field.company", "Company name", "Unternehmensname"],
    ["search.field.url", "Website URL", "Website-URL"],
    ["search.field.url.optional", "Website URL (optional)", "Website-URL (optional)"],
    ["search.field.product", "Product / product group", "Produkt / Produktgruppe"],
    ["search.field.region", "Target country / region", "Zielland / Zielregion"],
    ["search.submit", "Find partners", "Partner finden"],
    ["search.error.session", "Your session has expired. Please sign in again.", "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."],
    ["search.error.mode", "Please choose whether you are selling or buying.", "Bitte wähle, ob du verkaufst oder einkaufst."],
    ["search.error.required", "Please fill in all required fields.", "Bitte fülle alle Pflichtfelder aus."],
    ["search.status", "Status", "Status"],
    ["search.status.queued", "Queued — the search pipeline will start shortly.", "In Warteschlange — die Such-Pipeline startet in Kürze."],
    ["search.status.running", "Running…", "Läuft…"],
    ["search.status.completed", "Completed", "Abgeschlossen"],
    ["search.status.failed", "Failed", "Fehlgeschlagen"],
    ["search.status.cancelled", "Cancelled", "Abgebrochen"],
    ["search.detail.pipelineNote", "Results will appear here once the search pipeline has run.", "Die Ergebnisse erscheinen hier, sobald die Such-Pipeline durchgelaufen ist."],
    ["search.list.title", "My searches", "Meine Suchen"],
    ["search.list.empty", "No searches yet.", "Noch keine Suchen."],
    ["search.list.new", "New search", "Neue Suche"],

    // Pipeline-Runner & Ergebnisse
    ["search.run.starting", "We are searching for partners — this can take a moment.", "Wir suchen nach Partnern — das kann einen Moment dauern."],
    ["search.run.failed", "The search could not be completed.", "Die Suche konnte nicht abgeschlossen werden."],
    ["search.run.retry", "Try again", "Erneut versuchen"],
    ["search.run.refresh", "Refresh", "Aktualisieren"],
    ["search.error.insufficientCredits", "Not enough credits for this search.", "Nicht genügend Credits für diese Suche."],
    ["search.error.noSearchAdapter", "No active search source is configured. Please contact the administrator.", "Es ist keine aktive Suchquelle konfiguriert. Bitte wende dich an die Administration."],
    ["results.title", "Results", "Ergebnisse"],
    ["results.empty", "No matching partners found.", "Keine passenden Partner gefunden."],
    ["results.score", "Match", "Treffer"],
    ["results.contact", "Contact", "Kontakt"],
    ["results.contact.none", "No contact found.", "Kein Kontakt gefunden."],
    ["results.contact.locked", "Contact data is included in the paid plans.", "Kontaktdaten sind in den kostenpflichtigen Tarifen enthalten."],
    ["results.source", "Source", "Quelle"],
  ];

  for (const [key] of baseLabels) {
    await db.insert(labels).values({ key, context: null }).onConflictDoNothing();
  }
  for (const [key, en, de] of baseLabels) {
    await db.insert(labelTranslations).values({ labelKey: key, langCode: "en", value: en }).onConflictDoNothing();
    await db.insert(labelTranslations).values({ labelKey: key, langCode: "de", value: de }).onConflictDoNothing();
  }

  // --- Settings ---
  await db.insert(settings).values({ key: "robots_txt", value: "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account/", isEncrypted: false, updatedByUserId: null }).onConflictDoNothing();
  await db.insert(settings).values({ key: "llms_txt", value: "# B2B_IMC — ANNA-lyst\n\nAI-powered B2B industrial matchmaking platform.", isEncrypted: false, updatedByUserId: null }).onConflictDoNothing();
  await db.insert(settings).values({ key: "theme", value: { primary: "#1D71B8", accent: "#EB9234", green: "#428A44", red: "#D94235", gray: "#878787", colorblindMode: false }, isEncrypted: false, updatedByUserId: null }).onConflictDoNothing();
  await db.insert(settings).values({ key: "branding", value: { logoUrl: "/logo.png", footerText: "ANNA Lyst GmbH", footerUrl: "" }, isEncrypted: false, updatedByUserId: null }).onConflictDoNothing();
  await db.insert(settings).values({
    key: "permissions_json",
    value: {
      admin: ["*"],
      staff: ["customers:*", "searches:read", "labels:*", "seo:*", "invoices:read"],
      customer: ["account:*"],
    },
    isEncrypted: false,
    updatedByUserId: null,
  }).onConflictDoNothing();

  // --- Initialer Admin ---
  const initialPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  await db.insert(users).values({
    email: "admin@anna-lyst.local",
    passwordHash: await bcrypt.hash(initialPassword, 12),
    firstName: "Initial",
    lastName: "Admin",
    role: "admin",
    status: "active",
    mustChangePw: true,
    locale: "de",
    customerId: null,
    createdByUserId: null,
  }).onConflictDoNothing();

  // --- Optionales Bootstrap externer Zugaenge (verschluesselt) ---
  // Solange das Admin-CRUD fuer Provider/Integrationen fehlt, koennen Keys einmalig
  // ueber ENV beim Seeden gesetzt werden. Sie landen verschluesselt in der DB
  // (AES-256-GCM); zur Laufzeit bleibt nur DATABASE_URL/APP_ENCRYPTION_KEY in ENV.
  if (process.env.SEED_ANTHROPIC_KEY) {
    const existing = await db.select().from(llmProviders).where(eq(llmProviders.vendor, "anthropic")).limit(1);
    if (existing.length === 0) {
      await db.insert(llmProviders).values({
        name: "Anthropic Claude",
        vendor: "anthropic",
        baseUrl: null,
        model: process.env.SEED_LLM_MODEL ?? "claude-sonnet-4-6",
        apiKeyEncrypted: encryptSecret(process.env.SEED_ANTHROPIC_KEY),
        isDefault: true,
        active: true,
        config: { max_tokens: 2048, temperature: 0.2 },
      });
      console.log("LLM-Provider Anthropic angelegt (Key verschluesselt).");
    }
  }
  if (process.env.SEED_SERPER_KEY) {
    await db
      .update(integrations)
      .set({ credentialsEncrypted: encryptSecret(JSON.stringify({ apiKey: process.env.SEED_SERPER_KEY })), active: true })
      .where(eq(integrations.key, "serper"));
    console.log("Serper-Integration aktiviert (Key verschluesselt).");
  }

  console.log("Seed abgeschlossen. Admin: admin@anna-lyst.local / " +
    (process.env.SEED_ADMIN_PASSWORD ? "(SEED_ADMIN_PASSWORD)" : "change-me-now — bitte sofort aendern."));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
