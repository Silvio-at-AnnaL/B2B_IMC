/**
 * Verzeichnis-Adapter (diribo, IndustryStock, wlw) — Stubs mit klarem Interface.
 *
 * Bekannter Blocker (siehe CLAUDE.md): Endpunkt-Dokumentation und Keys kommen vom
 * Betreiber. Bis dahin keine erfundenen Endpunkte/Felder. Die Adapter bleiben
 * inaktiv; sobald Zugangsdaten vorliegen, wird hier die echte Anbindung ergaenzt
 * und ueber `integrations.active` + `cascade_priority` eingebunden.
 */
import type { IntegrationRow } from "./registry";
import type { ContactAdapter, SearchAdapter } from "./types";

/** Verzeichnis als Such-Adapter (Kandidaten-Suche). Noch nicht implementiert. */
export function buildDirectorySearchAdapter(row: IntegrationRow): SearchAdapter | null {
  // Inaktiv lassen, bis die jeweilige API dokumentiert/freigeschaltet ist.
  void row;
  return null;
}

/** Verzeichnis als Kontakt-Adapter (Enrichment). Noch nicht implementiert. */
export function buildDirectoryContactAdapter(row: IntegrationRow): ContactAdapter | null {
  void row;
  return null;
}
