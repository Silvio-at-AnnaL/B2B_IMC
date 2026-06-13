/**
 * Credits sind ein Buchungsjournal (`credit_ledger`), kein mutierter Zaehler.
 * Der Kontostand ist die Summe aller Buchungen. Eine Suche kostet SEARCH_COST
 * Credits und wird als negative Buchung erfasst.
 */
import { db } from "@/db";
import { creditLedger, contracts, plans } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const SEARCH_COST = 1;

/** Aktueller Kontostand eines Kunden (Summe aller Ledger-Buchungen). */
export async function getCreditBalance(customerId: number): Promise<number> {
  const rows = await db
    .select({ sum: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.customerId, customerId));
  return Number(rows[0]?.sum ?? 0);
}

export type PlanLimits = {
  resultsPerSearch: number;
  includesContactData: boolean;
};

/** Limits aus dem aktiven Vertragsplan eines Kunden; null wenn kein aktiver Vertrag. */
export async function getPlanLimits(customerId: number): Promise<PlanLimits | null> {
  const rows = await db
    .select({
      resultsPerSearch: plans.resultsPerSearch,
      includesContactData: plans.includesContactData,
    })
    .from(contracts)
    .innerJoin(plans, eq(contracts.planId, plans.id))
    .where(and(eq(contracts.customerId, customerId), eq(contracts.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}
