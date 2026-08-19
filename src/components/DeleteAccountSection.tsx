import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { deleteAccountData } from "@/lib/deleteAccount";

const CONFIRM_WORDS = ["USUWAM", "USUŃ", "USUN"];
const MAILTO =
  "mailto:kontakt@familyfun.pl?subject=" +
  encodeURIComponent("Wniosek o usunięcie konta") +
  "&body=" +
  encodeURIComponent(
    "Proszę o trwałe usunięcie mojego konta w serwisie FamilyFun oraz powiązanych z nim danych."
  );

/**
 * S-131 (RODO art. 17) — ścieżka usunięcia konta w /profile: dwa kliknięcia
 * (»Usuń konto« → potwierdzenie w modalu po wpisaniu słowa USUWAM).
 */
const DeleteAccountSection = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canConfirm = CONFIRM_WORDS.includes(confirmText.trim().toUpperCase());

  const handleDelete = async () => {
    if (!canConfirm || !user) return;
    setIsDeleting(true);
    const result = await deleteAccountData(user.id);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error("Nie udało się usunąć konta", {
        description: "Spróbuj ponownie lub napisz na kontakt@familyfun.pl.",
      });
      return;
    }

    setIsOpen(false);
    logout();
    navigate("/");
    toast.success("Konto zostało usunięte", {
      description: "Twoje zapisane miejsca i oceny zostały skasowane, a opinie zanonimizowane.",
    });
  };

  return (
    <section className="bg-card rounded-xl border border-destructive/30 overflow-hidden">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-6 pt-5 pb-1">
        Konto
      </h2>
      <div className="px-6 pb-5 pt-2 space-y-3">
        <p className="text-sm text-muted-foreground">
          Masz prawo w każdej chwili usunąć konto i powiązane z nim dane (RODO art. 17).
        </p>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            setConfirmText("");
            setIsOpen(true);
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Usuń konto
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && setIsOpen(open)}>
        <DialogContent className="max-w-md max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usunąć konto na zawsze?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>Tej operacji nie można cofnąć. Usuniemy bezpowrotnie:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Twoje ulubione miejsca,</li>
                  <li>listę „chcę odwiedzić",</li>
                  <li>wystawione oceny gwiazdkowe,</li>
                  <li>dane profilu rodziny zapisane w przeglądarce.</li>
                </ul>
                <p>
                  Twoje opinie o atrakcjach zostaną <strong>zanonimizowane</strong> — treść zostaje
                  dla innych rodziców, ale bez powiązania z Tobą.
                </p>
                <p>
                  Formalny wniosek o wykreślenie samego wpisu logowania możesz wysłać na{" "}
                  <a className="text-primary underline" href={MAILTO}>
                    kontakt@familyfun.pl
                  </a>
                  .
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Aby potwierdzić, wpisz słowo <strong>USUWAM</strong>
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder="USUWAM"
              className="text-base md:text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canConfirm || isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Usuwam…
                </>
              ) : (
                "Usuń konto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default DeleteAccountSection;
