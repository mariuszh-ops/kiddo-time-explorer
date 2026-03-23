import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Send, CheckCircle2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const ageGroups = [
  { id: "0-3", label: "0–3 lata" },
  { id: "4-6", label: "4–6 lat" },
  { id: "7-10", label: "7–10 lat" },
  { id: "11-14", label: "11–14 lat" },
  { id: "15+", label: "15+ lat" },
];

const cityOptions = [
  { value: "warszawa", label: "Warszawa" },
  { value: "krakow", label: "Kraków" },
  { value: "wroclaw", label: "Wrocław" },
  { value: "gdansk", label: "Gdańsk" },
  { value: "poznan", label: "Poznań" },
  { value: "inne", label: "Inne" },
];

const activityTypeOptions = [
  { value: "zoo", label: "Zoo i zwierzęta" },
  { value: "muzea", label: "Muzea" },
  { value: "place-zabaw", label: "Place zabaw" },
  { value: "parki", label: "Parki" },
  { value: "sport", label: "Sport i ruch" },
  { value: "warsztaty", label: "Warsztaty" },
  { value: "inne", label: "Inne" },
];

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
  city: z.string().min(1, "Wybierz miasto"),
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
  link: z.string().url("Podaj prawidłowy adres URL").optional().or(z.literal("")),
  amenities: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SectionHeader = ({ title }: { title: string }) => (
  <div className="pt-4 pb-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {title}
    </p>
    <div className="border-b border-border/50 mt-2" />
  </div>
);

const SubmitActivityModal = ({ isOpen, onClose }: SubmitActivityModalProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

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
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const selectedCity = useWatch({ control: form.control, name: "city" });
  const selectedPriceLevel = useWatch({ control: form.control, name: "priceLevel" });
  const isEvent = selectedType === "event";
  const descriptionLength = form.watch("description")?.length || 0;

  const handleSubmit = (data: FormData) => {
    console.log("Activity submission:", data);
    setIsSubmitted(true);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
              <p className="text-sm text-muted-foreground mt-1">
                Podziel się miejscem, które warto odwiedzić z dziećmi. Wszystkie zgłoszenia są weryfikowane.
              </p>
            </DialogHeader>

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
                          <FormLabel>Miasto *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz miasto" />
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
                              value={field.value}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="place" id="type-place" />
                                <Label htmlFor="type-place" className="cursor-pointer font-normal">
                                  Miejsce stałe
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="event" id="type-event" />
                                <Label htmlFor="type-event" className="cursor-pointer font-normal">
                                  Wydarzenie
                                </Label>
                              </div>
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
                      <div className="flex flex-wrap gap-3">
                        {ageGroups.map((age) => (
                          <FormField
                            key={age.id}
                            control={form.control}
                            name="ageGroups"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(age.id)}
                                    onCheckedChange={(checked) => {
                                      const newValue = checked
                                        ? [...field.value, age.id]
                                        : field.value.filter((v) => v !== age.id);
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <Label className="text-sm font-normal cursor-pointer">
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
                          value={field.value}
                          className="flex flex-wrap gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="indoor" id="io-indoor" />
                            <Label htmlFor="io-indoor" className="cursor-pointer font-normal">W pomieszczeniu</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="outdoor" id="io-outdoor" />
                            <Label htmlFor="io-outdoor" className="cursor-pointer font-normal">Na zewnątrz</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="both" id="io-both" />
                            <Label htmlFor="io-both" className="cursor-pointer font-normal">Jedno i drugie</Label>
                          </div>
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
                          className="flex flex-wrap gap-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="0" id="price-0" />
                            <Label htmlFor="price-0" className="cursor-pointer font-normal">Bezpłatne</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="1" id="price-1" />
                            <Label htmlFor="price-1" className="cursor-pointer font-normal">Niedrogie ($)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="2" id="price-2" />
                            <Label htmlFor="price-2" className="cursor-pointer font-normal">Umiarkowane ($$)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="3" id="price-3" />
                            <Label htmlFor="price-3" className="cursor-pointer font-normal">Drogie ($$$)</Label>
                          </div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {amenityOptions.map((amenity) => (
                          <FormField
                            key={amenity.id}
                            control={form.control}
                            name="amenities"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
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
                                <Label className="text-sm font-normal cursor-pointer">
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
                <div className="sticky bottom-0 bg-background pt-3 pb-1 border-t border-border/50 -mx-6 px-6 mt-4">
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                      Anuluj
                    </Button>
                    <Button type="submit" className="flex-1 gap-2">
                      <Send className="w-4 h-4" />
                      Wyślij zgłoszenie
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
  );
};

export default SubmitActivityModal;
