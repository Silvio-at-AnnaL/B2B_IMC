/**
 * Aufloesung der aktuellen Frontend-Sprache fuer Server Components & Actions.
 *
 * Eine Sprache wird im Frontend waehlbar, sobald mindestens ein Label in ihr
 * existiert (siehe labels.ts / availableLanguages). Die konkrete Sprachauswahl
 * im UI folgt in der Design-Phase; bis dahin steuert ein optionales `lang`-Cookie
 * die Sprache, mit Default Deutsch.
 */
import { cookies } from "next/headers";
import { loadLabels } from "./labels";

export const DEFAULT_LANG = "de";

/** Aktuelle Sprache aus dem `lang`-Cookie, sonst Default (de). */
export async function getRequestLang(): Promise<string> {
  const store = await cookies();
  const c = store.get("lang")?.value;
  return c && /^[a-z]{2}$/.test(c) ? c : DEFAULT_LANG;
}

/** Labels fuer die aktuelle Anfragesprache als Map laden (inkl. EN-Fallback). */
export async function getDict(): Promise<Record<string, string>> {
  return loadLabels(await getRequestLang());
}
