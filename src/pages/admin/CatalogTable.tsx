import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Star,
} from "lucide-react";
import { catalogClient, ADMIN_COLUMNS, type CatalogRow } from "@/lib/catalogClient";
import { REGIONS } from "@/data/regions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminCatalogDrawer from "./AdminCatalogDrawer";

const PAGE_SIZE = 50;

// Postgrest query builder — kept as `any` because supabase-js does not export
// the intermediate builder type cleanly enough to share across callers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogQuery = any;

export interface CatalogTableProps {
  /** Apply filters + order to the base select query. Called for both the list
   *  and the count query (count adds { count: 'exact' } upstream). */
  buildQuery: (q: CatalogQuery) => CatalogQuery;
  /** Bumping this key triggers a refetch (put URL search string here). */
  reloadKey: string;
  /** Wolane po udanej zmianie `reviewed_at` — rodzic odswieza swoj licznik
   *  „Sprawdzone". Bez tego licznik rozjezdza sie z tabela az do F5. */
  onReviewedChange?: () => void;
}

const Thumb = ({ url, alt }: { url: string | null | undefined; alt: string }) => {
  if (!url) {
    return (
      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center text-muted-foreground text-lg shrink-0">
        ?
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="w-14 h-14 rounded object-cover bg-muted shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
};

const CatalogTable = ({ buildQuery, reloadKey, onReviewedChange }: CatalogTableProps) => {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);

  const setPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(sp);
      if (p <= 1) next.delete("p");
      else next.set("p", String(p));
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CatalogRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const requestIdRef = useRef(0);
  // Wiersz, z ktorego otwarto drawer — po zamknieciu wraca na niego fokus (K-14).
  const openerRef = useRef<HTMLTableRowElement | null>(null);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const base = catalogClient
      .from("public_activities")
      .select(ADMIN_COLUMNS, { count: "exact" })
      .range(from, to);
    const q = buildQuery(base).order("place_id", { ascending: true });

    const { data, error, count } = await q;
    if (requestId !== requestIdRef.current) return; // odrzuć wynik przestarzałego żądania

    if (error) {
      console.error(error.message);
      toast.error("Nie udało się pobrać danych", {
        description: "Brak uprawnień do tej operacji albo sesja wygasła — odśwież stronę i zaloguj się ponownie.",
      });
      setRows([]);
      setTotal(0);
    } else {
      setRows((data as CatalogRow[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [buildQuery, page]);

  // Refetch when reloadKey changes OR on page change. Zaznaczenie dotyczy
  // konkretnej strony wynikow, wiec przy zmianie strony/filtrow znika — ale po
  // akcji masowej ZOSTAJE (I-04), bo pasek akcji jest droga cofniecia.
  useEffect(() => {
    setSelected(new Set());
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, page]);

  // If reloadKey changed (filters changed), reset page to 1 without extra refetch.
  const prevReloadKeyRef = useRef(reloadKey);
  useEffect(() => {
    if (prevReloadKeyRef.current !== reloadKey) {
      prevReloadKeyRef.current = reloadKey;
      if (page !== 1) setPage(1);
    }
  }, [reloadKey, page, setPage]);

  const toggleHidden = async (row: CatalogRow) => {
    const next = !row.admin_hidden;
    setRows((prev) =>
      prev.map((r) => (r.place_id === row.place_id ? { ...r, admin_hidden: next } : r)),
    );
    const { error } = await catalogClient
      .from("public_activities")
      .update({ admin_hidden: next })
      .eq("place_id", row.place_id);
    if (error) {
      console.error(error.message);
      toast.error("Nie udało się zapisać", {
        description: "Brak uprawnień do tej operacji albo sesja wygasła — odśwież stronę i zaloguj się ponownie.",
      });
      setRows((prev) =>
        prev.map((r) => (r.place_id === row.place_id ? { ...r, admin_hidden: !next } : r)),
      );
    } else {
      toast.success(next ? "Ukryto" : "Pokazano");
    }
  };

  // Redakcyjny znacznik „karta sprawdzona". Ten sam wzorzec co toggleHidden:
  // optymistyczny zapis + rollback, bo admin klika seriami i czekanie na
  // odpowiedz przy kazdym wierszu rozbijaloby rytm przegladania.
  //
  // Znacznik stawiamy zegarem KLIENTA (jak `admin_notes.updated_at`
  // w AdminCatalogDrawer) — PostgREST nie umie wstawic serwerowego now()
  // w ciele UPDATE-a, a osobne RPC byloby tu wieksza powierzchnia niz zysk.
  // Skutek: przy rozjechanym zegarze admina data potrafi sie minac o minuty.
  const toggleReviewed = async (row: CatalogRow) => {
    const previous = row.reviewed_at ?? null;
    const next = previous ? null : new Date().toISOString();
    const set = (value: string | null) =>
      setRows((prev) =>
        prev.map((r) => (r.place_id === row.place_id ? { ...r, reviewed_at: value } : r)),
      );

    set(next);
    const { error } = await catalogClient
      .from("public_activities")
      .update({ reviewed_at: next })
      .eq("place_id", row.place_id);

    if (error) {
      console.error(error.message);
      toast.error("Nie udało się zapisać", {
        description: "Brak uprawnień do tej operacji albo sesja wygasła — odśwież stronę i zaloguj się ponownie.",
      });
      set(previous);
      return;
    }
    toast.success(next ? "Oznaczono jako odwiedzone" : "Zdjęto oznaczenie");
    onReviewedChange?.();
  };

  const bulkSetHidden = useCallback(
    async (hidden: boolean, idsArg?: string[]) => {
      const ids = idsArg ?? Array.from(selected);
      if (!ids.length) return;
      const { error } = await catalogClient
        .from("public_activities")
        .update({ admin_hidden: hidden })
        .in("place_id", ids);
      if (error) {
        console.error(error.message);
        toast.error("Akcja masowa nie powiodła się", {
          description: "Brak uprawnień do tej operacji albo sesja wygasła — odśwież stronę i zaloguj się ponownie.",
        });
        return;
      }
      // Zaznaczenie zostaje — pasek akcji jest droga powrotna (I-04).
      setSelected(new Set(ids));
      toast.success(`${hidden ? "Ukryto" : "Pokazano"} ${ids.length} pozycji`, {
        action: {
          label: "Cofnij",
          onClick: () => {
            void bulkSetHidden(!hidden, ids);
          },
        },
      });
      fetchData();
    },
    [selected, fetchData],
  );

  const toggleSelect = (place_id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(place_id)) next.delete(place_id);
      else next.add(place_id);
      return next;
    });
  };
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.place_id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.place_id)));
  };

  const openRow = (row: CatalogRow, el: HTMLTableRowElement | null) => {
    openerRef.current = el;
    setEditing(row);
  };

  const regionLabels = useMemo(
    () => Object.fromEntries(REGIONS.map((r) => [r.slug, r.label])),
    [],
  );

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex flex-wrap items-center gap-3">
          <span className="text-sm">Zaznaczono: <strong>{selected.size}</strong></span>
          <Button size="sm" variant="outline" className="tap44" onClick={() => bulkSetHidden(true)}>
            <EyeOff className="w-4 h-4 mr-1" /> Ukryj zaznaczone
          </Button>
          <Button size="sm" variant="outline" className="tap44" onClick={() => bulkSetHidden(false)}>
            <Eye className="w-4 h-4 mr-1" /> Pokaż zaznaczone
          </Button>
          <Button size="sm" variant="ghost" className="tap44" onClick={() => setSelected(new Set())}>
            Wyczyść zaznaczenie
          </Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground flex justify-between items-center">
          <span>{loading ? "Ładowanie…" : `${total} rekordów`}</span>
          <span>Strona {page} / {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-10">
                  <span className="sr-only">Zaznaczenie</span>
                  <Checkbox
                    className="tap44-cb"
                    aria-label="Zaznacz wszystkie na stronie"
                    checked={allOnPageSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead scope="col" className="w-20">Miniatura</TableHead>
                <TableHead scope="col">Nazwa</TableHead>
                <TableHead scope="col">Typ</TableHead>
                <TableHead scope="col">Województwo</TableHead>
                <TableHead scope="col">Ocena</TableHead>
                <TableHead scope="col">Wiek</TableHead>
                <TableHead scope="col">Stan</TableHead>
                <TableHead scope="col" className="w-52">Odwiedzone</TableHead>
                <TableHead scope="col" className="w-24">Widoczna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const locked = row.locked_fields ?? [];
                const age =
                  row.age_min != null && row.age_max != null
                    ? `${row.age_min}–${row.age_max}`
                    : "—";
                return (
                  <TableRow
                    key={row.place_id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    tabIndex={0}
                    aria-label={`Edytuj: ${row.name}`}
                    onClick={(e) => openRow(row, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openRow(row, e.currentTarget);
                      }
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        className="tap44-cb"
                        aria-label={`Zaznacz: ${row.name}`}
                        checked={selected.has(row.place_id)}
                        onCheckedChange={() => toggleSelect(row.place_id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Thumb url={row.image_url} alt={row.name} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.city ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{row.type}</TableCell>
                    <TableCell className="text-sm">
                      {row.region ? regionLabels[row.region] ?? row.region : "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {row.rating != null ? row.rating.toFixed(1) : "—"}{" "}
                      <span className="text-muted-foreground">({row.reviews_count ?? 0})</span>
                    </TableCell>
                    <TableCell className="text-sm">{age}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.admin_hidden && (
                          <Badge variant="secondary" className="bg-slate-200 text-slate-800">ukryta</Badge>
                        )}
                        {row.published === false && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">poza selekcją</Badge>
                        )}
                        {row.is_free && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">darmowa</Badge>
                        )}
                        {row.featured && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-0.5" />
                            <span className="sr-only">wyróżniona</span>
                          </Badge>
                        )}
                        {locked.length > 0 && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800" title={locked.join(", ")}>
                            <Lock className="w-3 h-3 mr-0.5" />{locked.length}
                          </Badge>
                        )}
                        {row.uncertain && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <HelpCircle className="w-3 h-3" />
                            <span className="sr-only">niepewna</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {row.reviewed_at ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {new Date(row.reviewed_at).toLocaleDateString("pl-PL")}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="tap44 h-8 px-2 text-xs"
                            aria-label={`Zdejmij oznaczenie „odwiedzone": ${row.name}`}
                            onClick={() => toggleReviewed(row)}
                          >
                            Cofnij
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="tap44 h-8 whitespace-nowrap text-xs"
                          aria-label={`Oznacz jako odwiedzone: ${row.name}`}
                          onClick={() => toggleReviewed(row)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          Oznacz jako odwiedzone
                        </Button>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        className="tap44-switch"
                        checked={!row.admin_hidden}
                        onCheckedChange={() => toggleHidden(row)}
                        aria-label={`Widoczna: ${row.name}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Brak rekordów
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {total > 0
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} z ${total}`
              : ""}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="tap44"
              aria-label="Poprzednia strona"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="tap44"
              aria-label="Następna strona"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AdminCatalogDrawer
        row={editing}
        onClose={() => setEditing(null)}
        onReturnFocus={() => openerRef.current?.focus()}
        onSaved={(updated) => {
          setRows((prev) => prev.map((r) => (r.place_id === updated.place_id ? updated : r)));
          setEditing(null);
          // Row may no longer match queue conditions — refetch to keep counts honest.
          fetchData();
        }}
      />
    </div>
  );
};

export default CatalogTable;
