import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { catalogClient as supabase } from "@/lib/catalogClient";

/**
 * Listens for SIGNED_IN and navigates the user back to the path they were on
 * before starting the OAuth / email login flow (stored in
 * localStorage under "auth_return_to"). Must live inside <BrowserRouter>.
 */
const AuthReturnHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      let returnTo: string | null = null;
      try {
        returnTo = window.localStorage.getItem("auth_return_to");
        window.localStorage.removeItem("auth_return_to");
      } catch {
        returnTo = null;
      }
      if (!returnTo) return;
      // Guard: only same-origin, path-only redirects.
      if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return;
      const current = window.location.pathname + window.location.search;
      if (returnTo === current) return;
      navigate(returnTo, { replace: true });
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);
  return null;
};

export default AuthReturnHandler;