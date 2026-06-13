/**
 * Kontakt-Adapter "eigenes Website-Scraping": laedt die Kandidaten-Website und
 * gaengige Kontaktseiten (Impressum/Kontakt) und extrahiert E-Mail/Telefon.
 *
 * Bewusst regex-basiert (kostenlos, keine LLM-Kosten pro Kandidat). Eine
 * praezisere LLM-Extraktion von Ansprechpartnern kann spaeter ergaenzt werden.
 */
import type { IntegrationRow } from "./registry";
import type { Contact, ContactAdapter } from "./types";
import { fetchHtml, htmlToText, normalizeUrl } from "@/lib/pipeline/scrape";

// Wenige, gaengige Pfade — die Laufzeit pro Kandidat bleibt damit beschraenkt.
const CONTACT_PATHS = ["", "/impressum", "/kontakt", "/contact"];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Telefon: internationale/nationale Schreibweisen, defensiv begrenzt.
const PHONE_RE = /(?:\+?\d{1,3}[\s/.-]?)?(?:\(?\d{2,5}\)?[\s/.-]?)\d{3,}[\s/.-]?\d{2,}/;

function extract(text: string): { email: string | null; phone: string | null } {
  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phoneRaw = text.match(PHONE_RE)?.[0] ?? null;
  const phone = phoneRaw && phoneRaw.replace(/\D/g, "").length >= 7 ? phoneRaw.trim() : null;
  return { email, phone };
}

export function buildWebsiteScrapingAdapter(row: IntegrationRow): ContactAdapter | null {
  if (!row.active) return null;
  return {
    key: "website_scraping",
    async enrich(candidate) {
      if (!candidate.companyUrl) return null;
      let origin: string;
      try {
        origin = new URL(normalizeUrl(candidate.companyUrl)).origin;
      } catch {
        return null;
      }
      for (const path of CONTACT_PATHS) {
        const url = origin + path;
        const html = await fetchHtml(url, 10000);
        if (!html) continue;
        const { email, phone } = extract(htmlToText(html));
        if (email || phone) {
          const contact: Contact = {
            email,
            phone,
            source: "website_scraping",
            sourceUrl: url,
          };
          return contact;
        }
      }
      return null;
    },
  };
}
