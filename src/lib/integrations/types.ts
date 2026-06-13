/**
 * Einheitliche Adapter-Interfaces fuer externe Datenquellen.
 *
 * Jede Quelle (Suche, Verzeichnis, Kontaktdaten) ist ein Adapter mit gleichem
 * Interface. Aktivierung/Konfiguration laufen ueber die Tabelle `integrations`;
 * die Reihenfolge in der Enrichment-Kaskade steuert `cascade_priority`.
 */

/** Ein gefundener Kandidat (potenzieller Geschaeftspartner). */
export type Candidate = {
  companyName: string;
  companyUrl?: string | null;
  country?: string | null; // ISO 3166-1 alpha-2, wenn bekannt
  snippet?: string | null;
  /** DSGVO Art. 14: Herkunft ist Pflicht. */
  source: string; // serper | diribo | industrystock | ...
  sourceUrl?: string | null;
};

/** Kontaktdaten eines Kandidaten. */
export type Contact = {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  /** DSGVO Art. 14: Herkunft jedes Personendatensatzes ist Pflicht. */
  source: string;
  sourceUrl?: string | null;
};

/** Such-Adapter (Serper, SerpAPI, ...): liefert Kandidaten zu einer Suchanfrage. */
export interface SearchAdapter {
  key: string;
  search(query: string, opts: { limit: number; region?: string | null }): Promise<Candidate[]>;
}

/** Kontakt-Adapter (Verzeichnis, Website-Scraping, Unipile, Hunter): reichert einen Kandidaten an. */
export interface ContactAdapter {
  key: string;
  enrich(candidate: Candidate): Promise<Contact | null>;
}
