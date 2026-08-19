import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Send, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { catalogClient } from "@/lib/catalogClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { FEATURES } from "@/lib/featureFlags";
import { filterOptions } from "@/data/activities";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeUrlInput, isHttpUrl } from "@/lib/safeUrl";
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

const ageGroups = [
  { id: "0-3", label: "0–3 lata" },
  { id: "4-6", label: "4–6 lat" },
  { id: "7-10", label: "7–10 lat" },
  { id: "11-14", label: "11–14 lat" },
  { id: "15+", label: "15+ lat" },
];

const allCityOptions = [
  ...filterOptions.city,
  { value: "inne", label: "Inne" },
];

const cityOptions = allCityOptions.filter(
  (c) => c.value === "inne" || FEATURES.ENABLED_CITIES.includes(c.value)
);

const activityTypeOptions = filterOptions.type;

const amenityOptions = [
  { id: "stroller", label: "Dostępne dla wózków" },
  { id: "parking", label: "Parking" },
  { id: "changing-table", label: "Przewijalnia" },
  { id: "food-onsite", label: "Jedzenie na miejscu" },
  { id: "playground", label: "Plac zabaw" },
  { id: "toilets", label: "Toalety" },
  { id: "fenced", label: "Ogrodzone / bezpieczne" },
  { id: "accessible", label: "Dostępne dla niepełnosprawnych" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę miejsca").max(100, "Nazwa jest za długa"),
  city: z.string().min(1, "Wybierz województwo"),
  customCity: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
  activityType: z.string().min(1, "Wybierz typ aktywności"),
  type: z.enum(["place", "event"], { required_error: "Wybierz typ" }),
  eventDate: z.string().max(50).optional(),
  ageGroups: z.array(z.string()).min(1, "Wybierz przynajmniej jedną grupę wiekową"),
  indoorOutdoor: z.enum(["indoor", "outdoor", "both"], {
    required_error: "Wybierz lokalizację",
  }),
  priceLevel: z.number().min(0).max(3).optional(),
  priceNote: z.string().max(200).optional(),
  description: z.string().max(500, "Opis może mieć maksymalnie 500 znaków").optional(),
  link: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || isHttpUrl(normalizeUrlInput(val)),
      "Podaj poprawny adres zaczynający się od http:// lub https://",
    ),
  amenities: z.array(z.string()).optional(),
  contactEmail: z
    .string()
    .trim()
    .email("Podaj prawidłowy adres email")
    .max(255, "Email jest za długi")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DRAFT_KEY = "ff:draft:activity-submission";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Draft = Partial<FormData> & { savedAt?: number };

const readDraft = (): Draft | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeDraft = (data: FormData) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* brak sessionStorage — pomijamy */
  }
};

const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
};

const hasAnyContent = (d: Partial<FormData> | null | undefined): boolean => {
  if (!d) return false;
  const texts = [d.name, d.customCity, d.address, d.eventDate, d.priceNote, d.description, d.link, d.contactEmail];
  if (texts.some((t) => typeof t === "string" && t.trim() !== "")) return true;
  if ((d.ageGroups?.length ?? 0) > 0) return true;
  if ((d.amenities?.length ?? 0) > 0) return true;
  if (d.activityType) return true;
  if (d.indoorOutdoor) return true;
  if (d.priceLevel !== undefined) return true;
  return false;
};

const SectionHeader = ({ title }: { title: string }) => (
  <div className="pt-4 pb-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {title}
    </p>
    <div className="border-b border-border/50 mt-2" />
  </div>
);

// Wiersz wyboru = JEDEN obszar dotykowy (min. 44 px) opisany <label htmlFor>,
// żeby klik w tekst przełączał kontrolkę także na telefonie.
const OPTION_ROW_CLASS =
  "flex items-center gap-2.5 min-h-11 px-2.5 -mx-0.5 rounded-md border border-transparent cursor-pointer text-sm font-normal select-none transition-colors hover:bg-accent/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1";

const SubmitActivityModal = ({ isOpen, onClose }: SubmitActivityModalProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const { user } = useAuth();
  const pushedHistoryRef = useRef(false);
  const closingFromPopRef = useRef(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      city: FEATURES.ENABLED_CITIES.length > 1 ? "" : (FEATURES.ENABLED_CITIES[0] || "warszawa"),
      customCity: "",
      address: "",
      activityType: "",
      type: "place",
      eventDate: "",
      ageGroups: [],
      indoorOutdoor: undefined,
      priceLevel: undefined,
      priceNote: "",
      description: "",
      link: "",
      amenities: [],
      contactEmail: "",
    },
  });

  const emptyValues = useRef<FormData | null>(null);
  if (!emptyValues.current) {
    emptyValues.current = form.getValues();
  }

  const selectedType = useWatch({ control: form.control, name: "type" });
  const selectedCity = useWatch({ control: form.control, name: "city" });
  const selectedPriceLevel = useWatch({ control: form.control, name: "priceLevel" });
  const isEvent = selectedType === "event";
  const descriptionLength = form.watch("description")?.length || 0;

  // ── Wersja robocza: zapis z debounce 300 ms przy każdej zmianie pola ──
  useEffect(() => {
    if (!isOpen || isSubmitted) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = form.watch((values) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (hasAnyContent(values as FormData)) writeDraft(values as FormData);
      }, 300);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [isOpen, isSubmitted, form]);

  // ── Otwarcie modala: przywrócenie wersji roboczej + wpis w historii ──
  useEffect(() => {
    if (!isOpen) return;
    const draft = readDraft();
    if (draft && hasAnyContent(draft)) {
      const { savedAt: _savedAt, ...values } = draft;
      form.reset({ ...(emptyValues.current as FormData), ...values });
      setDraftRestored(true);
    } else if (user?.email) {
      form.setValue("contactEmail", user.email);
    }

    if (!pushedHistoryRef.current) {
      try {
        window.history.pushState({ ffModal: "zglos-atrakcje" }, "");
        pushedHistoryRef.current = true;
      } catch {
        /* brak History API */
      }
    }

    const onPop = () => {
      pushedHistoryRef.current = false;
      closingFromPopRef.current = true;
      setConfirmClose(false);
      onClose();
      closingFromPopRef.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /** Zamyka modal i zdejmuje wpis z historii (jeden wpis na otwarcie). */
  const finalizeClose = useCallback(() => {
    setConfirmClose(false);
    setDraftRestored(false);
    if (pushedHistoryRef.current && !closingFromPopRef.current) {
      pushedHistoryRef.current = false;
      onClose();
      try {
        window.history.back();
      } catch {
        /* ignore */
      }
      return;
    }
    onClose();
  }, [onClose]);

  const startOver = () => {
    clearDraft();
    form.reset({
      ...(emptyValues.current as FormData),
      contactEmail: user?.email ?? "",
    });
    setDraftRestored(false);
  };

  const handleSubmit = async (data: FormData) => {
    const ageRanges = data.ageGroups.map((g) => {
      const parts = g.split("-").map(Number);
      return { min: parts[0] || 0, max: parts[1] || 16 };
    });
    const ageMin = Math.min(...ageRanges.map((r) => r.min));
    const ageMax = Math.max(...ageRanges.map((r) => r.max));

    const cityValue = data.city === "inne" ? (data.customCity || "inne") : data.city;
    const payload = {
      name: data.name,
      region: null as string | null,
      city: cityValue,
      address: data.address || null,
      type: data.activityType,
      age_min: ageMin,
      age_max: ageMax,
      is_indoor: data.indoorOutdoor === "indoor" || data.indoorOutdoor === "both",
      price_level: data.priceLevel ?? null,
      description: data.description || null,
      website: data.link || null,
      amenities: data.amenities || [],
      contact_email: data.contactEmail?.trim() || null,
      status: "nowe",
    };

    setIsSubmitting(true);
    const { error } = await catalogClient
      .from("activity_submissions")
      .insert(payload);
    setIsSubmitting(false);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isRateLimit =
        error.code === "P0001" ||
        error.code === "PT429" ||
        (error as { status?: number }).status === 429 ||
        msg.includes("rate") ||
        msg.includes("too many") ||
        msg.includes("zbyt wiele");
      if (isRateLimit) {
        toast.error(
          error.message?.trim()
            ? error.message
            : "Wysłano zbyt wiele zgłoszeń z tego urządzenia — spróbuj ponownie za godzinę",
        );
      } else {
        toast.error("Nie udało się wysłać zgłoszenia", { description: error.message });
      }
      // Nieudana wysyłka NIE kasuje wersji roboczej.
      return;
    }

    clearDraft();
    setDraftRestored(false);
    setIsSubmitted(true);
  };

  const handleClose = () => {
    if (isSubmitted) {
      setIsSubmitted(false);
      form.reset(emptyValues.current as FormData);
      finalizeClose();
      return;
    }
    if (hasAnyContent(form.getValues())) {
      setConfirmClose(true);
      return;
    }
    finalizeClose();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {isSubmitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dzięki za zgłoszenie!</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Sprawdzimy zgłoszenie i jeśli będzie pasować, dodamy je do bazy atrakcji.
              Wszystkie propozycje są weryfikowane przed publikacją.
            </p>
            <Button onClick={handleClose}>Zamknij</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <MapPin className="w-5 h-5 text-primary" />
                Zgłoś atrakcję
              </DialogTitle>
              <DialogDescription className="sr-only">
                Formularz zgłaszania nowej atrakcji.
              </DialogDescription>
              <p className="text-sm text-muted-foreground mt-1">
                Podziel się miejscem, które warto odwiedzić z dziećmi. Wszystkie zgłoszenia są weryfikowane.
              </p>
            </DialogHeader>

            {draftRestored && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <p className="text-sm text-foreground">Przywróciliśmy Twój niedokończony formularz.</p>
                <Button type="button" variant="ghost" size="sm" onClick={startOver}>
                  Zacznij od nowa
                </Button>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">

                {/* ═══ SEKCJA 1: Podstawowe informacje ═══ */}
                <SectionHeader title="Podstawowe informacje" />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa miejsca *</FormLabel>
                      <FormControl>
                        <Input placeholder="np. Park Jordana, Muzeum Nauki" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* City */}
                {FEATURES.ENABLED_CITIES.length > 1 ? (
                  <>
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Województwo *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz województwo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cityOptions.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedCity === "inne" && (
                      <FormField
                        control={form.control}
                        name="customCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nazwa miasta</FormLabel>
                            <FormControl>
                              <Input placeholder="Wpisz nazwę miasta" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                ) : (
                  <div className="rounded-lg bg-accent/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      📍 Aktualnie zbieramy atrakcje z <span className="font-medium text-foreground">Warszawy</span>
                    </p>
                  </div>
                )}

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres</FormLabel>
                      <FormControl>
                        <Input placeholder="np. ul. Ratuszowa 1/3, Warszawa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Activity Type */}
                <FormField
                  control={form.control}
                  name="activityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ aktywności *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activityTypeOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Place/Event - conditional on FEATURES.EVENTS */}
                {FEATURES.EVENTS && (
                  <>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value ?? ""}
                              className="flex gap-4"
                            >
                              <Label htmlFor="type-place" className={OPTION_ROW_CLASS}>
                                <RadioGroupItem value="place" id="type-place" aria-label="Miejsce stałe" />
                                Miejsce stałe
                              </Label>
                              <Label htmlFor="type-event" className={OPTION_ROW_CLASS}>
                                <RadioGroupItem value="event" id="type-event" aria-label="Wydarzenie" />
                                Wydarzenie
                              </Label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isEvent && (
                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-amber-500" />
                              Data wydarzenia
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="np. 15-17 marca 2026 lub 'Co weekend'" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Jeśli nie znasz dokładnej daty, zostaw puste
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                {/* ═══ SEKCJA 2: Dla kogo i jak ═══ */}
                <SectionHeader title="Dla kogo i jak" />

                {/* Age Groups */}
                <FormField
                  control={form.control}
                  name="ageGroups"
                  render={() => (
                    <FormItem>
                      <FormLabel>Wiek dzieci *</FormLabel>
                      <p className="text-xs text-muted-foreground mb-2">
                        Dla jakich grup wiekowych polecasz to miejsce?
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {ageGroups.map((age) => (
                          <FormField
                            key={age.id}
                            control={form.control}
                            name="ageGroups"
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <Label htmlFor={`age-${age.id}`} className={OPTION_ROW_CLASS}>
                                  <FormControl>
                                    <Checkbox
                                      id={`age-${age.id}`}
                                      aria-label={age.label}
                                      checked={field.value?.includes(age.id)}
                                      onCheckedChange={(checked) => {
                                        const newValue = checked
                                          ? [...field.value, age.id]
                                          : field.value.filter((v) => v !== age.id);
                                        field.onChange(newValue);
                                      }}
                                    />
                                  </FormControl>
                                  {age.label}
                                </Label>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Indoor / Outdoor */}
                <FormField
                  control={form.control}
                  name="indoorOutdoor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indoor / outdoor *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          className="flex flex-wrap gap-x-3 gap-y-1"
                        >
                          <Label htmlFor="io-indoor" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="indoor" id="io-indoor" aria-label="W pomieszczeniu" />
                            W pomieszczeniu
                          </Label>
                          <Label htmlFor="io-outdoor" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="outdoor" id="io-outdoor" aria-label="Na zewnątrz" />
                            Na zewnątrz
                          </Label>
                          <Label htmlFor="io-both" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="both" id="io-both" aria-label="Jedno i drugie" />
                            Jedno i drugie
                          </Label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price Level */}
                <FormField
                  control={form.control}
                  name="priceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poziom cenowy</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value !== undefined ? String(field.value) : ""}
                          className="flex flex-wrap gap-x-3 gap-y-1"
                        >
                          <Label htmlFor="price-0" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="0" id="price-0" aria-label="Bezpłatne" />
                            Bezpłatne
                          </Label>
                          <Label htmlFor="price-1" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="1" id="price-1" aria-label="Niedrogie" />
                            Niedrogie ($)
                          </Label>
                          <Label htmlFor="price-2" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="2" id="price-2" aria-label="Umiarkowane" />
                            Umiarkowane ($$)
                          </Label>
                          <Label htmlFor="price-3" className={OPTION_ROW_CLASS}>
                            <RadioGroupItem value="3" id="price-3" aria-label="Drogie" />
                            Drogie ($$$)
                          </Label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price Note - visible when priceLevel > 0 */}
                {selectedPriceLevel !== undefined && selectedPriceLevel > 0 && (
                  <FormField
                    control={form.control}
                    name="priceNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Informacja o cenach</FormLabel>
                        <FormControl>
                          <Input placeholder="np. Dorośli: 40 zł, Dzieci: 20 zł" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ═══ SEKCJA 3: Opis i kontakt ═══ */}
                <SectionHeader title="Opis i kontakt" />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Krótki opis</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Czym wyróżnia się to miejsce? Co warto wiedzieć?"
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormMessage />
                        <span className={`text-xs ${descriptionLength > 450 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {descriptionLength}/500
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Link */}
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strona internetowa</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amenities */}
                <FormField
                  control={form.control}
                  name="amenities"
                  render={() => (
                    <FormItem>
                      <FormLabel>Udogodnienia</FormLabel>
                      <p className="text-xs text-muted-foreground mb-2">
                        Zaznacz udogodnienia dostępne na miejscu
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-2">
                        {amenityOptions.map((amenity) => (
                          <FormField
                            key={amenity.id}
                            control={form.control}
                            name="amenities"
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <Label htmlFor={`amenity-${amenity.id}`} className={OPTION_ROW_CLASS}>
                                  <FormControl>
                                    <Checkbox
                                      id={`amenity-${amenity.id}`}
                                      aria-label={amenity.label}
                                      checked={field.value?.includes(amenity.id)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        const newValue = checked
                                          ? [...current, amenity.id]
                                          : current.filter((v) => v !== amenity.id);
                                        field.onChange(newValue);
                                      }}
                                    />
                                  </FormControl>
                                  {amenity.label}
                                </Label>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit - sticky on mobile */}
                {/* Kontakt (opcjonalnie) */}
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twój email (jeśli mamy odpisać)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="np. jan@example.com" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {user?.email
                          ? "Twój adres z konta — możesz go zmienić"
                          : "Opcjonalnie — użyjemy go tylko, żeby dopytać o szczegóły zgłoszenia."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sticky bottom-0 bg-background pt-3 pb-1 border-t border-border/50 -mx-6 px-6 mt-4">
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                      Anuluj
                    </Button>
                    <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "Wysyłam…" : "Wyślij zgłoszenie"}
                    </Button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Zgłoszenia są weryfikowane przed publikacją
                  </p>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Masz niezapisane zmiany. Zamknąć formularz?</AlertDialogTitle>
          <AlertDialogDescription>
            Zachowamy wersję roboczą — wrócisz do niej przy następnym otwarciu formularza.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Wróć do formularza</AlertDialogCancel>
          <AlertDialogAction onClick={finalizeClose}>Zamknij</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default SubmitActivityModal;
