"use client";
/**
 * Startet/ueberwacht die Such-Pipeline fuer eine Suche. Bei Status "queued" wird
 * automatisch gestartet; bei "running" kann aktualisiert, bei "failed" erneut
 * versucht werden. Nach Abschluss wird die Seite neu geladen, um die Ergebnisse
 * anzuzeigen.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Dict = Record<string, string>;
type Status = "queued" | "running" | "failed";

export default function SearchRunner({
  searchId,
  initialStatus,
  dict,
}: {
  searchId: number;
  initialStatus: Status;
  dict: Dict;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "running" | "error">(
    initialStatus === "queued" ? "running" : initialStatus === "failed" ? "error" : "idle",
  );
  const started = useRef(false);

  async function start() {
    setPhase("running");
    try {
      const res = await fetch(`/api/searches/${searchId}/run`, { method: "POST" });
      const data = (await res.json()) as { status?: string };
      if (data.status === "completed" || data.status === "failed") {
        router.refresh();
        if (data.status === "failed") setPhase("error");
      } else {
        router.refresh();
      }
    } catch {
      setPhase("error");
    }
  }

  useEffect(() => {
    if (initialStatus === "queued" && !started.current) {
      started.current = true;
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "running") {
    return (
      <div className="rounded border border-brand-blue/30 bg-brand-blue/5 px-4 py-3 text-sm text-neutral-700">
        {dict["search.run.starting"]}
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex items-center gap-3 rounded border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm">
        <span className="text-brand-red">{dict["search.run.failed"]}</span>
        <button
          onClick={() => void start()}
          className="rounded bg-brand-blue px-3 py-1 font-medium text-white hover:opacity-90"
        >
          {dict["search.run.retry"]}
        </button>
      </div>
    );
  }

  // idle (z. B. Status running aus einem anderen Lauf): manuelles Aktualisieren.
  return (
    <button
      onClick={() => router.refresh()}
      className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
    >
      {dict["search.run.refresh"]}
    </button>
  );
}
