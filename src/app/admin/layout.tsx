import Link from "next/link";

/** Admin-Navigationsgeruest. Jede Sektion erhaelt in den Folgephasen eigene CRUD-Seiten. */
const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/customers", "Kunden (CRM)"],
  ["/admin/contracts", "Verträge & Pläne"],
  ["/admin/invoices", "Rechnungen & Zahlungen"],
  ["/admin/users", "Benutzer"],
  ["/admin/searches", "Suchen & Monitoring"],
  ["/admin/prompts", "Prompts"],
  ["/admin/llm", "LLM-Provider"],
  ["/admin/integrations", "Schnittstellen & Mail"],
  ["/admin/labels", "Labels & Sprachen"],
  ["/admin/seo", "SEO / robots.txt / llms.txt"],
  ["/admin/audit", "Audit-Log"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4">
        <div className="mb-6 font-bold">ANNA-lyst Admin</div>
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
