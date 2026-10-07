import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catalogClient } from "@/lib/catalogClient";
import CatalogTable, { type CatalogQuery } from "./CatalogTable";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type QueueId =
  | "no-image"
  | "uncertain"
  | "no-desc"
  | "no-age"
  | "other-type"
  | "low-rating";

interface Queue {
  id: QueueId;
  label: string;
  /** Adds queue-specific filter to a query already scoped to
   *  published=true AND admin_hidden=false. */
  apply: (q: CatalogQuery) => CatalogQuery;
  /** Ordering applied to the list query (not the count). */
  order: (q: CatalogQuery) => CatalogQuery;
}

const QUEUES: Queue[] = [
  {
    id: "no-image",
    label: "Znak zapytania (bez zdjęcia)",
    apply: (q) => q.is("image_url", null),
    order: (q) => q.order("reviews_count", { ascending: false, nullsFirst: false }),
  },
  {
    id: "uncertain",
    label: "Niepewna klasyfikacja",
    apply: (q) => q.eq("uncertain", true),
    order: (q) =>
      q
        .order("confidence", { ascending: true, nullsFirst: false })
        .order("reviews_count", { ascending: false, nullsFirst: false }),
  },
  {
    id: "no-desc",
    label: "Bez opisu",
    apply: (q) => q.or("description.is.null,description.eq."),
    order: (q) => q.order("reviews_count", { ascending: false, nullsFirst: false }),
  },
  {
    id: "no-age",
    label: "Bez wieku",
    apply: (q) => q.is("age_min", null),
    order: (q) => q.order("reviews_count", { ascending: false, nullsFirst: false }),
  },
  {
    id: "other-type",
    label: "Typ „inne”",
    apply: (q) => q.eq("type", "inne"),
    order: (q) => q.order("reviews_count", { ascending: false, nullsFirst: false }),
  },
  {
    id: "low-rating",
    label: "Słabe oceny",
    apply: (q) => q.lt("rating", 4.2),
    order: (q) => q.order("rating", { ascending: true, nullsFirst: false }),
  },
];

const baseVisible = (q: CatalogQuery) =>
  q.eq("published", true).eq("admin_hidden", false);

/** Licznik, ktorego odczyt sie nie udal (GL-3-041). Brak klucza = jeszcze sie liczy („…"). */
const BLAD = "blad" as const;

const ZnacznikBledu = () => (
  <span className="text-destructive font-medium" data-licznik-blad title="Nie udało się policzyć">
    błąd
  </span>
);

const AdminDoPrzejrzenia = () => {
  const [sp, setSp] = useSearchParams();
  const active = (sp.get("q") as QueueId) || QUEUES[0].id;
  const [counts, setCounts] = useState<Record<string, number | typeof BLAD>>({});
  // Licznik „Sprawdzone": [ile ma reviewed_at, ile jest widocznych].
  // Obie liczby na TEJ SAMEJ populacji co kolejki wyzej (published
  // AND NOT admin_hidden) — mieszanie populacji w jednym boksie to dokladnie
  // blad, ktory ZA-I-08 znalazl w rpc/admin_stats (6086 vs widoczne).
  const [reviewed, setReviewed] = useState<[number, number] | typeof BLAD | null>(null);
  const [retrying, setRetrying] = useState(false);

  const setActive = (id: QueueId) => {
    const next = new URLSearchParams(sp);
    next.set("q", id);
    next.delete("p");
    setSp(next, { replace: true });
  };

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      QUEUES.map(async (queue) => {
        let q = catalogClient
          .from("public_activities")
          .select("place_id", { count: "exact", head: true });
        q = baseVisible(q);
        q = queue.apply(q);
        const { count, error } = await q;
        return [queue.id, error ? BLAD : count ?? 0] as const;
      }),
    );
    setCounts(Object.fromEntries(results));
  }, []);

  const loadReviewed = useCallback(async () => {
    const licz = async (only: boolean) => {
      let q = catalogClient
        .from("public_activities")
        .select("place_id", { count: "exact", head: true });
      q = baseVisible(q);
      if (only) q = q.not("reviewed_at", "is", null);
      const { count, error } = await q;
      return error ? null : count ?? 0;
    };
    const [sprawdzone, widoczne] = await Promise.all([licz(true), licz(false)]);
    setReviewed(sprawdzone == null || widoczne == null ? BLAD : [sprawdzone, widoczne]);
  }, []);

  // Ponowienie zostawia stare wartosci (takze „błąd") do konca odczytu — bez migania „…".
  const retryCounts = async () => {
    setRetrying(true);
    try {
      await Promise.all([loadCounts(), loadReviewed()]);
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    loadCounts();
    loadReviewed();
  }, [loadCounts, loadReviewed]);

  const queue = QUEUES.find((q) => q.id === active) ?? QUEUES[0];
  const countsFailed =
    reviewed === BLAD || Object.values(counts).some((c) => c === BLAD);

  const buildQuery = useCallback(
    (q: CatalogQuery) => {
      q = baseVisible(q);
      q = queue.apply(q);
      q = queue.order(q);
      return q;
    },
    [queue],
  );

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="text-xs text-muted-foreground">
            Kolejki liczone tylko po atrakcjach widocznych na froncie
            (opublikowane, nieukryte przez admina).
          </div>
          <div className="text-xs whitespace-nowrap">
            <span className="text-muted-foreground">Odwiedzone przez redakcję: </span>
            <strong className="tabular-nums">
              {reviewed == null ? "…" : reviewed === BLAD ? <ZnacznikBledu /> : `${reviewed[0]} z ${reviewed[1]}`}
            </strong>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUEUES.map((q) => {
            const isActive = q.id === active;
            const count = counts[q.id];
            return (
              <button
                key={q.id}
                onClick={() => setActive(q.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm border transition-colors",
                  isActive
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border hover:bg-muted",
                )}
              >
                {q.label}
                <span
                  className={cn(
                    "ml-2 text-xs tabular-nums",
                    isActive ? "text-primary/80" : "text-muted-foreground",
                  )}
                >
                  {count === undefined ? "…" : count === BLAD ? <ZnacznikBledu /> : count}
                </span>
              </button>
            );
          })}
        </div>
        {countsFailed && (
          <div
            role="alert"
            data-liczniki-blad
            className="mt-2 flex flex-wrap items-center gap-2 text-sm text-destructive"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Nie udało się pobrać liczników — „błąd” to nie zero.</span>
            <Button variant="outline" size="sm" className="tap44" onClick={retryCounts} disabled={retrying}>
              {retrying ? "Liczę…" : "Policz ponownie"}
            </Button>
          </div>
        )}
      </div>

      <CatalogTable
        buildQuery={buildQuery}
        reloadKey={active}
        onReviewedChange={loadReviewed}
      />
    </div>
  );
};

export default AdminDoPrzejrzenia;