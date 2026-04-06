import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  Copy,
  Check,
  Building,
  Calendar,
  Info,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  MessageSquarePlus,
  ChevronDown,
  ClipboardCopy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import PageTransition from "@/components/PageTransition";
import ActivityManagement from "@/components/admin/ActivityManagement";
import { Activity, getActivities, setActivities, filterOptions } from "@/data/activities";
import { useSubmissions, ActivitySubmission } from "@/contexts/SubmissionsContext";
import { AMENITIES } from "@/data/amenities";
import { toast } from "sonner";

// CSV Schema definition
const csvSchema = {
  required: [
    { field: "name", description: "Nazwa atrakcji", example: "Zoo Warszawa" },
    { field: "city", description: "Miasto (klucz)", example: "warszawa" },
    { field: "type", description: "Typ atrakcji", example: "miejsce | wydarzenie" },
    { field: "age_range", description: "Zakres wiekowy", example: "3-12" },
    { field: "indoor_outdoor", description: "Lokalizacja", example: "indoor | outdoor | mixed" },
    { field: "short_description", description: "Krótki opis (max 500 znaków)", example: "Spotkanie z egzotycznymi zwierzętami..." },
    { field: "website_url", description: "Strona internetowa", example: "https://zoo.waw.pl" },
    { field: "location_hint", description: "Adres lub link do mapy", example: "ul. Ratuszowa 1/3, Warszawa" },
  ],
  optional: [
    { field: "date_from", description: "Data rozpoczęcia (dla wydarzeń)", example: "2026-03-15" },
    { field: "date_to", description: "Data zakończenia (dla wydarzeń)", example: "2026-03-17" },
    { field: "price_info", description: "Informacja o cenach", example: "Dorośli: 40 zł, Dzieci: 20 zł" },
    { field: "organizer_name", description: "Nazwa organizatora", example: "Fundacja Edukacji Dziecięcej" },
  ],
};

const sampleCSV = `name,city,type,age_range,indoor_outdoor,short_description,website_url,location_hint,date_from,date_to
"Zoo Warszawa",warszawa,miejsce,2-12,outdoor,"Spotkanie z egzotycznymi zwierzętami",https://zoo.waw.pl,"ul. Ratuszowa 1/3, Warszawa",,
"Festiwal Bajek",warszawa,wydarzenie,3-10,outdoor,"Spektakle plenerowe dla dzieci",https://festiwalbajek.pl,"Park Skaryszewski",2026-03-15,2026-03-17`;

const REQUIRED_FIELDS = ['id', 'title', 'slug', 'city', 'latitude', 'longitude', 'rating', 'reviewCount'];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    cities: Record<string, number>;
    withPhotos: number;
    withReviews: number;
    withAmenities: number;
  };
}

function validateActivities(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Dane nie są tablicą'], warnings: [], stats: { total: 0, cities: {}, withPhotos: 0, withReviews: 0, withAmenities: 0 } };
  }

  const cities: Record<string, number> = {};
  let withPhotos = 0, withReviews = 0, withAmenities = 0;

  for (const [i, item] of (data as Record<string, unknown>[]).entries()) {
    for (const field of REQUIRED_FIELDS) {
      if (!(field in item) || item[field] === null || item[field] === undefined || item[field] === '') {
        errors.push(`Atrakcja #${i + 1}: brak pola '${field}'`);
      }
    }
    const city = (item.city as string) || 'unknown';
    cities[city] = (cities[city] || 0) + 1;
    if (item.imageUrl) withPhotos++;
    if (Array.isArray(item.reviews) && (item.reviews as unknown[]).length > 0) withReviews++;
    if (Array.isArray(item.amenities) && (item.amenities as unknown[]).length > 0) withAmenities++;

    if (!item.slug) warnings.push(`Atrakcja #${i + 1} "${item.title || '?'}": brak pola 'slug'`);
    if (!item.imageUrl) warnings.push(`Atrakcja #${i + 1} "${item.title || '?'}": brak zdjęcia`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.slice(0, 10),
    warnings: warnings.slice(0, 10),
    stats: { total: data.length, cities, withPhotos, withReviews, withAmenities },
  };
}

// --- Submission Review Card ---

const SubmissionCard = ({ submission }: { submission: ActivitySubmission }) => {
  const { updateSubmission } = useSubmissions();
  const [editState, setEditState] = useState<Partial<ActivitySubmission>>({});

  const current = { ...submission, ...editState };

  const handleField = (field: keyof ActivitySubmission, value: unknown) => {
    setEditState((prev) => ({ ...prev, [field]: value }));
  };

  const handleApprove = () => {
    updateSubmission(submission.id, { ...editState, status: "approved" });
    toast.success("Zgłoszenie zatwierdzone — pamiętaj o uzupełnieniu lat/lng i zdjęć w pipeline");
  };

  const handleReject = () => {
    updateSubmission(submission.id, { status: "rejected" });
    toast("Zgłoszenie odrzucone");
  };

  const handleCopyJSON = () => {
    const slug = current.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const json: Record<string, unknown> = {
      id: 0,
      title: current.title,
      slug,
      location: current.address || "",
      city: current.city,
      rating: 0,
      reviewCount: 0,
      ageRange: `${current.ageMin}-${current.ageMax}`,
      ageMin: current.ageMin,
      ageMax: current.ageMax,
      matchPercentage: 0,
      imageUrl: "",
      imageUrls: [],
      tags: [],
      isIndoor: current.isIndoor,
      type: current.type,
      isEvent: current.isEvent,
      eventDate: current.eventDate || undefined,
      address: current.address,
      priceLevel: current.priceLevel,
      priceNote: current.priceNote,
      website: current.website,
      latitude: 0,
      longitude: 0,
      amenities: current.amenities,
      reviews: [],
    };
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    toast.success("Skopiowano JSON — wklej do activities.json");
  };

  const dateStr = new Date(submission.submittedAt).toLocaleDateString("pl-PL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <Input
            value={current.title}
            onChange={(e) => handleField("title", e.target.value)}
            className="font-semibold text-base"
          />
          <p className="text-xs text-muted-foreground">Zgłoszono: {dateStr}</p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 shrink-0">
          Oczekujące
        </Badge>
      </div>

      {/* Editable fields grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* City */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Miasto</Label>
          <Select value={current.city} onValueChange={(v) => handleField("city", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {filterOptions.city.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Kategoria</Label>
          <Select value={current.type} onValueChange={(v) => handleField("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {filterOptions.type.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Wiek (min – max)</Label>
          <div className="flex gap-2 items-center">
            <Input type="number" min={0} max={18} value={current.ageMin} onChange={(e) => handleField("ageMin", Number(e.target.value))} className="w-20" />
            <span className="text-muted-foreground">–</span>
            <Input type="number" min={0} max={18} value={current.ageMax} onChange={(e) => handleField("ageMax", Number(e.target.value))} className="w-20" />
          </div>
        </div>

        {/* Indoor/Outdoor */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Indoor / outdoor</Label>
          <RadioGroup value={current.isIndoor ? "indoor" : "outdoor"} onValueChange={(v) => handleField("isIndoor", v === "indoor")} className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="indoor" id={`io-${submission.id}-i`} />
              <Label htmlFor={`io-${submission.id}-i`} className="text-sm font-normal cursor-pointer">Indoor</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="outdoor" id={`io-${submission.id}-o`} />
              <Label htmlFor={`io-${submission.id}-o`} className="text-sm font-normal cursor-pointer">Outdoor</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cena</Label>
          <RadioGroup
            value={current.priceLevel !== undefined ? String(current.priceLevel) : ""}
            onValueChange={(v) => handleField("priceLevel", Number(v))}
            className="flex gap-3"
          >
            {[0, 1, 2, 3].map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <RadioGroupItem value={String(p)} id={`price-${submission.id}-${p}`} />
                <Label htmlFor={`price-${submission.id}-${p}`} className="text-sm font-normal cursor-pointer">
                  {p === 0 ? "Bezpłatne" : "$".repeat(p)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Price note */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notatka cenowa</Label>
          <Input value={current.priceNote || ""} onChange={(e) => handleField("priceNote", e.target.value)} placeholder="np. Dorośli: 40 zł" />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Adres</Label>
          <Input value={current.address} onChange={(e) => handleField("address", e.target.value)} />
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Strona www</Label>
          <Input value={current.website} onChange={(e) => handleField("website", e.target.value)} />
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Udogodnienia</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AMENITIES.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Checkbox
                checked={current.amenities.includes(a.id)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...current.amenities, a.id]
                    : current.amenities.filter((x) => x !== a.id);
                  handleField("amenities", next);
                }}
              />
              <Label className="text-sm font-normal cursor-pointer">{a.label}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* User description */}
      {current.description && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Opis od użytkownika</Label>
          <div className="bg-muted rounded-lg p-3 text-sm text-foreground leading-relaxed">
            {current.description}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        <Button className="gap-2" onClick={handleApprove}>
          <CheckCircle2 className="w-4 h-4" />
          Zatwierdź
        </Button>
        <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleReject}>
          <Trash2 className="w-4 h-4" />
          Odrzuć
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleCopyJSON}>
          <ClipboardCopy className="w-4 h-4" />
          Kopiuj jako JSON
        </Button>
      </div>
    </div>
  );
};

const Admin = () => {
  const [copiedCSV, setCopiedCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<Activity[] | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importApplied, setImportApplied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { submissions, removeSubmission, pendingCount } = useSubmissions();
  const pendingSubmissions = submissions.filter((s) => s.status === "pending");
  const historySubmissions = submissions.filter((s) => s.status !== "pending");

  const handleCopyCSV = () => {
    navigator.clipboard.writeText(sampleCSV);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportApplied(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const result = validateActivities(parsed);
        setValidation(result);
        if (result.valid) {
          setImportData(parsed as Activity[]);
        } else {
          setImportData(null);
        }
      } catch {
        setValidation({ valid: false, errors: ['Nieprawidłowy format JSON'], warnings: [], stats: { total: 0, cities: {}, withPhotos: 0, withReviews: 0, withAmenities: 0 } });
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (!importData) return;
    setActivities(importData);
    setImportApplied(true);
  };

  const handleCancel = () => {
    setImportData(null);
    setValidation(null);
    setImportApplied(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadCurrent = () => {
    const blob = new Blob([JSON.stringify(getActivities(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activities.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    historySubmissions.forEach((s) => removeSubmission(s.id));
    toast("Historia wyczyszczona");
  };

  const currentActivities = getActivities();

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30">
        {/* Admin Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Wróć do aplikacji
                  </Button>
                </Link>
                <div className="h-6 w-px bg-border" />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Panel administracyjny</h1>
                  <p className="text-xs text-muted-foreground">Zarządzanie danymi aplikacji</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pendingCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground">
                    {pendingCount} {pendingCount === 1 ? "zgłoszenie" : "zgłoszeń"}
                  </Badge>
                )}
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Tryb deweloperski
                </Badge>
              </div>
            </div>
          </div>
        </header>

        <main className="container py-8 space-y-10">

          {/* ===== SECTION 0: Submissions Review ===== */}
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquarePlus className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-serif text-foreground">Zgłoszenia od rodziców</h2>
                {pendingCount > 0 && (
                  <Badge variant="secondary">{pendingCount} oczekujących</Badge>
                )}
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Miejsca zgłoszone przez użytkowników — sprawdź i zatwierdź.
              </p>
            </div>

            {/* Pending submissions */}
            {pendingSubmissions.length > 0 ? (
              <div className="space-y-4">
                {pendingSubmissions.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <MessageSquarePlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Brak nowych zgłoszeń. Miejsca dodane przez rodziców pojawią się tutaj.
                </p>
              </div>
            )}

            {/* History collapsible */}
            {historySubmissions.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-6">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-muted-foreground">
                    <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                    Historia ({historySubmissions.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {historySubmissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between bg-card rounded-lg border border-border px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{sub.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleDateString("pl-PL")}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={sub.status === "approved"
                          ? "text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30"
                          : "text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30"
                        }
                      >
                        {sub.status === "approved" ? "Zatwierdzone" : "Odrzucone"}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-2 mt-2" onClick={handleClearHistory}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Wyczyść historię
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            )}
          </section>

          {/* ===== SECTION: Activity Management ===== */}
          <ActivityManagement />

          {/* ===== SECTION 1: JSON Import ===== */}
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileJson className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-serif text-foreground">Import danych atrakcji</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Wgraj plik JSON z atrakcjami. Dane zostaną podmienione w pamięci — zmiany widoczne natychmiast, ale znikną po odświeżeniu strony.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Status & upload */}
              <div className="lg:col-span-2 space-y-4">
                {/* Current stats */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Aktualnie załadowanych</h3>
                    <Badge variant="secondary">{currentActivities.length} atrakcji</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Źródło: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/data/activities.json</code>
                  </p>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadCurrent}>
                    <Download className="w-3.5 h-3.5" />
                    Pobierz aktualny JSON
                  </Button>
                </div>

                {/* Upload area */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-foreground mb-3">Wgraj nowy plik JSON</h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Kliknij aby wybrać plik JSON
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Format: tablica obiektów Activity
                    </p>
                  </button>
                </div>

                {/* Validation results */}
                {validation && (
                  <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                    <h3 className="font-semibold text-foreground">Podgląd importu</h3>

                    {/* Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {validation.valid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span>Znaleziono: <strong>{validation.stats.total}</strong> atrakcji</span>
                      </div>
                      {validation.valid && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Miasta: {Object.entries(validation.stats.cities).map(([city, count]) => `${city} (${count})`).join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Ze zdjęciami: {validation.stats.withPhotos}/{validation.stats.total}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Z recenzjami: {validation.stats.withReviews}/{validation.stats.total}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Errors */}
                    {validation.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Błędy ({validation.errors.length})</h4>
                        <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                          {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {validation.warnings.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Ostrzeżenia ({validation.warnings.length})</h4>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          {validation.warnings.map((w, i) => <li key={i}>⚠️ {w}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      {validation.valid && !importApplied && (
                        <Button className="gap-2" onClick={handleApply}>
                          <CheckCircle2 className="w-4 h-4" />
                          Zastosuj dane
                        </Button>
                      )}
                      {importApplied && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border-green-300 py-1.5 px-3">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Dane zastosowane — widoczne na stronie
                        </Badge>
                      )}
                      <Button variant="outline" className="gap-2" onClick={handleCancel}>
                        <Trash2 className="w-4 h-4" />
                        Anuluj
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Instructions */}
              <div className="space-y-4">
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-foreground mb-3">📋 Instrukcja</h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Uruchom skaner Google Places</li>
                    <li>Odpal <code className="bg-muted px-1 py-0.5 rounded text-xs">eksport_familyfun_v2.py</code></li>
                    <li>Wgraj plik <code className="bg-muted px-1 py-0.5 rounded text-xs">imported_activities.json</code> tutaj</li>
                    <li>Kliknij "Zastosuj dane"</li>
                    <li>Zweryfikuj stronę</li>
                  </ol>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Ważne</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        "Zastosuj dane" podmienia dane w pamięci — działa natychmiast, ale znika po odświeżeniu. 
                        Aby dane były trwałe, wgraj plik <code className="font-mono">activities.json</code> do <code className="font-mono">public/data/</code> w Lovable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== SECTION 2: CSV Schema (existing) ===== */}
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-serif text-foreground">Import CSV (planowane)</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Dodaj wiele atrakcji jednocześnie, korzystając z pliku CSV.
              </p>
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Funkcja w przygotowaniu</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Import CSV jest obecnie w fazie projektowania. Poniżej znajdziesz specyfikację formatu danych.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Required fields */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary" />
                      Pola wymagane
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Pole</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="w-[220px]">Przykład</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvSchema.required.map((item) => (
                        <TableRow key={item.field}>
                          <TableCell className="font-mono text-sm text-primary">{item.field}</TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{item.example}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Optional fields */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Pola opcjonalne
                    </h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Pole</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="w-[220px]">Przykład</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvSchema.optional.map((item) => (
                        <TableRow key={item.field}>
                          <TableCell className="font-mono text-sm text-muted-foreground">{item.field}</TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{item.example}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Sample CSV */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Przykładowy plik CSV</h3>
                    <Button variant="outline" size="sm" onClick={handleCopyCSV} className="gap-2">
                      {copiedCSV ? <><Check className="w-3.5 h-3.5" /> Skopiowano</> : <><Copy className="w-3.5 h-3.5" /> Kopiuj</>}
                    </Button>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed">{sampleCSV}</pre>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 opacity-60">
                  <h3 className="font-semibold text-foreground mb-4">Prześlij plik CSV</h3>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/20 cursor-not-allowed">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-foreground mb-2">Notatki techniczne</h4>
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    <li>• Kodowanie pliku: UTF-8</li>
                    <li>• Separator pól: przecinek (,)</li>
                    <li>• Teksty z przecinkami: w cudzysłowie ("")</li>
                    <li>• Format daty: YYYY-MM-DD</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PageTransition>
  );
};

export default Admin;
