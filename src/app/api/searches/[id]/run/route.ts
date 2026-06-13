/**
 * Pipeline-Trigger fuer eine Suche. Die eigentliche Arbeit (Scraping, Prompt-Chain,
 * Adapter, Scoring) laeuft serverseitig im Node-Runtime; das Ergebnis landet in der DB.
 * Zugriff: Eigentuemer der Suche oder admin/staff.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { searches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runSearch } from "@/lib/pipeline/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = Number((session?.user as any)?.id);
  const role = (session?.user as any)?.role;
  if (!session || !Number.isFinite(userId)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const searchId = Number(id);
  if (!Number.isFinite(searchId)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const rows = await db.select().from(searches).where(eq(searches.id, searchId)).limit(1);
  const s = rows[0];
  if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (s.userId !== userId && role !== "admin" && role !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await runSearch(searchId);
  return NextResponse.json(result);
}
