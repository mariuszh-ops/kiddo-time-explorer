import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { REGIONS } from "@/data/regions";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CatalogTable, { type CatalogQuery } from "./CatalogTable";

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

const AdminKatalog = () => {
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
    setSp(params, { replace: true });
  };

  const buildQuery = useCallback(
    (q: CatalogQuery) => {
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
      return q;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.q, state.region, state.type, state.visibility, state.free,
      state.uncertain, state.featured, state.hasImage, state.sort,
    ],
  );

  // Refetch key — any change here forces CatalogTable to refetch + reset page.
  const reloadKey = JSON.stringify(state);

  return (
    <div className="space-y-4">
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
                onChange={(e) => update({ q: e.target.value })}
                placeholder="np. Zoo Warszawa"
                className="pl-8"
              />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground block mb-1">Województwo</label>
            <Select
              value={state.region || "all"}
              onValueChange={(v) => update({ region: v === "all" ? "" : v })}
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
              onValueChange={(v) => update({ type: v === "all" ? "" : v })}
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
              onValueChange={(v) => update({ visibility: v as Visibility })}
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
              onValueChange={(v) => update({ hasImage: v as HasImage })}
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
            <Select value={state.sort} onValueChange={(v) => update({ sort: v as SortKey })}>
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
            <Checkbox checked={state.free} onCheckedChange={(c) => update({ free: c === true })} />
            Tylko darmowe
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={state.uncertain} onCheckedChange={(c) => update({ uncertain: c === true })} />
            Tylko niepewne
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={state.featured} onCheckedChange={(c) => update({ featured: c === true })} />
            Tylko wyróżnione
          </label>
        </div>
      </div>

      <CatalogTable buildQuery={buildQuery} reloadKey={reloadKey} />
    </div>
  );
};

export default AdminKatalog;