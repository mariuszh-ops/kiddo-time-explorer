import { useState, useEffect } from "react";
import { Loader2, Mail, Lock, User, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/catalogClient";
import type { User } from "@/contexts/AuthContext";

interface AccountSectionProps {
  user: User;
}

function polishAuthError(error: unknown, fallback: string): string {
  const e = error as { message?: string; code?: string };
  const msg = (e?.message || "").toLowerCase();
  const code = e?.code?.toLowerCase() || "";

  if (code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("too many")) {
    return "Za dużo prób. Poczekaj chwilę przed kolejną próbą.";
  }
  if (
    code.includes("email_exists") ||
    code.includes("user_already_exists") ||
    code.includes("email-already-in-use") ||
    msg.includes("already registered") ||
    msg.includes("user already exists") ||
    msg.includes("email address is already")
  ) {
    return "Ten adres e-mail jest już zajęty.";
  }
  if (code.includes("invalid_email") || msg.includes("invalid email") || msg.includes("unable to validate email")) {
    return "Nieprawidłowy adres e-mail.";
  }
  if (code.includes("same_password") || msg.includes("same password")) {
    return "Nowe hasło nie może być takie samo jak poprzednie.";
  }
  if (code.includes("weak_password") || msg.includes("weak password")) {
    return "Hasło jest zbyt słabe.";
  }
  return fallback;
}

export function AccountSection({ user }: AccountSectionProps) {
  const [displayName, setDisplayName] = useState(user.name || "");
  const [isSavingName, setIsSavingName] = useState(false);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState(user.email || "");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);

  // Keep local inputs in sync if user prop changes (e.g. after auth refresh).
  useEffect(() => {
    setDisplayName(user.name || "");
    if (!isEditingEmail) {
      setEmailValue(user.email || "");
    }
  }, [user.name, user.email, isEditingEmail]);

  const canSaveName = displayName.trim() !== (user.name || "").trim() && displayName.trim().length > 0;

  const handleSaveDisplayName = async () => {
    if (!canSaveName) return;
    setIsSavingName(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName.trim().slice(0, 60) },
    });
    setIsSavingName(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: polishAuthError(error, "Nie udało się zapisać nazwy. Spróbuj ponownie."),
      });
      return;
    }

    toast({
      title: "Zapisano",
      description: "Nazwa wyświetlana została zaktualizowana.",
    });
  };

  const handleSaveEmail = async () => {
    const trimmed = emailValue.trim();
    if (!trimmed || trimmed === user.email) return;
    setIsSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setIsSavingEmail(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: polishAuthError(error, "Nie udało się zmienić adresu e-mail. Spróbuj ponownie."),
      });
      return;
    }

    toast({
      title: "Link wysłany",
      description: "Na nowy adres wysłaliśmy link potwierdzający. Zmiana zadziała dopiero po kliknięciu w link.",
    });
    setIsEditingEmail(false);
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    setIsSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined,
    });
    setIsSendingPasswordReset(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: polishAuthError(error, "Nie udało się wysłać linku do zmiany hasła. Spróbuj ponownie."),
      });
      return;
    }

    toast({
      title: "Wysłaliśmy link",
      description: `Wysłaliśmy link do zmiany hasła na ${user.email}.`,
    });
  };

  return (
    <section className="bg-card rounded-xl p-6 border border-border">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Konto
      </h2>

      <div className="space-y-5">
        {/* Display name */}
        <div className="space-y-2">
          <label htmlFor="display-name" className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Nazwa wyświetlana
          </label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
              maxLength={60}
              placeholder="Twoja nazwa"
              className="flex-1 min-h-[44px]"
              aria-label="Nazwa wyświetlana"
            />
            <Button
              onClick={handleSaveDisplayName}
              disabled={!canSaveName || isSavingName}
              className="min-h-[44px] min-w-[80px]"
            >
              {isSavingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Zapisz
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Adres e-mail
          </label>
          {!isEditingEmail ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-foreground min-h-[44px] flex items-center">
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingEmail(true)}
                className="min-h-[44px] min-w-[80px]"
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                Zmień
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="Nowy adres e-mail"
                  className="flex-1 min-h-[44px]"
                  autoComplete="email"
                  aria-label="Nowy adres e-mail"
                />
                <Button
                  onClick={handleSaveEmail}
                  disabled={!emailValue.trim() || emailValue.trim() === user.email || isSavingEmail}
                  className="min-h-[44px] min-w-[80px]"
                >
                  {isSavingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Zapisz"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmailValue(user.email || "");
                  }}
                  disabled={isSavingEmail}
                  className="min-h-[44px] min-w-[80px]"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Anuluj
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Na nowy adres wyslemy link potwierdzajacy. Zmiana zadziala dopiero po kliknieciu w link.
              </p>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Hasło
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-muted-foreground min-h-[44px] flex items-center">
              ••••••••
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              disabled={isSendingPasswordReset || !user.email}
              className="min-h-[44px] min-w-[140px]"
            >
              {isSendingPasswordReset ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Zmień hasło
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
