/**
 * Landing Page — Platzhalter.
 * Die eigentliche Gestaltung (CI: Gruen #428A44, Blau #1D71B8, Orange #EB9234,
 * Rot #D94235, Grau #878787) erfolgt in der Design-Phase. Alle Texte laufen
 * dann ueber die Labelverwaltung (src/lib/i18n/labels.ts).
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">
        <span className="text-brand-green">A</span>
        <span className="text-brand-blue">N</span>
        <span className="text-brand-orange">N</span>
        <span className="text-brand-red">A</span>
        <span className="text-brand-gray">-lyst</span>
      </h1>
      <p className="text-neutral-600">
        B2B Industrial Matchmaking — Scaffold v0.1. Landing, Suche und Design folgen in Phase 1.
      </p>
    </main>
  );
}
