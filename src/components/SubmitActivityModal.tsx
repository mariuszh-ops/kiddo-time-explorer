import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, MapPin, Send, CheckCircle2, Calendar } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const ageGroups = [
  { id: "0-3", label: "0–3 lata" },
  { id: "4-6", label: "4–6 lat" },
  { id: "7-10", label: "7–10 lat" },
  { id: "11-14", label: "11–14 lat" },
  { id: "15+", label: "15+ lat" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę miejsca").max(100, "Nazwa jest za długa"),
  city: z.string().trim().min(1, "Podaj miasto").max(50, "Nazwa miasta jest za długa"),
  type: z.enum(["place", "event"], {
    required_error: "Wybierz typ",
  }),
  ageGroups: z.array(z.string()).min(1, "Wybierz przynajmniej jedną grupę wiekową"),
  description: z.string().max(500, "Opis może mieć maksymalnie 500 znaków").optional(),
  link: z.string().url("Podaj prawidłowy adres URL").optional().or(z.literal("")),
  eventDate: z.string().max(50, "Data jest za długa").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmitActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubmitActivityModal = ({ isOpen, onClose }: SubmitActivityModalProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      city: "",
      type: undefined,
      ageGroups: [],
      description: "",
      link: "",
      eventDate: "",
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const isEvent = selectedType === "event";

  const descriptionLength = form.watch("description")?.length || 0;

  const handleSubmit = (data: FormData) => {
    // For now, just log - no backend
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
          // Success state
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dzięki za zgłoszenie!</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Sprawdzimy zgłoszenie i jeśli będzie pasować, dodamy je do bazy atrakcji. 
              Wszystkie propozycje są weryfikowane przed publikacją.
            </p>
            <Button onClick={handleClose}>
              Zamknij
            </Button>
          </div>
        ) : (
          // Form state
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <MapPin className="w-5 h-5 text-primary" />
                Dodaj nowe miejsce
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Podziel się miejscem, które warto odwiedzić z dziećmi
              </p>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 pt-2">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa miejsca *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="np. Park Jordana, Muzeum Nauki" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* City */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miasto *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="np. Warszawa, Kraków" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Type */}
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

                {/* Event date - only shown when type is "event" */}
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
                          <Input 
                            placeholder="np. 15-17 marca 2026 lub 'Co weekend'" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Jeśli nie znasz dokładnej daty, zostaw puste
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                      <FormLabel>Link do strony lub Google Maps</FormLabel>
                      <FormControl>
                        <Input 
                          type="url"
                          placeholder="https://..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Anuluj
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    <Send className="w-4 h-4" />
                    Wyślij zgłoszenie
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Zgłoszenia są weryfikowane przed publikacją
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubmitActivityModal;
