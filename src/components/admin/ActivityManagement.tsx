import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Pencil,
  TableProperties,
  Search,
  RotateCcw,
  ImageOff,
  Clock,
  MapPin as MapPinIcon,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Activity, getActivities, setActivities, filterOptions, PRICE_LEVELS } from "@/data/activities";
import { AMENITIES } from "@/data/amenities";
import { toast } from "sonner";
import { getItem, setItem, removeItem, STORAGE_KEYS } from "@/lib/storage";

type AdminEdits = Record<number, Partial<Activity>>;

function loadEdits(): AdminEdits {
  return getItem<AdminEdits>(STORAGE_KEYS.ADMIN_EDITS, {});
}

function saveEdits(edits: AdminEdits) {
  setItem(STORAGE_KEYS.ADMIN_EDITS, edits);
}

const PAGE_SIZE = 25;

type SortKey = "title" | "city" | "rating" | "ageMin" | "priceLevel";
type SortDir = "asc" | "desc";

const cityLabel = (city: string) =>
  filterOptions.city.find((c) => c.value === city)?.label || city;
const typeLabel = (type: string) =>
  filterOptions.type.find((t) => t.value === type)?.label || type;

const ActivityManagement = () => {
  const [edits, setEditsState] = useState<AdminEdits>(loadEdits);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("city");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState<Partial<Activity>>({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const hasEdits = Object.keys(edits).length > 0;

  // Apply edits to activities
  const allActivities = useMemo(() => {
    return getActivities().map((a) => (edits[a.id] ? { ...a, ...edits[a.id] } : a));
  }, [edits]);

  // Filter
  const filtered = useMemo(() => {
    let result = allActivities;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.address || "").toLowerCase().includes(q)
      );
    }
    if (cityFilter !== "all") result = result.filter((a) => a.city === cityFilter);
    if (typeFilter !== "all") result = result.filter((a) => a.type === typeFilter);
    return result;
  }, [allActivities, debouncedSearch, cityFilter, typeFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: string | number = a[sortKey] ?? "";
      let vb: string | number = b[sortKey] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      // Secondary sort by title
      if (sortKey !== "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [debouncedSearch, cityFilter, typeFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  // Persist edits
  const updateEdits = useCallback((next: AdminEdits) => {
    setEditsState(next);
    saveEdits(next);
    // Update in-memory activities
    const base = getActivities();
    // We need original data — get from current minus old edits plus new edits
    // Simplification: just re-apply new edits
    setActivities(base.map((a) => (next[a.id] ? { ...a, ...next[a.id] } : a)));
  }, []);

  const handleExport = () => {
    const data = getActivities().map((a) => (edits[a.id] ? { ...a, ...edits[a.id] } : a));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activities.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!confirm("Na pewno chcesz zresetować wszystkie lokalne edycje?")) return;
    removeItem(STORAGE_KEYS.ADMIN_EDITS);
    setEditsState({});
    // Reload original
    window.location.reload();
  };

  // Edit modal
  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setEditForm({});
  };

  const currentEdit = editingActivity
    ? { ...editingActivity, ...editForm }
    : null;

  const handleEditField = (field: keyof Activity, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = () => {
    if (!editingActivity) return;
    const next = { ...edits };
    next[editingActivity.id] = { ...(next[editingActivity.id] || {}), ...editForm };
    updateEdits(next);
    setEditingActivity(null);
    setEditForm({});
    toast.success("Zmiany zapisane lokalnie. Kliknij 'Eksportuj JSON' aby opublikować.");
  };

  const handleResetSingle = () => {
    if (!editingActivity) return;
    if (!confirm("Przywrócić oryginalne dane tej atrakcji?")) return;
    const next = { ...edits };
    delete next[editingActivity.id];
    updateEdits(next);
    setEditingActivity(null);
    setEditForm({});
    toast("Przywrócono oryginalne dane");
  };

  return (
    <section>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TableProperties className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-serif text-foreground">Zarządzanie atrakcjami</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Przeglądaj, filtruj i edytuj wszystkie atrakcje w bazie.
        </p>
      </div>

      {/* Filters + stats bar */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie lub adresie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie miasta</SelectItem>
                {filterOptions.city.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                {filterOptions.type.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary" className="whitespace-nowrap">
              Wyświetlono {filtered.length} z {allActivities.length} atrakcji
            </Badge>
            <Button
              variant={hasEdits ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={handleExport}
            >
              <Download className="w-3.5 h-3.5" />
              Eksportuj JSON
            </Button>
            {hasEdits && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" />
                Resetuj zmiany
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Zdjęcie</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("title")}>
                  <span className="flex items-center">Nazwa<SortIcon col="title" /></span>
                </TableHead>
                <TableHead className="w-[120px] cursor-pointer select-none" onClick={() => toggleSort("city")}>
                  <span className="flex items-center">Miasto<SortIcon col="city" /></span>
                </TableHead>
                <TableHead className="w-[100px]">Kategoria</TableHead>
                <TableHead className="w-[80px] cursor-pointer select-none" onClick={() => toggleSort("rating")}>
                  <span className="flex items-center">Ocena<SortIcon col="rating" /></span>
                </TableHead>
                <TableHead className="w-[70px] cursor-pointer select-none" onClick={() => toggleSort("ageMin")}>
                  <span className="flex items-center">Wiek<SortIcon col="ageMin" /></span>
                </TableHead>
                <TableHead className="w-[80px] cursor-pointer select-none" onClick={() => toggleSort("priceLevel")}>
                  <span className="flex items-center">Cena<SortIcon col="priceLevel" /></span>
                </TableHead>
                <TableHead className="w-[60px]">Indoor</TableHead>
                <TableHead className="w-[80px]">Dane</TableHead>
                <TableHead className="w-[80px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((a) => {
                const isEdited = !!edits[a.id];
                return (
                  <TableRow
                    key={a.id}
                    className={isEdited ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}
                  >
                    <TableCell>
                      {a.imageUrl ? (
                        <img
                          src={a.imageUrl}
                          alt={a.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <ImageOff className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-left hover:underline"
                        onClick={() => openEdit(a)}
                      >
                        <span className="font-medium text-foreground">{a.title}</span>
                        {isEdited && (
                          <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                            Zmodyfikowane
                          </Badge>
                        )}
                      </button>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.slug}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{cityLabel(a.city)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{typeLabel(a.type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{a.rating}</span>
                        <span className="text-muted-foreground text-xs">({a.reviewCount})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{a.ageRange}</TableCell>
                    <TableCell>
                      {a.priceLevel !== undefined && (
                        <Badge variant="outline" className={`text-xs ${PRICE_LEVELS[a.priceLevel as keyof typeof PRICE_LEVELS]?.color || ""}`}>
                          {PRICE_LEVELS[a.priceLevel as keyof typeof PRICE_LEVELS]?.badge || "?"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {a.isIndoor ? "🏠" : "☀️"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <MapPinIcon className={`w-3.5 h-3.5 ${a.address ? "text-green-600" : "text-muted-foreground/40"}`} />
                        <Clock className={`w-3.5 h-3.5 ${a.openingHours ? "text-green-600" : "text-muted-foreground/40"}`} />
                        <FileText className={`w-3.5 h-3.5 ${a.experiencePoints?.length ? "text-green-600" : "text-muted-foreground/40"}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Strona {currentPage} z {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Poprzednia
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Następna
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => { if (!open) { setEditingActivity(null); setEditForm({}); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {currentEdit && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{currentEdit.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Basic info */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Podstawowe informacje</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nazwa atrakcji</Label>
                      <Input value={currentEdit.title} onChange={(e) => handleEditField("title", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Miasto</Label>
                      <Select value={currentEdit.city} onValueChange={(v) => handleEditField("city", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {filterOptions.city.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Kategoria</Label>
                      <Select value={currentEdit.type} onValueChange={(v) => handleEditField("type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {filterOptions.type.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Indoor / Outdoor</Label>
                      <RadioGroup
                        value={currentEdit.isIndoor ? "indoor" : "outdoor"}
                        onValueChange={(v) => handleEditField("isIndoor", v === "indoor")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="indoor" id="edit-indoor" />
                          <Label htmlFor="edit-indoor" className="text-sm font-normal cursor-pointer">Indoor</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="outdoor" id="edit-outdoor" />
                          <Label htmlFor="edit-outdoor" className="text-sm font-normal cursor-pointer">Outdoor</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center gap-2 col-span-full">
                      <Checkbox
                        checked={currentEdit.isEvent || false}
                        onCheckedChange={(c) => handleEditField("isEvent", !!c)}
                      />
                      <Label className="text-sm font-normal cursor-pointer">To jest wydarzenie</Label>
                    </div>
                    {currentEdit.isEvent && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Data wydarzenia</Label>
                        <Input type="date" value={currentEdit.eventDate || ""} onChange={(e) => handleEditField("eventDate", e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Age & price */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Wiek i cena</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Wiek (min – max)</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="number" min={0} max={18} value={currentEdit.ageMin} onChange={(e) => handleEditField("ageMin", Number(e.target.value))} className="w-20" />
                        <span className="text-muted-foreground">–</span>
                        <Input type="number" min={0} max={18} value={currentEdit.ageMax} onChange={(e) => handleEditField("ageMax", Number(e.target.value))} className="w-20" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Poziom cenowy</Label>
                      <RadioGroup
                        value={currentEdit.priceLevel !== undefined ? String(currentEdit.priceLevel) : ""}
                        onValueChange={(v) => handleEditField("priceLevel", Number(v))}
                        className="flex gap-3"
                      >
                        {[0, 1, 2, 3].map((p) => (
                          <div key={p} className="flex items-center gap-1.5">
                            <RadioGroupItem value={String(p)} id={`edit-price-${p}`} />
                            <Label htmlFor={`edit-price-${p}`} className="text-sm font-normal cursor-pointer">
                              {p === 0 ? "Bezpłatne" : "$".repeat(p)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="space-y-1.5 col-span-full">
                      <Label className="text-xs text-muted-foreground">Notatka cenowa</Label>
                      <Input value={currentEdit.priceNote || ""} onChange={(e) => handleEditField("priceNote", e.target.value)} placeholder="np. Dorośli: 40 zł, Dzieci: 20 zł" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Lokalizacja</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-full">
                      <Label className="text-xs text-muted-foreground">Adres</Label>
                      <Input value={currentEdit.address || ""} onChange={(e) => handleEditField("address", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Latitude</Label>
                      <Input type="number" step="any" value={currentEdit.latitude} onChange={(e) => handleEditField("latitude", Number(e.target.value))} className="opacity-70" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Longitude</Label>
                      <Input type="number" step="any" value={currentEdit.longitude} onChange={(e) => handleEditField("longitude", Number(e.target.value))} className="opacity-70" />
                    </div>
                    {currentEdit.latitude && currentEdit.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${currentEdit.latitude},${currentEdit.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline col-span-full"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Otwórz w Google Maps
                      </a>
                    )}
                  </div>
                </div>

                {/* Description / experience */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Opis i doświadczenie</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Punkty doświadczenia ("Co Was czeka")</Label>
                      <Textarea
                        value={(currentEdit.experiencePoints || []).join("\n")}
                        onChange={(e) => handleEditField("experiencePoints", e.target.value.split("\n").filter(Boolean))}
                        placeholder="Każda linia = osobny punkt"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">Każda linia = osobny punkt w sekcji "Co Was czeka".</p>
                    </div>
                  </div>
                </div>

                {/* Opening hours */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Godziny otwarcia</h3>
                  <div className="space-y-1.5">
                    <Textarea
                      value={currentEdit.openingHours || ""}
                      onChange={(e) => handleEditField("openingHours", e.target.value)}
                      placeholder="Poniedziałek: 9:00–17:00 | Wtorek: 9:00–17:00"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Format: Dzień: HH:MM–HH:MM | Dzień: HH:MM–HH:MM</p>
                  </div>
                </div>

                {/* Links */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Linki</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Strona www</Label>
                      <Input value={currentEdit.website || ""} onChange={(e) => handleEditField("website", e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Udogodnienia</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AMENITIES.map((am) => (
                      <div key={am.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={(currentEdit.amenities || []).includes(am.id)}
                          onCheckedChange={(checked) => {
                            const current = currentEdit.amenities || [];
                            const next = checked
                              ? [...current, am.id]
                              : current.filter((x) => x !== am.id);
                            handleEditField("amenities", next);
                          }}
                        />
                        <Label className="text-sm font-normal cursor-pointer">{am.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photos preview */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Zdjęcia (podgląd)</h3>
                  {currentEdit.imageUrls?.length ? (
                    <div className="flex gap-2 flex-wrap">
                      {currentEdit.imageUrls.slice(0, 4).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Brak zdjęć — dodaj imageUrls w pipeline eksportu</p>
                  )}
                </div>

                {/* Reviews preview */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Recenzje (podgląd)</h3>
                  {currentEdit.reviews?.length ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {currentEdit.reviews.length} recenzji, średnia {(currentEdit.reviews.reduce((s, r) => s + r.rating, 0) / currentEdit.reviews.length).toFixed(1)}/5
                      </p>
                      {currentEdit.reviews.slice(0, 3).map((r, i) => (
                        <div key={i} className="bg-muted rounded-lg p-2.5 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{r.author}</span>
                            <span className="text-xs text-muted-foreground">{r.rating}/5</span>
                          </div>
                          <p className="text-muted-foreground text-xs">{r.text.slice(0, 100)}{r.text.length > 100 ? "..." : ""}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Brak recenzji</p>
                  )}
                </div>
              </div>

              <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t border-border -mx-6 px-6 -mb-6 pb-6">
                <div className="flex w-full justify-between">
                  <Button variant="ghost" className="text-destructive" onClick={handleResetSingle}>
                    Resetuj do oryginału
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setEditingActivity(null); setEditForm({}); }}>
                      Anuluj
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      Zapisz zmiany
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ActivityManagement;
