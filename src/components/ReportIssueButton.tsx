import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { value: "zamkniete", label: "Obiekt zamknięty" },
  { value: "nieaktualne-dane", label: "Nieaktualne dane" },
  { value: "zle-zdjecie", label: "Złe zdjęcie" },
  { value: "inne", label: "Inne" },
] as const;

const schema = z.object({
  category: z.enum(["zamkniete", "nieaktualne-dane", "zle-zdjecie", "inne"]),
  message: z
    .string()
    .trim()
    .min(3, "Napisz kilka słów, co się nie zgadza")
    .max(2000, "Maksymalnie 2000 znaków"),
  contact_email: z
    .string()
    .trim()
    .max(255)
    .email("Nieprawidłowy adres email")
    .optional()
    .or(z.literal("")),
});

const STORAGE_KEY = "familyfun:reported-places";

const readReported = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
const markReported = (placeId: string) => {
  const list = new Set(readReported());
  list.add(placeId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(list)));
  } catch {
    /* ignore */
  }
};

interface Props {
  placeId: string;
}

const ReportIssueButton = ({ placeId }: Props) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("nieaktualne-dane");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openModal = () => {
    if (readReported().includes(placeId)) {
      toast.info("To zgłoszenie już do nas dotarło — dziękujemy!");
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      category,
      message,
      contact_email: email,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Sprawdź pola formularza");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("issue_reports").insert({
      place_id: placeId,
      category: parsed.data.category,
      message: parsed.data.message,
      contact_email: parsed.data.contact_email ? parsed.data.contact_email : null,
      status: "nowe",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Nie udało się wysłać", { description: error.message });
      return;
    }
    markReported(placeId);
    toast.success("Dziękujemy! Sprawdzimy to.");
    setOpen(false);
    setMessage("");
    setEmail("");
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-dotted"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Zgłoś błąd w danych
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zgłoś błąd w danych</DialogTitle>
            <DialogDescription>
              Pomóż nam poprawić katalog. Zgłoszenie trafia do zespołu FamilyFun.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Co się nie zgadza?</Label>
              <RadioGroup
                value={category}
                onValueChange={(v) => setCategory(v as typeof category)}
                className="space-y-1.5"
              >
                {CATEGORIES.map((c) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <RadioGroupItem id={`cat-${c.value}`} value={c.value} />
                    <Label htmlFor={`cat-${c.value}`} className="font-normal cursor-pointer">
                      {c.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="issue-message" className="text-sm mb-1 block">
                Opisz krótko
              </Label>
              <Textarea
                id="issue-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                placeholder="np. Miejsce jest zamknięte od czerwca 2026…"
                rows={4}
                maxLength={2000}
              />
              <div className="text-xs text-muted-foreground mt-1">{message.length}/2000</div>
            </div>

            <div>
              <Label htmlFor="issue-email" className="text-sm mb-1 block">
                Twój email (jeśli mamy odpisać)
              </Label>
              <Input
                id="issue-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opcjonalnie"
                maxLength={255}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Anuluj
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Wysyłam…" : "Wyślij zgłoszenie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportIssueButton;