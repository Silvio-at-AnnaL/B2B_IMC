import Link from "next/link";

/** Kundenbackend (Zusatzanweisung 2): Status, Vertrag, Zahlungen, Suchen. */
const NAV = [
  ["/account", "Übersicht"],
  ["/account/searches", "Meine Suchen"],
  ["/account/favorites", "Favoriten"],
  ["/account/contract", "Vertrag & Upgrade"],
  ["/account/invoices", "Rechnungen & Zahlungen"],
  ["/account/profile", "Profil & Kontakte"],
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4">
        <div className="mb-6 font-bold">Mein Bereich</div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded px-2 py-1.5 hover:bg-neutral-200">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
