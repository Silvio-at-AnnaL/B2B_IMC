import { auth } from "@/auth";
import { db } from "@/db";
import { searches, searchResults } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadLabels, t } from "@/lib/i18n/labels";
import { getRequestLang } from "@/lib/i18n/lang";
import { getPlanLimits } from "@/lib/credits";
import SearchRunner from "./search-runner";

/** Detailansicht einer Suche: Status/Runner und — sobald abgeschlossen — die Ergebnisse. */
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
  if (s.userId !== userId && role !== "admin" && role !== "staff") notFound();

  const m = await loadLabels(await getRequestLang());
  const isStaff = role === "admin" || role === "staff";

  // Kontaktdaten-Sichtbarkeit nach Plan (Free-Tier: verpixelt/gesperrt).
  let includesContactData = true;
  if (s.customerId) {
    const limits = await getPlanLimits(s.customerId);
    includesContactData = limits ? limits.includesContactData : false;
  }

  const results =
    s.status === "completed"
      ? await db
          .select()
          .from(searchResults)
          .where(eq(searchResults.searchId, searchId))
          .orderBy(desc(searchResults.matchScore))
      : [];

  // Bekannte Fehlercodes auf Labels abbilden; sonst generische Meldung.
  const errorLabelKey =
    s.errorMessage === "INSUFFICIENT_CREDITS"
      ? "search.error.insufficientCredits"
      : s.errorMessage === "NO_SEARCH_ADAPTER"
        ? "search.error.noSearchAdapter"
        : null;

  return (
    <div className="max-w-3xl">
      <Link href="/account/searches" className="text-sm text-brand-blue hover:underline">
        ← {t(m, "search.list.title")}
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold">{s.companyName}</h1>

      <dl className="mb-6 grid grid-cols-[12rem_1fr] gap-y-2 text-sm">
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

      {/* Runner fuer offene/laufende/fehlgeschlagene Suchen */}
      {(s.status === "queued" || s.status === "running" || s.status === "failed") && (
        <div className="mb-6">
          <SearchRunner
            searchId={s.id}
            initialStatus={s.status}
            dict={{
              "search.run.starting": t(m, "search.run.starting"),
              "search.run.failed": t(m, "search.run.failed"),
              "search.run.retry": t(m, "search.run.retry"),
              "search.run.refresh": t(m, "search.run.refresh"),
            }}
          />
          {s.status === "failed" && errorLabelKey && (
            <p className="mt-2 text-sm text-brand-red">{t(m, errorLabelKey)}</p>
          )}
          {s.status === "failed" && isStaff && s.errorMessage && !errorLabelKey && (
            <p className="mt-2 text-xs text-neutral-500">{s.errorMessage}</p>
          )}
        </div>
      )}

      {/* Ergebnisse */}
      {s.status === "completed" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t(m, "results.title")}</h2>
          {results.length === 0 ? (
            <p className="text-neutral-600">{t(m, "results.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {results.map((r) => (
                <li key={r.id} className="rounded border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {r.companyUrl ? (
                          <a href={r.companyUrl} className="text-brand-blue hover:underline">
                            {r.companyName}
                          </a>
                        ) : (
                          r.companyName
                        )}
                      </div>
                      {r.matchReason && (
                        <p className="mt-1 text-sm text-neutral-600">{r.matchReason}</p>
                      )}
                    </div>
                    {r.matchScore !== null && (
                      <span className="shrink-0 rounded bg-brand-green/10 px-2 py-1 text-sm font-medium text-brand-green">
                        {t(m, "results.score")}: {r.matchScore}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 border-t border-neutral-100 pt-3 text-sm">
                    <span className="text-neutral-500">{t(m, "results.contact")}: </span>
                    {!includesContactData ? (
                      <span className="select-none italic text-neutral-400 blur-sm" aria-hidden>
                        kontakt@beispiel.de · +49 000 0000000
                      </span>
                    ) : r.contactEmail || r.contactPhone || r.contactName ? (
                      <span>
                        {[r.contactName, r.contactTitle].filter(Boolean).join(", ")}
                        {(r.contactName || r.contactTitle) && (r.contactEmail || r.contactPhone) ? " · " : ""}
                        {r.contactEmail}
                        {r.contactEmail && r.contactPhone ? " · " : ""}
                        {r.contactPhone}
                      </span>
                    ) : (
                      <span className="text-neutral-400">{t(m, "results.contact.none")}</span>
                    )}
                    {!includesContactData && (
                      <span className="ml-2 text-xs text-neutral-500">
                        {t(m, "results.contact.locked")}
                      </span>
                    )}
                  </div>

                  {/* DSGVO Art. 14: Herkunft jedes Datensatzes sichtbar machen. */}
                  <div className="mt-2 text-xs text-neutral-400">
                    {t(m, "results.source")}: {r.source}
                    {r.sourceUrl && (
                      <>
                        {" — "}
                        <a href={r.sourceUrl} className="hover:underline">
                          {r.sourceUrl}
                        </a>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
