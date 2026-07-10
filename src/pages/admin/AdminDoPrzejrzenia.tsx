import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { catalogClient } from "@/lib/catalogClient";
import CatalogTable, { type CatalogQuery } from "./CatalogTable";
import { cn } from "@/lib/utils";

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

const AdminDoPrzejrzenia = () => {
  const [sp, setSp] = useSearchParams();
  const active = (sp.get("q") as QueueId) || QUEUES[0].id;
  const [counts, setCounts] = useState<Record<string, number | null>>({});

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
        return [queue.id, error ? null : count ?? 0] as const;
      }),
    );
    setCounts(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const queue = QUEUES.find((q) => q.id === active) ?? QUEUES[0];

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
        <div className="text-xs text-muted-foreground mb-2">
          Kolejki liczone tylko po atrakcjach widocznych na froncie
          (opublikowane, nieukryte przez admina).
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
                  {count == null ? "…" : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <CatalogTable buildQuery={buildQuery} reloadKey={active} />
    </div>
  );
};

export default AdminDoPrzejrzenia;