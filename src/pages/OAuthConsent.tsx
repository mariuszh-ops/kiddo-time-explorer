import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { bezpieczneWyjscie } from "@/lib/safeRedirect";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

/** Ekran zgody OAuth 2.1 dla klientów MCP (/.lovable/oauth/consent). */
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Brak parametru authorization_id.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}${next}` },
        });
        if (signInError && active) setError(signInError.message);
        return;
      }
      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        const cel = bezpieczneWyjscie(immediate);
        if (!cel) {
          setError("Serwer autoryzacji zwrócił niedozwolony adres przekierowania.");
          return;
        }
        window.location.href = cel;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = bezpieczneWyjscie(data?.redirect_url ?? data?.redirect_to);
    if (!target) {
      setBusy(false);
      setError("Serwer autoryzacji nie zwrócił poprawnego adresu przekierowania.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
      {error ? (
        <p className="text-sm text-destructive">Nie udało się obsłużyć tej prośby o dostęp: {error}</p>
      ) : !details ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : (
        <>
          <h1 className="font-serif text-2xl">
            Połącz {details.client?.name ?? "aplikację"} ze swoim kontem FamilyFun
          </h1>
          <p className="text-sm text-muted-foreground">
            {details.client?.name ?? "Ta aplikacja"} będzie mogła korzystać z narzędzi FamilyFun jako Ty.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide(true)}
              className="min-h-11 flex-1 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-60"
            >
              Zezwól
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide(false)}
              className="min-h-11 flex-1 rounded-md border border-border px-4 disabled:opacity-60"
            >
              Odrzuć
            </button>
          </div>
        </>
      )}
    </main>
  );
}
