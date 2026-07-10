import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  Star,
} from "lucide-react";
import { catalogClient, type CatalogRow } from "@/lib/catalogClient";
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

const CatalogTable = ({ buildQuery, reloadKey }: CatalogTableProps) => {
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);

  const setPage = (p: number) => {
    const next = new URLSearchParams(sp);
    if (p <= 1) next.delete("p");
    else next.set("p", String(p));
    setSp(next, { replace: true });
  };

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CatalogRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const base = catalogClient
      .from("public_activities")
      .select("*", { count: "exact" })
      .range(from, to);
    const q = buildQuery(base);

    const { data, error, count } = await q;
    if (error) {
      toast.error("Nie udało się pobrać danych", { description: error.message });
      setRows([]);
      setTotal(0);
    } else {
      setRows((data as CatalogRow[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [buildQuery, page]);

  // Refetch when reloadKey changes OR on page change.
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, page]);

  // If reloadKey changed (filters changed), reset page to 1 without extra refetch.
  useEffect(() => {
    if (page !== 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

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
      toast.error("Nie udało się zapisać", { description: error.message });
      setRows((prev) =>
        prev.map((r) => (r.place_id === row.place_id ? { ...r, admin_hidden: !next } : r)),
      );
    } else {
      toast.success(next ? "Ukryto" : "Pokazano");
    }
  };

  const bulkSetHidden = async (hidden: boolean) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await catalogClient
      .from("public_activities")
      .update({ admin_hidden: hidden })
      .in("place_id", ids);
    if (error) {
      toast.error("Akcja masowa nie powiodła się", { description: error.message });
    } else {
      toast.success(`${hidden ? "Ukryto" : "Pokazano"} ${ids.length} pozycji`);
      fetchData();
    }
  };

  const toggleSelect = (place_id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(place_id)) next.delete(place_id);
      else next.add(place_id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.place_id)));
  };

  const regionLabels = useMemo(
    () => Object.fromEntries(REGIONS.map((r) => [r.slug, r.label])),
    [],
  );

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-3">
          <span className="text-sm">Zaznaczono: <strong>{selected.size}</strong></span>
          <Button size="sm" variant="outline" onClick={() => bulkSetHidden(true)}>
            <EyeOff className="w-4 h-4 mr-1" /> Ukryj zaznaczone
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkSetHidden(false)}>
            <Eye className="w-4 h-4 mr-1" /> Pokaż zaznaczone
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
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
                <TableHead className="w-10">
                  <Checkbox
                    checked={rows.length > 0 && selected.size === rows.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-20">Miniatura</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Województwo</TableHead>
                <TableHead>Ocena</TableHead>
                <TableHead>Wiek</TableHead>
                <TableHead>Stan</TableHead>
                <TableHead className="w-24">Widoczna</TableHead>
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
                    className="cursor-pointer"
                    onClick={() => setEditing(row)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
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
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={!row.admin_hidden}
                        onCheckedChange={() => toggleHidden(row)}
                        aria-label="Widoczna"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
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
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
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