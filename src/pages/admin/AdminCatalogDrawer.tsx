import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, MapPin, X, Save, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { catalogClient, ADMIN_COLUMNS, FEATURED_UI_ENABLED, type CatalogRow } from "@/lib/catalogClient";

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

const PHONE_MAX = 20;
const DESCRIPTION_MAX = 2000;

// Fields whose changes ARE added to locked_fields on save.
const TRACKED_FIELDS = [
  "name",
  "type",
  "city",
  "address",
  "description",
  "price_note",
  "phone",
  "website",
  "opening_hours",
  "image_url",
  "age_min",
  "age_max",
  "is_free",
  "good_for_children",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

interface EditForm {
  name: string;
  type: string;
  city: string;
  address: string;
  description: string;
  price_note: string;
  phone: string;
  website: string;
  opening_hours: string;
  image_url: string;
  age_min: string;
  age_max: string;
  is_free: boolean;
  good_for_children: boolean;
  admin_hidden: boolean;
  featured: boolean;
}

const toForm = (row: CatalogRow): EditForm => ({
  name: row.name ?? "",
  type: row.type ?? "",
  city: row.city ?? "",
  address: row.address ?? "",
  description: row.description ?? "",
  price_note: row.price_note ?? "",
  phone: row.phone ?? "",
  website: row.website ?? "",
  opening_hours: row.opening_hours ?? "",
  image_url: row.image_url ?? "",
  age_min: row.age_min != null ? String(row.age_min) : "",
  age_max: row.age_max != null ? String(row.age_max) : "",
  is_free: row.is_free === true,
  good_for_children: row.good_for_children === true,
  admin_hidden: row.admin_hidden === true,
  featured: row.featured === true,
});

const parseAge = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(16, n));
};

// "zoo.pl" bez protokolu ladowalo na karcie jako link WZGLEDNY (N-09).
// Zwraca { value, error } — value to postac zapisywana do bazy.
const normalizeWebsite = (raw: string): { value: string; error?: string } => {
  const v = raw.trim();
  if (!v) return { value: "" };
  if (/^https?:\/\//i.test(v)) return { value: v };
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) {
    return { value: v, error: "Dozwolone są tylko adresy http:// i https://" };
  }
  if (!/\.[a-z]{2,}/i.test(v)) {
    return { value: v, error: "Adres musi zawierać domenę, np. https://zoo.pl" };
  }
  return { value: `https://${v}` };
};

// Compare a tracked form field to its original row value.
const changedFields = (row: CatalogRow, form: EditForm): TrackedField[] => {
  const original: Record<TrackedField, unknown> = {
    name: row.name ?? "",
    type: row.type ?? "",
    city: row.city ?? "",
    address: row.address ?? "",
    description: row.description ?? "",
    price_note: row.price_note ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    opening_hours: row.opening_hours ?? "",
    image_url: row.image_url ?? "",
    age_min: row.age_min ?? null,
    age_max: row.age_max ?? null,
    is_free: row.is_free === true,
    good_for_children: row.good_for_children === true,
  };
  const next: Record<TrackedField, unknown> = {
    name: form.name,
    type: form.type,
    city: form.city,
    address: form.address,
    description: form.description,
    price_note: form.price_note,
    phone: form.phone,
    website: form.website,
    opening_hours: form.opening_hours,
    image_url: form.image_url,
    age_min: parseAge(form.age_min),
    age_max: parseAge(form.age_max),
    is_free: form.is_free,
    good_for_children: form.good_for_children,
  };
  return TRACKED_FIELDS.filter((f) => original[f] !== next[f]);
};

// Wartosc pola tak, jak trafia do PATCH-a.
const dbValue = (form: EditForm, f: TrackedField): unknown => {
  switch (f) {
    case "name":
      return form.name;
    case "type":
      return form.type;
    case "age_min":
      return parseAge(form.age_min);
    case "age_max":
      return parseAge(form.age_max);
    case "is_free":
      return form.is_free;
    case "good_for_children":
      return form.good_for_children;
    default:
      return form[f] || null;
  }
};

interface Props {
  row: CatalogRow | null;
  onClose: () => void;
  onSaved: (updated: CatalogRow) => void;
  /** Po zamknieciu drawera fokus wraca na wiersz, z ktorego go otwarto (K-14). */
  onReturnFocus?: () => void;
}

const AdminCatalogDrawer = ({ row, onClose, onSaved, onReturnFocus }: Props) => {
  const [form, setForm] = useState<EditForm | null>(null);
  const [locked, setLocked] = useState<string[]>([]);
  // Pola odblokowane RECZNIE w tej sesji drawera nie wracaja do locked_fields,
  // nawet gdy ich wartosc sie zmienila (N-08).
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [originalNote, setOriginalNote] = useState("");
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Skorygowany wiek trzeba potwierdzic drugim klikiem — pierwsze „Zapisz"
  // pokazuje poprawke i NIC nie wysyla (N-09). Ref, a nie stan, zeby nie
  // zalezec od kolejnosci blur -> click.
  const pendingFixRef = useRef(false);

  useEffect(() => {
    setErrors({});
    setUnlocked(new Set());
    pendingFixRef.current = false;
    if (!row) {
      setForm(null);
      setLocked([]);
      setNote("");
      setOriginalNote("");
      setNoteLoaded(false);
      return;
    }
    setForm(toForm(row));
    setLocked(row.locked_fields ?? []);
    setNoteLoaded(false);
    setNote("");
    setOriginalNote("");
    (async () => {
      const { data } = await catalogClient
        .from("admin_notes")
        .select("note")
        .eq("place_id", row.place_id)
        .maybeSingle();
      const existing = (data as { note?: string } | null)?.note ?? "";
      setNote(existing);
      setOriginalNote(existing);
      setNoteLoaded(true);
    })();
  }, [row]);

  if (!row || !form) {
    return (
      <Sheet open={false} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const setField = <K extends keyof EditForm>(k: K, v: EditForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
    if (k === "age_min" || k === "age_max") pendingFixRef.current = false;
    setErrors((prev) => {
      if (!prev[k as string]) return prev;
      const next = { ...prev };
      delete next[k as string];
      return next;
    });
  };

  const removeLock = (field: string) => {
    setLocked((prev) => prev.filter((f) => f !== field));
    setUnlocked((prev) => new Set(prev).add(field));
  };

  // Clamp wieku przy opuszczeniu pola + komunikat (K-14 / N-09).
  const blurAge = (k: "age_min" | "age_max") => {
    const raw = (form?.[k] ?? "").trim();
    if (!raw) return;
    const clamped = parseAge(raw);
    const asText = clamped != null ? String(clamped) : "";
    if (asText !== raw) {
      setForm((prev) => (prev ? { ...prev, [k]: asText } : prev));
      setErrors((prev) => ({
        ...prev,
        [k]: clamped == null ? "Podaj liczbę 0–16" : `Zakres 0–16 — poprawiono na ${clamped}`,
      }));
      pendingFixRef.current = true;
    }
  };

  const handleSave = async () => {
    if (!form) return;

    // 1. Walidacja + normalizacja. Poprawki widac w formularzu PRZED zapisem.
    const fixed: EditForm = { ...form };
    const nextErrors: Record<string, string> = {};
    let stop = false;

    for (const k of ["age_min", "age_max"] as const) {
      const raw = form[k].trim();
      if (!raw) continue;
      const clamped = parseAge(raw);
      const asText = clamped != null ? String(clamped) : "";
      if (asText !== raw) {
        fixed[k] = asText;
        nextErrors[k] = clamped == null ? "Podaj liczbę 0–16" : `Zakres 0–16 — poprawiono na ${clamped}`;
        stop = true;
      }
    }
    if (!stop) {
      const a = parseAge(fixed.age_min);
      const b = parseAge(fixed.age_max);
      if (a != null && b != null && a > b) {
        nextErrors.age_max = "Wiek „od” nie może być większy niż „do”";
        stop = true;
      }
    }

    const www = normalizeWebsite(form.website);
    if (www.error) {
      nextErrors.website = www.error;
      stop = true;
    } else {
      fixed.website = www.value;
    }

    if (fixed.phone.trim().length > PHONE_MAX) {
      nextErrors.phone = `Maksymalnie ${PHONE_MAX} znaków`;
      stop = true;
    }
    if (fixed.description.length > DESCRIPTION_MAX) {
      nextErrors.description = `Maksymalnie ${DESCRIPTION_MAX} znaków`;
      stop = true;
    }

    setForm(fixed);
    if (stop) {
      setErrors(nextErrors);
      pendingFixRef.current = false;
      toast.error("Popraw zaznaczone pola", { description: "Nic nie zostało zapisane." });
      return;
    }
    // komunikat spod pola wieku zostaje widoczny — dopiero drugi klik zapisuje
    if (pendingFixRef.current) {
      // wiek zostal poprawiony przy opuszczeniu pola — pokazujemy korekte i czekamy
      pendingFixRef.current = false;
      toast.error("Sprawdź poprawiony wiek", {
        description: "Wartość skorygowano do zakresu 0–16. Nic nie zapisano — kliknij „Zapisz” jeszcze raz.",
      });
      return;
    }
    setErrors({});

    // 2. Co faktycznie zmieniono (N-07: bez zmian = zero żądań).
    const changed = changedFields(row, fixed);
    const nextLocked = Array.from(
      new Set([...locked, ...changed.filter((f) => !unlocked.has(f))]),
    );
    const prevLocked = row.locked_fields ?? [];
    const locksChanged =
      nextLocked.length !== prevLocked.length || nextLocked.some((f) => !prevLocked.includes(f));

    const patch: Record<string, unknown> = {};
    for (const f of changed) patch[f] = dbValue(fixed, f);
    if (fixed.admin_hidden !== (row.admin_hidden === true)) patch.admin_hidden = fixed.admin_hidden;
    if (fixed.featured !== (row.featured === true)) patch.featured = fixed.featured;
    if (locksChanged) patch.locked_fields = nextLocked;

    const noteChanged = noteLoaded && note !== originalNote;

    if (Object.keys(patch).length === 0 && !noteChanged) {
      toast("Brak zmian", { description: "Nic nie wysłano do bazy." });
      return;
    }

    setSaving(true);

    let saved: CatalogRow | null = null;
    if (Object.keys(patch).length > 0) {
      const { data, error } = await catalogClient
        .from("public_activities")
        .update(patch)
        .eq("place_id", row.place_id)
        .select(ADMIN_COLUMNS)
        .maybeSingle();

      if (error) {
        toast.error("Nie udało się zapisać", { description: error.message });
        setSaving(false);
        return;
      }
      saved = (data as unknown as CatalogRow) ?? null;
    }

    // 3. Notatka — upsert tylko gdy naprawdę się zmieniła (N-07).
    if (noteChanged) {
      const { error: noteError } = await catalogClient
        .from("admin_notes")
        .upsert(
          { place_id: row.place_id, note, updated_at: new Date().toISOString() },
          { onConflict: "place_id" },
        );
      if (noteError) {
        toast.error("Zapisano rekord, ale notatka się nie udała", {
          description: noteError.message,
        });
      }
    }

    toast.success("Zapisano zmiany");
    setSaving(false);
    onSaved(saved ?? { ...row, ...patch });
  };

  const publicUrl = `/atrakcje/${row.slug}`;
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${row.place_id}`;

  const fieldError = (k: string) =>
    errors[k] ? (
      <p id={`dr-${k}-err`} role="alert" className="text-xs text-destructive mt-1">
        {errors[k]}
      </p>
    ) : null;

  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-full sm:max-w-2xl overflow-y-auto"
        onCloseAutoFocus={(e) => {
          if (!onReturnFocus) return;
          e.preventDefault();
          onReturnFocus();
        }}
      >
        <SheetHeader>
          <SheetTitle>{row.name}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-3 text-xs">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              <ExternalLink className="w-3 h-3" /> Zobacz na stronie
            </a>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              <MapPin className="w-3 h-3" /> Google Maps
            </a>
            <span className="text-muted-foreground">place_id: {row.place_id}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="dr-name" className="text-xs">Nazwa</Label>
              <Input
                id="dr-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dr-type" className="text-xs">Typ</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger id="dr-type" aria-label="Typ" className="tap44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dr-city" className="text-xs">Miasto</Label>
              <Input
                id="dr-city"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="dr-address" className="text-xs">Adres</Label>
              <Input
                id="dr-address"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="dr-description" className="text-xs">Opis</Label>
              <Textarea
                id="dr-description"
                rows={4}
                maxLength={DESCRIPTION_MAX}
                aria-describedby="dr-description-count"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
              <p id="dr-description-count" className="text-xs text-muted-foreground mt-1">
                {form.description.length} / {DESCRIPTION_MAX} znaków
              </p>
              {fieldError("description")}
            </div>
            <div>
              <Label htmlFor="dr-price_note" className="text-xs">Cena (notatka)</Label>
              <Input
                id="dr-price_note"
                value={form.price_note}
                onChange={(e) => setField("price_note", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dr-phone" className="text-xs">Telefon</Label>
              <Input
                id="dr-phone"
                maxLength={PHONE_MAX}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
              {fieldError("phone")}
            </div>
            <div className="col-span-2">
              <Label htmlFor="dr-website" className="text-xs">Strona www</Label>
              <Input
                id="dr-website"
                inputMode="url"
                placeholder="https://…"
                aria-invalid={!!errors.website}
                aria-describedby={errors.website ? "dr-website-err" : undefined}
                value={form.website}
                onChange={(e) => setField("website", e.target.value)}
                onBlur={(e) => {
                  const res = normalizeWebsite(e.target.value);
                  if (!res.error && res.value !== e.target.value) setField("website", res.value);
                }}
              />
              {fieldError("website")}
            </div>
            <div className="col-span-2">
              <Label htmlFor="dr-opening_hours" className="text-xs">Godziny otwarcia</Label>
              <Textarea
                id="dr-opening_hours"
                rows={2}
                value={form.opening_hours}
                onChange={(e) => setField("opening_hours", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="dr-image_url" className="text-xs">URL zdjęcia</Label>
              <Input
                id="dr-image_url"
                value={form.image_url}
                onChange={(e) => setField("image_url", e.target.value)}
                placeholder="https://…"
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Podgląd"
                  className="mt-2 max-h-40 rounded border border-border object-cover"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.3")}
                />
              )}
            </div>
            <div>
              <Label htmlFor="dr-age_min" className="text-xs">Wiek od (0–16)</Label>
              <Input
                id="dr-age_min"
                type="number"
                min={0}
                max={16}
                aria-invalid={!!errors.age_min}
                aria-describedby={errors.age_min ? "dr-age_min-err" : undefined}
                value={form.age_min}
                onChange={(e) => setField("age_min", e.target.value)}
                onBlur={() => blurAge("age_min")}
              />
              {fieldError("age_min")}
            </div>
            <div>
              <Label htmlFor="dr-age_max" className="text-xs">Wiek do (0–16)</Label>
              <Input
                id="dr-age_max"
                type="number"
                min={0}
                max={16}
                aria-invalid={!!errors.age_max}
                aria-describedby={errors.age_max ? "dr-age_max-err" : undefined}
                value={form.age_max}
                onChange={(e) => setField("age_max", e.target.value)}
                onBlur={() => blurAge("age_max")}
              />
              {fieldError("age_max")}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <label className="flex items-center justify-between text-sm">
              <span>Wstęp wolny (is_free)</span>
              <Switch
                className="tap44-switch"
                aria-label="Wstęp wolny"
                checked={form.is_free}
                onCheckedChange={(v) => setField("is_free", v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Dobra dla dzieci</span>
              <Switch
                className="tap44-switch"
                aria-label="Dobra dla dzieci"
                checked={form.good_for_children}
                onCheckedChange={(v) => setField("good_for_children", v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Ukryta (admin_hidden)</span>
              <Switch
                className="tap44-switch"
                aria-label="Ukryta"
                checked={form.admin_hidden}
                onCheckedChange={(v) => setField("admin_hidden", v)}
              />
            </label>
            {/* N-14 (04.09.2026): przelacznik ukryty decyzja wlasciciela.
                Pole zostaje w formularzu i w patchu — powrot = FEATURED_UI_ENABLED
                na true w src/lib/catalogClient.ts. */}
            {FEATURED_UI_ENABLED && (
              <label className="flex items-center justify-between text-sm">
                <span>Wyróżniona (featured)</span>
                <Switch
                  className="tap44-switch"
                  aria-label="Wyróżniona"
                  checked={form.featured}
                  onCheckedChange={(v) => setField("featured", v)}
                />
              </label>
            )}
          </div>

          {/* Locked fields */}
          <div className="border-t border-border pt-4">
            <Label className="text-xs" id="dr-locked-label">Pola chronione przed republikacją</Label>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]" aria-labelledby="dr-locked-label">
                {locked.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Żadne pole nie jest chronione — CRM może je nadpisać.
                  </span>
                )}
                {locked.map((f) => (
                  <Tooltip key={f}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Zdejmij ochronę z pola ${f}`}
                        onClick={() => removeLock(f)}
                        className="tap44 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 gap-1 cursor-pointer">
                          {f}
                          <X className="w-3 h-3" />
                        </Badge>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      pole wróci do wartości z CRM przy najbliższej republikacji
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            {unlocked.size > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Zdjęto ochronę: {Array.from(unlocked).join(", ")} — po zapisie te pola zostaną
                odblokowane, nawet jeśli zmieniasz teraz ich wartość.
              </p>
            )}
          </div>

          {/* Admin note */}
          <div className="border-t border-border pt-4">
            <Label htmlFor="dr-note" className="text-xs">
              Notatka wewnętrzna (widoczna tylko dla adminów)
            </Label>
            <Textarea
              id="dr-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!noteLoaded}
              placeholder={noteLoaded ? "np. sprawdzić godziny w kwietniu" : "Ładowanie…"}
            />
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-card border-t border-border flex justify-end gap-2">
            <Button variant="outline" className="tap44" onClick={onClose} disabled={saving}>Anuluj</Button>
            <Button className="tap44" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Zapisuję…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Zapisz</>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminCatalogDrawer;
