import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { trackEvent } from "@/lib/analytics";
import { RATE_LIMIT_MESSAGE, userFacingError } from "@/lib/userFacingError";
import { CONTACT_EMAIL_MAX } from "@/lib/formLimits";
import { useCloseOnBack } from "@/hooks/useCloseOnBack";
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
    .max(CONTACT_EMAIL_MAX, `Maksymalnie ${CONTACT_EMAIL_MAX} znaków`)
    .email("Nieprawidłowy adres e-mail")
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

type FieldErrors = Partial<Record<"message" | "contact_email", string>>;

const MESSAGE_ERROR_ID = "issue-message-error";
const EMAIL_ERROR_ID = "issue-email-error";

const ReportIssueButton = ({ placeId }: Props) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("nieaktualne-dane");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // GOLIVE GL-4-056: „wstecz" przy otwartym dialogu zamyka go i zostawia na
  // karcie (wpis-atrapa w historii, jak galeria w GL-4-004/005). Wpisany tekst
  // zostaje w stanie komponentu — po ponownym otwarciu jest na miejscu.
  useCloseOnBack(open, () => setOpen(false));

  const openModal = () => {
    if (readReported().includes(placeId)) {
      toast.info("To zgłoszenie już do nas dotarło — dziękujemy!");
      return;
    }
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      category,
      message,
      contact_email: email,
    });
    if (!parsed.success) {
      // AN-12-079 (WCAG 3.3.1): błąd przy polu (aria-invalid + aria-describedby) i fokus na
      // pierwszym błędnym polu, jak w „Zgłoś atrakcję”, zamiast samego znikającego toastu.
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "message" || key === "contact_email") && !next[key]) next[key] = issue.message;
      }
      if (!next.message && !next.contact_email) {
        toast.error(parsed.error.issues[0]?.message ?? "Sprawdź pola formularza");
        return;
      }
      // flushSync: atrybuty błędu są w DOM, zanim fokus trafi na pole (czytnik odczyta komunikat).
      flushSync(() => setErrors(next));
      (next.message ? messageRef.current : emailRef.current)?.focus();
      return;
    }
    setErrors({});
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
      // AF-10-005/036: bez surowego error.message i z krokiem do wykonania; polski tekst
      // limitu z triggera issue_reports_rate_limit (PT429) przechodzi. Dialog zostaje otwarty.
      toast.error(
        userFacingError(
          error,
          "Nie udało się wysłać zgłoszenia. Spróbuj ponownie albo napisz na kontakt@familyfun.pl.",
          RATE_LIMIT_MESSAGE,
        ),
      );
      return;
    }
    markReported(placeId);
    trackEvent("report_submit", { category: parsed.data.category });
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
        className="inline-flex items-center gap-1.5 min-h-[40px] md:min-h-0 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-dotted"
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
                    <RadioGroupItem id={`cat-${c.value}`} value={c.value} aria-label={c.label} />
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
                ref={messageRef}
                id="issue-message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value.slice(0, 2000));
                  if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
                }}
                placeholder="np. Miejsce jest zamknięte od czerwca 2026…"
                rows={4}
                maxLength={2000}
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={errors.message ? MESSAGE_ERROR_ID : undefined}
              />
              {errors.message && (
                <p id={MESSAGE_ERROR_ID} className="text-sm font-medium text-destructive mt-1">
                  {errors.message}
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-1">{message.length}/2000</div>
            </div>

            <div>
              <Label htmlFor="issue-email" className="text-sm mb-1 block">
                Twój e-mail (jeśli mamy odpisać)
              </Label>
              <Input
                ref={emailRef}
                id="issue-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.contact_email) setErrors((prev) => ({ ...prev, contact_email: undefined }));
                }}
                placeholder="opcjonalnie"
                maxLength={CONTACT_EMAIL_MAX}
                aria-invalid={errors.contact_email ? true : undefined}
                aria-describedby={errors.contact_email ? EMAIL_ERROR_ID : undefined}
              />
              {errors.contact_email && (
                <p id={EMAIL_ERROR_ID} className="text-sm font-medium text-destructive mt-1">
                  {errors.contact_email}
                </p>
              )}
            </div>

            {/* AF-8-042 (RODO art. 13): formularz zbiera e-mail — klauzula i link do polityki. */}
            <p className="text-xs text-muted-foreground">
              Administratorem danych jest Softline sp. z o.o. E-mail wykorzystamy tylko do odpowiedzi
              na to zgłoszenie. Szczegóły i Twoje prawa:{" "}
              <a
                href="/polityka-prywatnosci"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Polityka prywatności
              </a>
              .
            </p>
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