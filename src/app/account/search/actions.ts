"use server";
/**
 * Suche anlegen. Schreibt einen Datensatz mit Status "queued"; die Such-Pipeline
 * (URL-Scraping, Prompt-Chain, Quellen-Adapter, Scoring, Credit-Buchung) ist der
 * naechste Phase-1-Schritt und verarbeitet diese Warteschlange.
 */
import { auth } from "@/auth";
import { db } from "@/db";
import { searches, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getRequestLang } from "@/lib/i18n/lang";

export type SearchState = { error?: string };

export async function createSearchAction(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const session = await auth();
  const userId = Number((session?.user as any)?.id);
  if (!session || !Number.isFinite(userId)) return { error: "search.error.session" };

  const mode = String(formData.get("mode") ?? "");
  if (mode !== "seller" && mode !== "buyer") return { error: "search.error.mode" };

  const companyName = String(formData.get("companyName") ?? "").trim();
  const companyUrl = String(formData.get("companyUrl") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  const targetRegion = String(formData.get("targetRegion") ?? "").trim();
  if (!companyName || !product || !targetRegion) return { error: "search.error.required" };

  // Kundenzuordnung des Nutzers (admin/staff koennen ohne Kunde suchen).
  const rows = await db
    .select({ customerId: users.customerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const customerId = rows[0]?.customerId ?? null;

  // Zielsprache der LLM-Ausgaben folgt der Frontend-Sprache (searches.output_lang).
  const outputLang = await getRequestLang();

  const inserted = await db
    .insert(searches)
    .values({
      userId,
      customerId,
      mode: mode as "seller" | "buyer",
      companyName,
      companyUrl: companyUrl || null,
      product,
      targetRegion,
      outputLang,
      status: "queued",
    })
    .returning({ id: searches.id });

  redirect(`/account/searches/${inserted[0].id}`);
}
