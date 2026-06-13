/**
 * Pipeline-Runner — DB-gestuetzter Job ueber `searches.status` + `pipeline_state`.
 *
 * Ablauf (siehe CLAUDE.md):
 *   0. URL-Scraping der Nutzer-Firma
 *   1.-3. Versionierte Prompt-Chain (Kontext -> Strategie -> Scoring), aus der DB
 *   4. Quellen-Adapter (Serper + Website-Scraping; Verzeichnisse als Stubs)
 *   5. Kontakt-Enrichment-Kaskade, Ergebnisse -> search_results (mit Quelle/Quell-URL)
 *   6. Credit-Abbuchung als Ledger-Buchung
 *
 * LLM-Aufrufe gehen ueber den aktiven llm_providers-Eintrag (Key entschluesselt).
 * Fehler setzen status=failed mit errorMessage; der Job ist ueber den Status
 * beobachtbar und (bei failed/queued) erneut startbar.
 */
import { db } from "@/db";
import { searches, searchResults, creditLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getActiveLlmProvider, chat, type LlmProvider } from "@/lib/llm/client";
import { loadActivePrompt, renderTemplate, parseJsonLoose } from "@/lib/llm/prompts";
import { scrapeText } from "./scrape";
import { getSearchAdapter, getContactCascade } from "@/lib/integrations/registry";
import type { Candidate } from "@/lib/integrations/types";
import { getCreditBalance, getPlanLimits, SEARCH_COST } from "@/lib/credits";

const DEFAULT_RESULT_LIMIT = 10;

type SearchRow = typeof searches.$inferSelect;

type PipelineState = {
  step: string;
  scrapedChars?: number;
  candidateCount?: number;
  resultCount?: number;
  note?: string;
};

async function setState(id: number, state: PipelineState): Promise<void> {
  await db.update(searches).set({ pipelineState: state }).where(eq(searches.id, id));
}

function numParam(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/** Einen Prompt-Schritt ausfuehren (System + gerendertes User-Template). */
async function runPromptStep(
  provider: LlmProvider,
  key: string,
  vars: Record<string, string>,
): Promise<string> {
  const p = await loadActivePrompt(key);
  const mp = p.modelParams ?? {};
  return chat(provider, {
    system: p.systemText,
    user: renderTemplate(p.userTemplate, vars),
    maxTokens: numParam(mp.max_tokens),
    temperature: numParam(mp.temperature),
  });
}

/**
 * Suchbegriffe aus der (frei strukturierten) Strategie-JSON ziehen: bevorzugt
 * bekannte Schluessel, sonst das erste String-Array im Objekt. Robust gegen
 * uneinheitliche Feldnamen der LLM-Ausgabe.
 */
function extractSearchTerms(raw: string): string[] {
  let obj: Record<string, unknown>;
  try {
    obj = parseJsonLoose<Record<string, unknown>>(raw);
  } catch {
    return [];
  }
  const known = ["search_terms", "suchbegriffe", "keywords", "queries"];
  for (const k of known) {
    const v = obj[k];
    if (Array.isArray(v)) {
      const strs = v.filter((x): x is string => typeof x === "string");
      if (strs.length) return strs;
    }
  }
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) {
      const strs = v.filter((x): x is string => typeof x === "string");
      if (strs.length) return strs;
    }
  }
  return [];
}

type ScoreEntry = { id?: number; score?: number; match_score?: number; reason?: string; match_reason?: string };

/** Scoring-Ausgabe robust auf die Kandidatenliste abbilden (per id, sonst nach Reihenfolge). */
function mergeScores(
  candidates: Candidate[],
  scored: ScoreEntry[],
): Array<{ candidate: Candidate; score: number | null; reason: string | null }> {
  return candidates.map((candidate, i) => {
    const entry =
      scored.find((s) => typeof s.id === "number" && s.id === i) ?? scored[i] ?? {};
    const rawScore = entry.score ?? entry.match_score;
    const score = typeof rawScore === "number" ? Math.max(0, Math.min(100, Math.round(rawScore))) : null;
    const reason = entry.reason ?? entry.match_reason ?? null;
    return { candidate, score, reason };
  });
}

/**
 * Eine Suche ausfuehren. Idempotent: laeuft nur, wenn der Status queued oder failed
 * ist (Schutz vor Doppelausfuehrung). Wirft nicht — Fehler landen in errorMessage.
 */
export async function runSearch(searchId: number): Promise<{ status: SearchRow["status"] }> {
  const rows = await db.select().from(searches).where(eq(searches.id, searchId)).limit(1);
  const search = rows[0];
  if (!search) throw new Error(`Suche ${searchId} nicht gefunden.`);
  if (search.status === "running" || search.status === "completed") {
    return { status: search.status };
  }

  await db.update(searches).set({ status: "running", errorMessage: null }).where(eq(searches.id, searchId));

  try {
    // --- Limits & Credits ---
    let resultLimit = DEFAULT_RESULT_LIMIT;
    let includesContactData = true;
    if (search.customerId) {
      const limits = await getPlanLimits(search.customerId);
      if (limits) {
        resultLimit = limits.resultsPerSearch;
        includesContactData = limits.includesContactData;
      } else {
        // Kunde ohne aktiven Vertrag -> wie Free behandeln.
        resultLimit = 5;
        includesContactData = false;
      }
      const balance = await getCreditBalance(search.customerId);
      if (balance < SEARCH_COST) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
    }

    // --- Schritt 0: Website der Nutzer-Firma scrapen ---
    await setState(searchId, { step: "scraping" });
    let scraped = "";
    if (search.companyUrl) scraped = await scrapeText(search.companyUrl);
    const scrapedText = scraped || `Unternehmen: ${search.companyName}. Produkt: ${search.product}.`;

    const provider = await getActiveLlmProvider();

    // --- Schritt 1: Unternehmenskontext extrahieren ---
    await setState(searchId, { step: "context", scrapedChars: scraped.length });
    const profileRaw = await runPromptStep(provider, "context_extraction", {
      scraped_text: scrapedText,
    });

    // --- Schritt 2: Suchstrategie ableiten ---
    await setState(searchId, { step: "strategy", scrapedChars: scraped.length });
    const strategyRaw = await runPromptStep(provider, "search_strategy", {
      company_profile_json: profileRaw,
      mode: search.mode,
      product: search.product,
      target_region: search.targetRegion,
    });

    // Suchbegriffe aus der Strategie ziehen; Fallback: Produkt + Region.
    let query = `${search.product} ${search.targetRegion}`;
    const terms = extractSearchTerms(strategyRaw);
    if (terms.length) query = terms.slice(0, 6).join(" ");

    // --- Schritt 4: Kandidaten ueber Such-Adapter ---
    await setState(searchId, { step: "search" });
    const searchAdapter = await getSearchAdapter();
    if (!searchAdapter) {
      throw new Error("NO_SEARCH_ADAPTER");
    }
    const candidates = await searchAdapter.search(query, {
      limit: resultLimit,
      region: search.targetRegion,
    });

    if (candidates.length === 0) {
      await setState(searchId, { step: "done", candidateCount: 0, resultCount: 0 });
      await finalize(search, 0);
      return { status: "completed" };
    }

    // --- Schritt 3: Scoring der Kandidaten (ein Aufruf ueber alle) ---
    await setState(searchId, { step: "scoring", candidateCount: candidates.length });
    const candidatesForLlm = candidates.map((c, i) => ({
      id: i,
      name: c.companyName,
      url: c.companyUrl,
      snippet: c.snippet,
    }));
    let scored: ScoreEntry[] = [];
    try {
      const scoringRaw = await runPromptStep(provider, "scoring", {
        candidates_json: JSON.stringify(candidatesForLlm),
        output_lang: search.outputLang,
      });
      const parsed = parseJsonLoose<unknown>(scoringRaw);
      if (Array.isArray(parsed)) scored = parsed as ScoreEntry[];
    } catch {
      /* Scoring nicht parsebar -> Kandidaten ohne Score uebernehmen */
    }
    const merged = mergeScores(candidates, scored);

    // --- Schritt 5: Kontakt-Enrichment (nur wenn der Plan Kontaktdaten umfasst) ---
    await setState(searchId, { step: "enrich", candidateCount: candidates.length });
    const cascade = includesContactData ? await getContactCascade() : [];

    for (const { candidate, score, reason } of merged) {
      let contact = null as Awaited<ReturnType<(typeof cascade)[number]["enrich"]>> | null;
      for (const adapter of cascade) {
        contact = await adapter.enrich(candidate);
        if (contact && (contact.email || contact.phone)) break; // Kaskade bricht ab, sobald Kontakt steht
      }
      await db.insert(searchResults).values({
        searchId,
        companyName: candidate.companyName,
        companyUrl: candidate.companyUrl ?? null,
        country: candidate.country ?? null,
        contactName: contact?.name ?? null,
        contactTitle: contact?.title ?? null,
        contactEmail: contact?.email ?? null,
        contactPhone: contact?.phone ?? null,
        matchScore: score,
        matchReason: reason,
        // DSGVO Art. 14: Quelle ist Pflicht. Kontaktquelle hat Vorrang, sonst die Fundquelle.
        source: contact?.source ?? candidate.source,
        sourceUrl: contact?.sourceUrl ?? candidate.sourceUrl ?? null,
        raw: { candidate, score, reason, contact },
      });
    }

    await setState(searchId, { step: "done", candidateCount: candidates.length, resultCount: merged.length });
    await finalize(search, merged.length);
    return { status: "completed" };
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    await db
      .update(searches)
      .set({ status: "failed", errorMessage: code })
      .where(eq(searches.id, searchId));
    return { status: "failed" };
  }
}

/** Abschluss: Credit-Abbuchung als Ledger-Buchung (nur Kunden) und Status completed. */
async function finalize(search: SearchRow, _resultCount: number): Promise<void> {
  if (search.customerId) {
    await db.insert(creditLedger).values({
      customerId: search.customerId,
      delta: -SEARCH_COST,
      reason: "search",
      searchId: search.id,
      createdByUserId: search.userId,
    });
  }
  await db
    .update(searches)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(searches.id, search.id));
}
