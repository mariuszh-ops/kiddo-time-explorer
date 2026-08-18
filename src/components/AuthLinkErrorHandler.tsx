import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { translateAuthError } from "@/lib/authErrors";

/**
 * Obsługuje powrót z linku e-mailowego, który wygasł lub został już użyty.
 * Czyta #error / error_code / error_description z fragmentu adresu, pokazuje
 * polski komunikat i pozwala wysłać nowy link potwierdzający.
 */
const AuthLinkErrorHandler = () => {
  const { resendConfirmation } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const code = params.get("error_code");
    const err = params.get("error");
    if (!code && !err) return;
    if (code === "otp_expired" || code === "access_denied" || err === "access_denied") {
      setOpen(true);
    }
    // Wyczyść fragment z adresu.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim()) {
      setError("Podaj adres e-mail.");
      return;
    }
    setBusy(true);
    try {
      await resendConfirmation(email.trim());
      setSent(true);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm max-h-[90vh] max-h-[90svh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-serif">
            Ten link wygasł lub został już użyty
          </DialogTitle>
          <DialogDescription className="pt-2">
            {sent
              ? "Wysłaliśmy nowy link potwierdzający. Sprawdź skrzynkę."
              : "Podaj swój adres e-mail, a wyślemy nowy link potwierdzający."}
          </DialogDescription>
        </DialogHeader>

        {!sent && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="relink-email">E-mail</Label>
              <Input
                id="relink-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rodzina@example.com"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Wyślij nowy link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthLinkErrorHandler;