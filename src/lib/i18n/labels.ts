/**
 * Zentrale Labelverwaltung mit Multilang (Zusatzanweisung 5).
 *
 * Regeln:
 * 1. Jeder UI-Text laeuft ueber getLabel(key, lang) — keine hartkodierten Texte.
 * 2. Fallback-Kette: gewuenschte Sprache -> Englisch -> Label-Key sichtbar
 *    (fehlende Labels sollen auffallen, nicht stillschweigend verschwinden).
 * 3. Eine Sprache ist im Frontend waehlbar, sobald mindestens EIN Label
 *    in ihr uebersetzt ist (availableLanguages()).
 */
import { db } from "@/db";
import { labelTranslations, languages } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export const FALLBACK_LANG = "en";

/** Alle Labels einer Sprache inkl. EN-Fallback als Map laden. */
export async function loadLabels(lang: string): Promise<Record<string, string>> {
  const rows = await db
    .select({
      key: labelTranslations.labelKey,
      lang: labelTranslations.langCode,
      value: labelTranslations.value,
    })
    .from(labelTranslations)
    .where(inArray(labelTranslations.langCode, [lang, FALLBACK_LANG]));

  const map: Record<string, string> = {};
  // Erst Fallback fuellen, dann Zielsprache drueberschreiben.
  for (const r of rows) if (r.lang === FALLBACK_LANG) map[r.key] = r.value;
  if (lang !== FALLBACK_LANG) {
    for (const r of rows) if (r.lang === lang) map[r.key] = r.value;
  }
  return map;
}

export function t(map: Record<string, string>, key: string): string {
  return map[key] ?? key; // fehlendes Label bleibt sichtbar
}

/** Sprachen, die mindestens ein uebersetztes Label haben — steuert die Sprachauswahl im Frontend. */
export async function availableLanguages(): Promise<{ code: string; name: string }[]> {
  return db
    .selectDistinct({ code: languages.code, name: languages.name })
    .from(languages)
    .innerJoin(labelTranslations, eq(labelTranslations.langCode, languages.code))
    .where(eq(languages.active, true));
}
