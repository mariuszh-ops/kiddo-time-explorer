import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { translateAuthError } from "@/lib/authErrors";
import { passwordErrorMessage, checkPassword, PASSWORD_HINT } from "@/lib/passwordPolicy";
import PasswordRequirements from "@/components/PasswordRequirements";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Link z maila tworzy sesję typu recovery.
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const pwdError = passwordErrorMessage(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(translateAuthError(err));
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/profile", { replace: true }), 1500);
  };

  return (
    <>
      <SEOHead title="Ustaw nowe hasło" description="Ustaw nowe hasło do konta FamilyFun." path="/reset-password" noindex />
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="max-w-sm mx-auto px-4 py-20 md:py-28">
          <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-2">
            Ustaw nowe hasło
          </h1>
          {done ? (
            <p className="text-sm text-muted-foreground">
              Hasło zostało zmienione. Przenosimy Cię do profilu…
            </p>
          ) : !ready ? (
            <p className="text-sm text-muted-foreground">
              Otwórz tę stronę z linku, który wysłaliśmy na Twój e-mail. Link jest ważny przez
              ograniczony czas.
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nowe hasło</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={PASSWORD_HINT}
                />
                <PasswordRequirements password={password} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy || !checkPassword(password).ok} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zapisz nowe hasło"}
              </Button>
            </form>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ResetPassword;
