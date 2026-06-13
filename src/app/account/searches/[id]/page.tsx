import { auth } from "@/auth";
import { db } from "@/db";
import { searches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadLabels, t } from "@/lib/i18n/labels";
import { getRequestLang } from "@/lib/i18n/lang";

/** Detailansicht einer Suche. Ergebnisse erscheinen, sobald die Pipeline gelaufen ist. */
export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const searchId = Number(id);
  const session = await auth();
  const userId = Number((session?.user as any)?.id);
  const role = (session?.user as any)?.role;
  if (!session || !Number.isFinite(searchId)) notFound();

  const rows = await db.select().from(searches).where(eq(searches.id, searchId)).limit(1);
  const s = rows[0];
  if (!s) notFound();
  // Zugriff: Eigentuemer oder admin/staff.
  if (s.userId !== userId && role !== "admin" && role !== "staff") notFound();

  const m = await loadLabels(await getRequestLang());

  return (
    <div className="max-w-2xl">
      <Link href="/account/searches" className="text-sm text-brand-blue hover:underline">
        ← {t(m, "search.list.title")}
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold">{s.companyName}</h1>

      <dl className="grid grid-cols-[12rem_1fr] gap-y-2 text-sm">
        <dt className="text-neutral-500">{t(m, "search.field.mode")}</dt>
        <dd>{t(m, s.mode === "seller" ? "search.mode.seller" : "search.mode.buyer")}</dd>

        <dt className="text-neutral-500">{t(m, "search.field.product")}</dt>
        <dd>{s.product}</dd>

        <dt className="text-neutral-500">{t(m, "search.field.region")}</dt>
        <dd>{s.targetRegion}</dd>

        {s.companyUrl && (
          <>
            <dt className="text-neutral-500">{t(m, "search.field.url")}</dt>
            <dd>
              <a href={s.companyUrl} className="text-brand-blue hover:underline">
                {s.companyUrl}
              </a>
            </dd>
          </>
        )}

        <dt className="text-neutral-500">{t(m, "search.status")}</dt>
        <dd>{t(m, `search.status.${s.status}`)}</dd>
      </dl>

      <p className="mt-6 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
        {t(m, "search.detail.pipelineNote")}
      </p>
    </div>
  );
}
