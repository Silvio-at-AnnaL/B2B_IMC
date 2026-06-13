import { auth } from "@/auth";
import { db } from "@/db";
import { searches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { loadLabels, t } from "@/lib/i18n/labels";
import { getRequestLang } from "@/lib/i18n/lang";

/** Liste der eigenen Suchen mit Status und Link zur Detailansicht. */
export default async function SearchesListPage() {
  const session = await auth();
  const userId = Number((session?.user as any)?.id);
  const m = await loadLabels(await getRequestLang());

  const rows = Number.isFinite(userId)
    ? await db
        .select()
        .from(searches)
        .where(eq(searches.userId, userId))
        .orderBy(desc(searches.createdAt))
    : [];

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t(m, "search.list.title")}</h1>
        <Link
          href="/account/search"
          className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          {t(m, "search.list.new")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-neutral-600">{t(m, "search.list.empty")}</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/account/searches/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
              >
                <span>
                  <span className="font-medium">{s.companyName}</span>
                  <span className="text-neutral-500"> — {s.product}</span>
                </span>
                <span className="text-sm text-neutral-500">
                  {t(m, `search.status.${s.status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
