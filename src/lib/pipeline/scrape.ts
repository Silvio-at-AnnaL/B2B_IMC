/**
 * Leichtgewichtiges Website-Scraping: HTML laden und in reinen Text umwandeln.
 * Genutzt fuer das Profil der Nutzer-Firma (Prompt-Chain Schritt 1) und fuer die
 * Kontakt-Enrichment-Kaskade (Impressum/Team/Kontakt der Kandidaten).
 */

const USER_AGENT = "ANNA-lyst-Bot/0.1 (+https://anna-lyst.com)";

/** URL normalisieren: fehlendes Schema als https ergaenzen. */
export function normalizeUrl(url: string): string {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

/** HTML grob in lesbaren Text umwandeln (Skripte/Styles raus, Tags entfernen, Whitespace glaetten). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n")
    .trim();
}

/** Eine Seite laden und ihren HTML-Inhalt zurueckgeben (mit Timeout). null bei Fehler. */
export async function fetchHtml(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await fetch(normalizeUrl(url), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && ct !== "") return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Sichtbaren Text einer Seite laden, auf maxChars begrenzt. */
export async function scrapeText(url: string, maxChars = 8000): Promise<string> {
  const html = await fetchHtml(url);
  if (!html) return "";
  return htmlToText(html).slice(0, maxChars);
}
