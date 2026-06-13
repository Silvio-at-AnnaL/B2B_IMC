/**
 * Zentrale Stelle, an der aus den `integrations`-DB-Eintraegen konkrete Adapter
 * gebaut werden. Die Kontakt-Enrichment-Kaskade wird hier nach `cascade_priority`
 * (klein = zuerst) sortiert geliefert; die Kaskade bricht je Ergebnis ab, sobald
 * ein Kontakt steht (Logik im Pipeline-Runner).
 */
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ContactAdapter, SearchAdapter } from "./types";
import { buildSerperAdapter } from "./serper";
import { buildDirectorySearchAdapter, buildDirectoryContactAdapter } from "./directory";
import { buildWebsiteScrapingAdapter } from "./website-scraping";

export type IntegrationRow = typeof integrations.$inferSelect;

async function loadActiveIntegrations(): Promise<IntegrationRow[]> {
  return db.select().from(integrations).where(eq(integrations.active, true));
}

/** Aktiven Such-Adapter ermitteln (zunaechst Serper; Verzeichnis-APIs folgen). */
export async function getSearchAdapter(): Promise<SearchAdapter | null> {
  const rows = (await loadActiveIntegrations()).sort(
    (a, b) => a.cascadePriority - b.cascadePriority,
  );
  for (const row of rows) {
    if (row.kind === "search_api" && row.key === "serper") {
      const a = buildSerperAdapter(row);
      if (a) return a;
    }
    if (row.kind === "directory") {
      const a = buildDirectorySearchAdapter(row);
      if (a) return a;
    }
  }
  return null;
}

/** Kontakt-Enrichment-Kaskade in Prioritaetsreihenfolge (klein = zuerst). */
export async function getContactCascade(): Promise<ContactAdapter[]> {
  const rows = (await loadActiveIntegrations()).sort(
    (a, b) => a.cascadePriority - b.cascadePriority,
  );
  const adapters: ContactAdapter[] = [];
  for (const row of rows) {
    let a: ContactAdapter | null = null;
    if (row.kind === "directory") a = buildDirectoryContactAdapter(row);
    else if (row.kind === "scraper") a = buildWebsiteScrapingAdapter(row);
    // contact_data (Unipile/Hunter): Anbindung folgt, sobald Zugaenge konfiguriert sind.
    if (a) adapters.push(a);
  }
  return adapters;
}
