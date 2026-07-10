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
  Search,
  Star,
} from "lucide-react";
import { catalogClient, type CatalogRow } from "@/lib/catalogClient";
import { REGIONS } from "@/data/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const TYPES = [
  "sala-zabaw",
  "plac-zabaw",
  "sport",
  "muzeum-teatr",
  "park-rozrywki",
  "centra-rozrywki",
  "zoo",
  "park",
  "inne",
];

type Visibility = "visible" | "hidden" | "unpublished" | "all";
type HasImage = "all" | "yes" | "no";
type SortKey = "rating" | "reviews_count" | "updated_at" | "name";

const SORTS: { key: SortKey; label: string; asc: boolean }[] = [
  { key: "rating", label: "Ocena", asc: false },
  { key: "reviews_count", label: "Liczba opinii", asc: false },
  { key: "updated_at", label: "Ostatnia zmiana", asc: false },
  { key: "name", label: "Nazwa (A→Z)", asc: true },
];

const useUrlState = () => {
  const [sp, setSp] = useSearchParams();
  const state = {
    q: sp.get("q") ?? "",
    region: sp.get("region") ?? "",
    type: sp.get("type") ?? "",
    visibility: (sp.get("v") as Visibility) || "visible",
    free: sp.get("free") === "1",
    uncertain: sp.get("unc") === "1",
    featured: sp.get("feat") === "1",
    hasImage: (sp.get("img") as HasImage) || "all",
    sort: (sp.get("sort") as SortKey) || "updated_at",
    page: Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1),
  };
  const update = (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.region) params.set("region", next.region);
    if (next.type) params.set("type", next.type);
    if (next.visibility !== "visible") params.set("v", next.visibility);
    if (next.free) params.set("free", "1");
    if (next.uncertain) params.set("unc", "1");
    if (next.featured) params.set("feat", "1");
    if (next.hasImage !== "all") params.set("img", next.hasImage);
    if (next.sort !== "updated_at") params.set("sort", next.sort);
    // Reset page unless explicitly changed
    const resetPage = "page" in patch ? false : Object.keys(patch).length > 0;
    if (!resetPage && next.page > 1) params.set("p", String(next.page));
    setSp(params, { replace: true });
  };
  return [state, update] as const;
};

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

const AdminKatalog = () => {
  const [state, update] = useUrlState();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CatalogRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const from = (state.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = catalogClient
      .from("public_activities")
      .select("*", { count: "exact" })
      .range(from, to);

    // Visibility
    if (state.visibility === "visible") {
      q = q.eq("admin_hidden", false).eq("published", true);
    } else if (state.visibility === "hidden") {
      q = q.eq("admin_hidden", true);
    } else if (state.visibility === "unpublished") {
      q = q.eq("published", false);
    }

    if (state.region) q = q.eq("region", state.region);
    if (state.type) q = q.eq("type", state.type);
    if (state.free) q = q.eq("is_free", true);
    if (state.uncertain) q = q.eq("uncertain", true);
    if (state.featured) q = q.eq("featured", true);
    if (state.hasImage === "yes") q = q.not("image_url", "is", null);
    if (state.hasImage === "no") q = q.is("image_url", null);
    if (state.q.trim()) {
      const s = state.q.trim().replace(/[%,()]/g, "");
      q = q.or(`name.ilike.%${s}%,city.ilike.%${s}%`);
    }

    const sortDef = SORTS.find((s) => s.key === state.sort) ?? SORTS[2];
    q = q.order(sortDef.key, { ascending: sortDef.asc, nullsFirst: false });

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
  }, [state]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleHidden = async (row: CatalogRow) => {
    const next = !row.admin_hidden;
    // Optimistic
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
      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs text-muted-foreground block mb-1">
              Szukaj (nazwa / miasto)
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={state.q}
                onChange={(e) => update({ q: e.target.value, page: 1 })}
                placeholder="np. Zoo Warszawa"
                className="pl-8"
              />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground block mb-1">Województwo</label>
            <Select
              value={state.region || "all"}
              onValueChange={(v) => update({ region: v === "all" ? "" : v, page: 1 })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {REGIONS.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground block mb-1">Typ</label>
            <Select
              value={state.type || "all"}
              onValueChange={(v) => update({ type: v === "all" ? "" : v, page: 1 })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground block mb-1">Widoczność</label>
            <Select
              value={state.visibility}
              onValueChange={(v) => update({ visibility: v as Visibility, page: 1 })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Widoczne</SelectItem>
                <SelectItem value="hidden">Ukryte przez admina</SelectItem>
                <SelectItem value="unpublished">Poza selekcją</SelectItem>
                <SelectItem value="all">Wszystkie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground block mb-1">Zdjęcie</label>
            <Select
              value={state.hasImage}
              onValueChange={(v) => update({ hasImage: v as HasImage, page: 1 })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="yes">Tak (rzeczywiste)</SelectItem>
                <SelectItem value="no">Nie (placeholder)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground block mb-1">Sortuj</label>
            <Select value={state.sort} onValueChange={(v) => update({ sort: v as SortKey, page: 1 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={state.free}
              onCheckedChange={(c) => update({ free: c === true, page: 1 })}
            />
            Tylko darmowe
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={state.uncertain}
              onCheckedChange={(c) => update({ uncertain: c === true, page: 1 })}
            />
            Tylko niepewne
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={state.featured}
              onCheckedChange={(c) => update({ featured: c === true, page: 1 })}
            />
            Tylko wyróżnione
          </label>
        </div>
      </div>

      {/* Bulk action bar */}
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

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm text-muted-foreground flex justify-between items-center">
          <span>{loading ? "Ładowanie…" : `${total} rekordów`}</span>
          <span>Strona {state.page} / {totalPages}</span>
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
                    Brak rekordów pasujących do filtrów
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {total > 0
              ? `${(state.page - 1) * PAGE_SIZE + 1}–${Math.min(state.page * PAGE_SIZE, total)} z ${total}`
              : ""}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={state.page <= 1}
              onClick={() => update({ page: state.page - 1 })}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={state.page >= totalPages}
              onClick={() => update({ page: state.page + 1 })}
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
        }}
      />
    </div>
  );
};

export default AdminKatalog;