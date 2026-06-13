/**
 * Laden & Rendern versionierter Prompts. Prompts werden NICHT hartkodiert,
 * sondern aus `prompt_versions` (genau eine aktive Version je Prompt) geladen,
 * sodass Aenderungen ohne Deployment moeglich sind.
 */
import { db } from "@/db";
import { promptVersions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type ActivePrompt = {
  systemText: string;
  userTemplate: string | null;
  modelParams: Record<string, unknown> | null;
};

/** Aktive Version eines Prompts laden. */
export async function loadActivePrompt(key: string): Promise<ActivePrompt> {
  const rows = await db
    .select()
    .from(promptVersions)
    .where(and(eq(promptVersions.promptKey, key), eq(promptVersions.active, true)))
    .limit(1);
  if (rows.length === 0) throw new Error(`Kein aktiver Prompt fuer '${key}'.`);
  const r = rows[0];
  return {
    systemText: r.systemText,
    userTemplate: r.userTemplate,
    modelParams: (r.modelParams as Record<string, unknown>) ?? null,
  };
}

/** Platzhalter {{name}} im Template durch Werte ersetzen (fehlende Werte werden leer). */
export function renderTemplate(template: string | null, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

/** Robustes JSON-Parsing fuer LLM-Antworten (Code-Fences entfernen, erstes JSON greifen). */
export function parseJsonLoose<T = unknown>(text: string): T {
  let s = text.trim();
  // ```json ... ``` oder ``` ... ``` entfernen
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Erstes {...} oder [...] herausschneiden, falls Begleittext vorhanden.
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start > 0) {
    const lastObj = s.lastIndexOf("}");
    const lastArr = s.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (end > start) s = s.slice(start, end + 1);
  }
  return JSON.parse(s) as T;
}
