import { useId, useState } from "react";
import { Flag } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { catalogClient as supabase } from "@/lib/catalogClient";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

/**
 * AF-8-008 / AF-8-063 (DSA art. 16): zgłoszenie treści opinii, która zdaniem
 * zgłaszającego narusza prawo lub regulamin. Pola odpowiadają art. 16 ust. 2:
 * uzasadnienie (b: dokładne miejsce dopisujemy sami — adres strony + która
 * opinia), imię/nazwa i e-mail (c, opcjonalnie), oświadczenie w dobrej wierze (d).
 *
 * Kanał: istniejąca tabela issue_reports (kategoria „inne”, prefiks w treści),
 * bez nowej tabeli i bez zmian RLS — zgłoszenie widać w /admin → Zgłoszenia.
 */

const REASONS = [
  { value: "niezgodna-z-prawem", label: "Treść niezgodna z prawem" },
  { value: "obrazliwa", label: "Obraźliwa, nienawistna lub wulgarna" },
  { value: "dane-osobowe", label: "Ujawnia czyjeś dane osobowe" },
  { value: "spam", label: "Spam, reklama lub fałszywa opinia" },
  { value: "inne", label: "Inne naruszenie regulaminu" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export const REPORT_REVIEW_PREFIX = "[Zgłoszenie opinii — DSA art. 16]";
const EXPLANATION_MAX = 1000;

const schema = z.object({
  explanation: z
    .string()
    .trim()
    .min(10, "Napisz w kilku słowach, dlaczego ta opinia narusza prawo lub regulamin")
    .max(EXPLANATION_MAX, `Maksymalnie ${EXPLANATION_MAX} znaków`),
  name: z.string().trim().max(120, "Maksymalnie 120 znaków"),
  contact_email: z
    .string()
    .trim()
    .max(255)
    .email("Nieprawidłowy adres e-mail")
    .optional()
    .or(z.literal("")),
});

interface Props {
  placeId: string;
  /** Krótki opis autora do nazwy przycisku, np. „Rodzic” albo „Anna K., opinia z Google”. */
  authorLabel: string;
  /** Dokładne wskazanie opinii do treści zgłoszenia (DSA art. 16 ust. 2 lit. b). */
  reviewLocator: string;
}

export const buildReviewReportMessage = (p: {
  locator: string;
  pageUrl: string;
  reasonLabel: string;
  name: string;
  explanation: string;
}): string =>
  [
    REPORT_REVIEW_PREFIX,
    `Opinia: ${p.locator}`,
    `Strona: ${p.pageUrl}`,
    `Powód: ${p.reasonLabel}`,
    `Zgłaszający: ${p.name || "nie podano"}`,
    "Oświadczenie w dobrej wierze: tak",
    "",
    p.explanation,
  ]
    .join("\n")
    .slice(0, 2000);

const ReportReviewButton = ({ placeId, authorLabel, reviewLocator }: Props) => {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("niezgodna-z-prawem");
  const [explanation, setExplanation] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goodFaith, setGoodFaith] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // „wstecz” przy otwartym dialogu zamyka go i zostawia na karcie (jak GL-4-056).
  useCloseOnBack(open, () => setOpen(false));

  const reset = () => {
    setReason("niezgodna-z-prawem");
    setExplanation("");
    setName("");
    setEmail("");
    setGoodFaith(false);
  };

  const submit = async () => {
    if (!goodFaith) return;
    const parsed = schema.safeParse({ explanation, name, contact_email: email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Sprawdź pola formularza");
      return;
    }
    const reasonLabel = REASONS.find((r) => r.value === reason)?.label ?? reason;
    const pageUrl =
      typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    setSubmitting(true);
    const { error } = await supabase.from("issue_reports").insert({
      place_id: placeId,
      category: "inne",
      message: buildReviewReportMessage({
        locator: reviewLocator,
        pageUrl,
        reasonLabel,
        name: parsed.data.name,
        explanation: parsed.data.explanation,
      }),
      contact_email: parsed.data.contact_email ? parsed.data.contact_email : null,
      status: "nowe",
    });
    setSubmitting(false);
    if (error) {
      // Limit zgłoszeń pilnuje trigger i to on niesie treść dla użytkownika (wzorzec N-06).
      const err = error as { code?: string; message?: string };
      toast.error(
        err.code === "P0001" && err.message?.trim()
          ? err.message
          : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie albo napisz na kontakt@familyfun.pl.",
      );
      return;
    }
    toast.success(
      parsed.data.contact_email
        ? "Dziękujemy. Sprawdzimy tę opinię i odpiszemy na podany e-mail."
        : "Dziękujemy. Zgłoszenie trafiło do zespołu FamilyFun — sprawdzimy tę opinię.",
    );
    setOpen(false);
    reset();
  };

  const ids = {
    explanation: `${uid}-explanation`,
    name: `${uid}-name`,
    email: `${uid}-email`,
    goodFaith: `${uid}-good-faith`,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Zgłoś opinię: ${authorLabel}`}
        className="inline-flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] md:min-h-[24px] md:min-w-[24px] text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        <Flag aria-hidden="true" className="w-3 h-3" />
        Zgłoś
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zgłoś opinię</DialogTitle>
            <DialogDescription>
              Uważasz, że ta opinia narusza prawo lub regulamin? Opisz, co jest nie tak — zgłoszenie
              trafi do zespołu FamilyFun, który je rozpatrzy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Co jest nie tak?</Label>
              <RadioGroup
                value={reason}
                onValueChange={(v) => setReason(v as Reason)}
                className="space-y-1.5"
              >
                {REASONS.map((r) => (
                  <div key={r.value} className="flex items-center gap-2">
                    <RadioGroupItem id={`${uid}-${r.value}`} value={r.value} aria-label={r.label} />
                    <Label htmlFor={`${uid}-${r.value}`} className="font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor={ids.explanation} className="text-sm mb-1 block">
                Dlaczego ta treść narusza prawo lub regulamin? *
              </Label>
              <Textarea
                id={ids.explanation}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value.slice(0, EXPLANATION_MAX))}
                rows={4}
                maxLength={EXPLANATION_MAX}
                aria-required="true"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {explanation.length}/{EXPLANATION_MAX}
              </div>
            </div>

            <div>
              <Label htmlFor={ids.name} className="text-sm mb-1 block">
                Imię i nazwisko lub nazwa (opcjonalnie)
              </Label>
              <Input
                id={ids.name}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </div>

            <div>
              <Label htmlFor={ids.email} className="text-sm mb-1 block">
                Twój e-mail (jeśli chcesz poznać decyzję)
              </Label>
              <Input
                id={ids.email}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opcjonalnie"
                maxLength={255}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id={ids.goodFaith}
                checked={goodFaith}
                onCheckedChange={(v) => setGoodFaith(v === true)}
                aria-required="true"
                className="mt-0.5"
              />
              <Label htmlFor={ids.goodFaith} className="text-sm font-normal leading-snug cursor-pointer">
                Oświadczam w dobrej wierze, że informacje w zgłoszeniu są prawdziwe i kompletne *
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Administratorem danych jest Softline sp. z o.o. Imię i e-mail wykorzystamy tylko do
              rozpatrzenia zgłoszenia i odpowiedzi. Szczegóły i Twoje prawa:{" "}
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
            <Button onClick={submit} disabled={submitting || !goodFaith}>
              {submitting ? "Wysyłam…" : "Wyślij zgłoszenie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportReviewButton;
