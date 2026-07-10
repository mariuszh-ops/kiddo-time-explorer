import { useEffect, useState } from "react";
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
import { catalogClient, type CatalogRow } from "@/lib/catalogClient";

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

interface Props {
  row: CatalogRow | null;
  onClose: () => void;
  onSaved: (updated: CatalogRow) => void;
}

const AdminCatalogDrawer = ({ row, onClose, onSaved }: Props) => {
  const [form, setForm] = useState<EditForm | null>(null);
  const [locked, setLocked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) {
      setForm(null);
      setLocked([]);
      setNote("");
      setNoteLoaded(false);
      return;
    }
    setForm(toForm(row));
    setLocked(row.locked_fields ?? []);
    setNoteLoaded(false);
    setNote("");
    (async () => {
      const { data } = await catalogClient
        .from("admin_notes")
        .select("note")
        .eq("place_id", row.place_id)
        .maybeSingle();
      setNote((data as { note?: string } | null)?.note ?? "");
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

  const setField = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));

  const removeLock = (field: string) =>
    setLocked((prev) => prev.filter((f) => f !== field));

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const changed = changedFields(row, form);
    // Union locked with newly-changed tracked fields (admin_hidden/featured excluded by design)
    const nextLocked = Array.from(new Set([...locked, ...changed]));

    const patch: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      city: form.city || null,
      address: form.address || null,
      description: form.description || null,
      price_note: form.price_note || null,
      phone: form.phone || null,
      website: form.website || null,
      opening_hours: form.opening_hours || null,
      image_url: form.image_url || null,
      age_min: parseAge(form.age_min),
      age_max: parseAge(form.age_max),
      is_free: form.is_free,
      good_for_children: form.good_for_children,
      admin_hidden: form.admin_hidden,
      featured: form.featured,
      locked_fields: nextLocked,
    };

    const { data, error } = await catalogClient
      .from("public_activities")
      .update(patch)
      .eq("place_id", row.place_id)
      .select("*")
      .maybeSingle();

    if (error) {
      toast.error("Nie udało się zapisać", { description: error.message });
      setSaving(false);
      return;
    }

    // Upsert admin note
    if (noteLoaded) {
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
    onSaved((data as CatalogRow) ?? { ...row, ...patch });
  };

  const publicUrl = `/atrakcje/${row.slug}`;
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${row.place_id}`;

  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
              <Label className="text-xs">Nazwa</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Typ</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Miasto</Label>
              <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Adres</Label>
              <Input value={form.address} onChange={(e) => setField("address", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Opis</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Cena (notatka)</Label>
              <Input value={form.price_note} onChange={(e) => setField("price_note", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Strona www</Label>
              <Input value={form.website} onChange={(e) => setField("website", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Godziny otwarcia</Label>
              <Textarea
                rows={2}
                value={form.opening_hours}
                onChange={(e) => setField("opening_hours", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">URL zdjęcia</Label>
              <Input
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
              <Label className="text-xs">Wiek od (0–16)</Label>
              <Input
                type="number"
                min={0}
                max={16}
                value={form.age_min}
                onChange={(e) => setField("age_min", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Wiek do (0–16)</Label>
              <Input
                type="number"
                min={0}
                max={16}
                value={form.age_max}
                onChange={(e) => setField("age_max", e.target.value)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <label className="flex items-center justify-between text-sm">
              <span>Wstęp wolny (is_free)</span>
              <Switch checked={form.is_free} onCheckedChange={(v) => setField("is_free", v)} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Dobra dla dzieci</span>
              <Switch
                checked={form.good_for_children}
                onCheckedChange={(v) => setField("good_for_children", v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Ukryta (admin_hidden)</span>
              <Switch
                checked={form.admin_hidden}
                onCheckedChange={(v) => setField("admin_hidden", v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Wyróżniona (featured)</span>
              <Switch checked={form.featured} onCheckedChange={(v) => setField("featured", v)} />
            </label>
          </div>

          {/* Locked fields */}
          <div className="border-t border-border pt-4">
            <Label className="text-xs">Pola chronione przed republikacją</Label>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2 mt-2 min-h-[28px]">
                {locked.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Żadne pole nie jest chronione — CRM może je nadpisać.
                  </span>
                )}
                {locked.map((f) => (
                  <Tooltip key={f}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 gap-1 cursor-pointer"
                        onClick={() => removeLock(f)}
                      >
                        {f}
                        <X className="w-3 h-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      pole wróci do wartości z CRM przy najbliższej republikacji
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Admin note */}
          <div className="border-t border-border pt-4">
            <Label className="text-xs">Notatka wewnętrzna (widoczna tylko dla adminów)</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!noteLoaded}
              placeholder={noteLoaded ? "np. sprawdzić godziny w kwietniu" : "Ładowanie…"}
            />
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-card border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Anuluj</Button>
            <Button onClick={handleSave} disabled={saving}>
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