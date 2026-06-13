/**
 * Such-Adapter fuer Serper (Google Search API). Aktivierung & Key kommen aus der
 * `integrations`-Tabelle (Key verschluesselt). Liefert die organischen Treffer als
 * Kandidaten zurueck — jeweils mit Quelle und Quell-URL (DSGVO Art. 14).
 */
import type { IntegrationRow } from "./registry";
import type { Candidate, SearchAdapter } from "./types";
import { decryptSecret } from "@/lib/crypto";

/** Grobe Zuordnung Region -> Serper-Laendercode (gl). Best effort, optional. */
function regionToGl(region?: string | null): string | undefined {
  if (!region) return undefined;
  const r = region.toLowerCase();
  const map: Record<string, string> = {
    deutschland: "de", germany: "de",
    österreich: "at", oesterreich: "at", austria: "at",
    schweiz: "ch", switzerland: "ch",
    frankreich: "fr", france: "fr",
    italien: "it", italy: "it",
    spanien: "es", spain: "es",
    usa: "us", "united states": "us",
    "united kingdom": "gb", uk: "gb", england: "gb",
  };
  for (const [name, gl] of Object.entries(map)) if (r.includes(name)) return gl;
  return undefined;
}

export function buildSerperAdapter(row: IntegrationRow): SearchAdapter | null {
  if (!row.active || !row.credentialsEncrypted) return null;
  let apiKey: string;
  try {
    const creds = JSON.parse(decryptSecret(row.credentialsEncrypted)) as { apiKey?: string };
    if (!creds.apiKey) return null;
    apiKey = creds.apiKey;
  } catch {
    return null;
  }
  const baseUrl = row.baseUrl ?? "https://google.serper.dev";

  return {
    key: "serper",
    async search(query, { limit, region }) {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/search`, {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          q: query,
          num: Math.min(Math.max(limit, 1), 20),
          ...(regionToGl(region) ? { gl: regionToGl(region) } : {}),
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Serper-Anfrage fehlgeschlagen (${res.status}).`);
      const data = (await res.json()) as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };
      const organic = data.organic ?? [];
      const candidates: Candidate[] = [];
      for (const o of organic) {
        if (!o.link) continue;
        let host = o.link;
        try {
          host = new URL(o.link).hostname.replace(/^www\./, "");
        } catch {
          /* Link nicht parsebar -> Rohwert behalten */
        }
        candidates.push({
          companyName: o.title?.trim() || host,
          companyUrl: o.link,
          snippet: o.snippet ?? null,
          source: "serper",
          sourceUrl: o.link,
        });
      }
      return candidates.slice(0, limit);
    },
  };
}
