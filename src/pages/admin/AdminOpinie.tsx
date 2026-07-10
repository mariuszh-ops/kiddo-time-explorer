import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, ExternalLink, RotateCcw, Star, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogClient } from "@/lib/catalogClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type Status = "pending" | "approved" | "rejected";

interface Review {
  id: string;
  place_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  text: string;
  status: string;
  created_at: string;
}

interface PlaceMeta {
  name: string;
  slug: string | null;
}

const TABS: { id: Status; label: string }[] = [
  { id: "pending", label: "Oczekujące" },
  { id: "approved", label: "Zatwierdzone" },
  { id: "rejected", label: "Odrzucone" },
];

const Stars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`Ocena ${rating}/5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
        )}
      />
    ))}
  </div>
);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const AdminOpinie = () => {
  const [sp, setSp] = useSearchParams();
  const status = (sp.get("s") as Status) || "pending";
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);

  const [rows, setRows] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Status, number | null>>({
    pending: null,
    approved: null,
    rejected: null,
  });
  const [places, setPlaces] = useState<Record<string, PlaceMeta>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setStatus = (s: Status) => {
    const next = new URLSearchParams(sp);
    next.set("s", s);
    next.delete("p");
    setSp(next, { replace: true });
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(sp);
    if (p <= 1) next.delete("p");
    else next.set("p", String(p));
    setSp(next, { replace: true });
  };

  const loadCounts = useCallback(async () => {
    const results = await Promise.all(
      TABS.map(async (t) => {
        const { count, error } = await supabase
          .from("user_reviews")
          .select("id", { count: "exact", head: true })
          .eq("status", t.id);
        return [t.id, error ? null : count ?? 0] as const;
      }),
    );
    setCounts(Object.fromEntries(results) as Record<Status, number | null>);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from("user_reviews")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      toast.error("Nie udało się pobrać opinii", { description: error.message });
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Review[];
    setRows(list);
    setTotal(count ?? 0);

    // Batch-fetch place meta for this page from the catalog project.
    const ids = Array.from(new Set(list.map((r) => r.place_id))).filter(Boolean);
    if (ids.length) {
      const { data: placeRows } = await catalogClient
        .from("public_activities")
        .select("place_id, name, slug")
        .in("place_id", ids);
      const map: Record<string, PlaceMeta> = {};
      (placeRows ?? []).forEach((p: { place_id: string; name: string; slug: string | null }) => {
        map[p.place_id] = { name: p.name, slug: p.slug };
      });
      setPlaces(map);
    } else {
      setPlaces({});
    }
    setLoading(false);
  }, [status, page]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const removeFromView = (ids: string[]) => {
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    setTotal((t) => Math.max(0, t - ids.length));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const setReviewStatus = async (ids: string[], newStatus: Status) => {
    if (!ids.length) return;
    const snapshot = rows.filter((r) => ids.includes(r.id));
    removeFromView(ids);
    const { error } = await supabase
      .from("user_reviews")
      .update({ status: newStatus })
      .in("id", ids);
    if (error) {
      toast.error("Nie udało się zapisać", { description: error.message });
      setRows((prev) => [...snapshot, ...prev]);
      setTotal((t) => t + snapshot.length);
      return;
    }
    toast.success(
      `${ids.length} ${ids.length === 1 ? "opinia" : "opinii"} → ${
        newStatus === "approved" ? "zatwierdzone" : newStatus === "rejected" ? "odrzucone" : "oczekujące"
      }`,
    );
    loadCounts();
  };

  const deleteReview = async (id: string) => {
    const snapshot = rows.find((r) => r.id === id);
    removeFromView([id]);
    const { error } = await supabase.from("user_reviews").delete().eq("id", id);
    if (error) {
      toast.error("Nie udało się usunąć", { description: error.message });
      if (snapshot) {
        setRows((prev) => [snapshot, ...prev]);
        setTotal((t) => t + 1);
      }
      return;
    }
    toast.success("Usunięto trwale");
    loadCounts();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const bulkIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => {
          const isActive = t.id === status;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setStatus(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm border transition-colors",
                isActive
                  ? "bg-primary/10 border-primary/40 text-primary font-medium"
                  : "bg-background border-border hover:bg-muted",
              )}
            >
              {t.label}
              <span className={cn("ml-2 text-xs tabular-nums", isActive ? "text-primary/80" : "text-muted-foreground")}>
                {count == null ? "…" : count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex flex-wrap items-center gap-2">
          <span className="text-sm mr-2">Zaznaczono: <strong>{selected.size}</strong></span>
          {status !== "approved" && (
            <Button size="sm" variant="outline" onClick={() => setReviewStatus(bulkIds, "approved")}>
              <Check className="w-4 h-4 mr-1" /> Zatwierdź
            </Button>
          )}
          {status !== "rejected" && (
            <Button size="sm" variant="outline" onClick={() => setReviewStatus(bulkIds, "rejected")}>
              <X className="w-4 h-4 mr-1" /> Odrzuć
            </Button>
          )}
          {status !== "pending" && (
            <Button size="sm" variant="outline" onClick={() => setReviewStatus(bulkIds, "pending")}>
              <RotateCcw className="w-4 h-4 mr-1" /> Cofnij do oczekujących
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Wyczyść
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground flex justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={rows.length > 0 && selected.size === rows.length}
              onCheckedChange={toggleSelectAll}
            />
            {loading ? "Ładowanie…" : `${total} ${total === 1 ? "opinia" : "opinii"}`}
          </label>
          <span>Strona {page} / {totalPages}</span>
        </div>

        {rows.length === 0 && !loading && (
          <div className="py-16 text-center text-muted-foreground">Brak opinii w tej kolejce</div>
        )}

        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const place = places[r.place_id];
            const publicHref = place?.slug ? `/atrakcje/${place.slug}` : null;
            return (
              <li key={r.id} className="p-4 flex gap-3">
                <div className="pt-1">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggleSelect(r.id)}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={r.rating} />
                    <span className="font-medium text-sm">{r.author_name}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Atrakcja:{" "}
                    {place ? (
                      publicHref ? (
                        <a
                          href={publicHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {place.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span>{place.name}</span>
                      )
                    ) : (
                      <span className="text-xs">(nieznana — {r.place_id})</span>
                    )}
                  </div>
                  {r.text && (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.text}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {status !== "approved" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewStatus([r.id], "approved")}>
                        <Check className="w-4 h-4 mr-1" /> Zatwierdź
                      </Button>
                    )}
                    {status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewStatus([r.id], "rejected")}>
                        <X className="w-4 h-4 mr-1" /> Odrzuć
                      </Button>
                    )}
                    {status !== "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewStatus([r.id], "pending")}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Cofnij
                      </Button>
                    )}
                    {status !== "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(r)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Usuń trwale
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-4 py-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {total > 0
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} z ${total}`
              : ""}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć opinię trwale?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Użyj tylko dla spamu — do zwykłego odrzucenia
              lepiej użyć „Odrzuć".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteReview(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Usuń trwale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOpinie;