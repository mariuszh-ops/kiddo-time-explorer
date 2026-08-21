import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, ChevronRight } from "lucide-react";
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

/**
 * S-131 (RODO art. 17) — pozycja „Usuń konto" w sekcji USTAWIENIA w /profile:
 * klik → dialog z listą usuwanych danych + potwierdzenie słowem USUWAM.
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
        description: "Spróbuj ponownie za chwilę.",
      });
      return;
    }

    setIsOpen(false);
    logout();
    navigate("/");
    if (result.identityPendingManualRemoval) {
      toast.success("Twoje dane zostały usunięte", {
        description: "Konto zostanie skasowane w ciągu 30 dni.",
      });
    } else {
      toast.success("Twoje konto zostało usunięte");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirmText("");
          setIsOpen(true);
        }}
        className="w-full flex items-center justify-between px-6 py-3.5 min-h-[44px] hover:bg-destructive/10 transition-colors text-left border-t border-border/50"
      >
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">Usuń konto</span>
        </div>
        <ChevronRight className="w-4 h-4 text-destructive/70" />
      </button>

      <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && setIsOpen(open)}>
        <DialogContent className="max-w-md max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usunąć konto na stałe?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>Tej operacji nie można cofnąć. Usuniemy bezpowrotnie:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Twoje ulubione miejsca,</li>
                  <li>listę „chcę odwiedzić",</li>
                  <li>Twoje oceny gwiazdkowe,</li>
                  <li>dane profilu rodziny zapisane w przeglądarce.</li>
                </ul>
                <p>
                  Opublikowane opinie zostaną <strong>zanonimizowane</strong>, a nie skasowane — treść
                  zostaje dla innych rodziców, ale bez powiązania z Twoim kontem.
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
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canConfirm || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Usuwam…
                </>
              ) : (
                "Usuń konto na stałe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteAccountSection;
