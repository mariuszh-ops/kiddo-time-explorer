import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  ExternalLink,
  Mail,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogClient, type CatalogRow } from "@/lib/catalogClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import AdminCatalogDrawer from "./AdminCatalogDrawer";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type Status = "nowe" | "w-toku" | "zalatwione" | "odrzucone";
type Category = "zamkniete" | "nieaktualne-dane" | "zle-zdjecie" | "inne";

interface Report {
  id: string;
  place_id: string;
  category: string;
  message: string;
  contact_email: string | null;
  status: string;
  created_at: string;
}

interface PlaceMeta {
  name: string;
  slug: string | null;
}

const TABS: { id: Status; label: string }[] = [
  { id: "nowe", label: "Nowe" },
  { id: "w-toku", label: "W toku" },
  { id: "zalatwione", label: "Załatwione" },
  { id: "odrzucone", label: "Odrzucone" },
];

const CATEGORY_META: Record<Category, { label: string; className: string }> = {
  "zamkniete": { label: "Obiekt zamknięty", className: "bg-red-100 text-red-800" },
  "nieaktualne-dane": { label: "Nieaktualne dane", className: "bg-amber-100 text-amber-800" },
  "zle-zdjecie": { label: "Złe zdjęcie", className: "bg-blue-100 text-blue-800" },
  "inne": { label: "Inne", className: "bg-slate-200 text-slate-800" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const AdminZgloszenia = () => {
  const [sp, setSp] = useSearchParams();
  const status = (sp.get("s") as Status) || "nowe";
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);

  const [rows, setRows] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Status, number | null>>({
    "nowe": null,
    "w-toku": null,
    "zalatwione": null,
    "odrzucone": null,
  });
  const [places, setPlaces] = useState<Record<string, PlaceMeta>>({});
  const [editingRow, setEditingRow] = useState<CatalogRow | null>(null);
  const [loadingEditPlace, setLoadingEditPlace] = useState<string | null>(null);
  const [confirmHide, setConfirmHide] = useState<Report | null>(null);

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
          .from("issue_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", t.id);
        return [t.id, error ? null : count ?? 0] as const;
      }),
    );
    setCounts(Object.fromEntries(results) as Record<Status, number | null>);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from("issue_reports")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) {
      toast.error("Nie udało się pobrać zgłoszeń", { description: error.message });
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Report[];
    setRows(list);
    setTotal(count ?? 0);

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

  const removeFromView = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const setReportStatus = async (r: Report, newStatus: Status) => {
    removeFromView(r.id);
    const { error } = await supabase
      .from("issue_reports")
      .update({ status: newStatus })
      .eq("id", r.id);
    if (error) {
      toast.error("Nie udało się zapisać", { description: error.message });
      setRows((prev) => [r, ...prev]);
      setTotal((t) => t + 1);
      return;
    }
    toast.success(`Zgłoszenie → ${TABS.find((t) => t.id === newStatus)?.label ?? newStatus}`);
    loadCounts();
  };

  const openEditPlace = async (placeId: string) => {
    setLoadingEditPlace(placeId);
    const { data, error } = await catalogClient
      .from("public_activities")
      .select("*")
      .eq("place_id", placeId)
      .maybeSingle();
    setLoadingEditPlace(null);
    if (error || !data) {
      toast.error("Nie znaleziono atrakcji w katalogu");
      return;
    }
    setEditingRow(data as CatalogRow);
  };

  const hideActivity = async (r: Report) => {
    const { error } = await catalogClient
      .from("public_activities")
      .update({ admin_hidden: true })
      .eq("place_id", r.place_id);
    if (error) {
      toast.error("Nie udało się ukryć", { description: error.message });
      return;
    }
    toast.success("Atrakcja ukryta");
    // Auto-mark this report as handled
    setReportStatus(r, "zalatwione");
  };

  const nowLoading = loading && rows.length === 0;

  return (
    <div className="space-y-4">
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

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground flex justify-between items-center">
          <span>{nowLoading ? "Ładowanie…" : `${total} ${total === 1 ? "zgłoszenie" : "zgłoszeń"}`}</span>
          <span>Strona {page} / {totalPages}</span>
        </div>

        {rows.length === 0 && !loading && (
          <div className="py-16 text-center text-muted-foreground">Brak zgłoszeń w tej kolejce</div>
        )}

        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const meta = CATEGORY_META[r.category as Category] ?? CATEGORY_META.inne;
            const place = places[r.place_id];
            const publicHref = place?.slug ? `/atrakcje/${place.slug}` : null;
            return (
              <li key={r.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary" className={meta.className}>{meta.label}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                  {r.contact_email && (
                    <a
                      href={`mailto:${r.contact_email}`}
                      className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      <Mail className="w-3 h-3" />
                      {r.contact_email}
                    </a>
                  )}
                </div>

                <p className="text-sm whitespace-pre-wrap leading-relaxed">{r.message}</p>

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

                <div className="flex flex-wrap gap-2 pt-1">
                  {status !== "w-toku" && (
                    <Button size="sm" variant="outline" onClick={() => setReportStatus(r, "w-toku")}>
                      W toku
                    </Button>
                  )}
                  {status !== "zalatwione" && (
                    <Button size="sm" variant="outline" onClick={() => setReportStatus(r, "zalatwione")}>
                      <Check className="w-4 h-4 mr-1" /> Załatwione
                    </Button>
                  )}
                  {status !== "odrzucone" && (
                    <Button size="sm" variant="outline" onClick={() => setReportStatus(r, "odrzucone")}>
                      <X className="w-4 h-4 mr-1" /> Odrzuć
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditPlace(r.place_id)}
                    disabled={loadingEditPlace === r.place_id}
                  >
                    {loadingEditPlace === r.place_id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Pencil className="w-4 h-4 mr-1" />
                    )}
                    Edytuj w Katalogu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmHide(r)}
                  >
                    <EyeOff className="w-4 h-4 mr-1" /> Ukryj atrakcję
                  </Button>
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

      <AdminCatalogDrawer
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSaved={() => setEditingRow(null)}
      />

      <AlertDialog open={!!confirmHide} onOpenChange={(open) => !open && setConfirmHide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ukryć tę atrakcję na froncie?</AlertDialogTitle>
            <AlertDialogDescription>
              Karta zniknie z listingów i wyszukiwarki (RLS). Zgłoszenie zostanie
              automatycznie oznaczone jako „Załatwione". Możesz cofnąć ukrycie
              w zakładce Katalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmHide) hideActivity(confirmHide);
                setConfirmHide(null);
              }}
            >
              Ukryj atrakcję
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminZgloszenia;