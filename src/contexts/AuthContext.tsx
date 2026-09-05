import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { catalogClient as supabase, clearCatalogAuthStorage } from "@/lib/catalogClient";
import { env } from "@/config/env";
import { trackEvent } from "@/lib/analytics";
import { clearAllAppStorage, markLoggedOutNow } from "@/lib/storage";
import { resetGuestMigrationConsent } from "@/lib/guestMigration";

/**
 * S-184: wspólny komputer. Po wylogowaniu / wygaśnięciu sesji z localStorage
 * musi zniknąć KAŻDY klucz aplikacji (ff_*, familyfun_*), żeby kolejna osoba
 * nie zobaczyła cudzych ulubionych ani ocen.
 * I-01: razem z nimi klucz sesji GoTrue — `clearAllAppStorage()` go NIE obejmuje,
 * bo `sb-catalog-auth` jest poza prefiksami aplikacji.
 */
const wipeLocalUserData = () => {
  clearAllAppStorage();
  clearCatalogAuthStorage();
  markLoggedOutNow();
  resetGuestMigrationConsent();
};

/**
 * User object shape. Compatible with typical auth providers (Supabase, Firebase,
 * Auth0). When swapping to real auth, populate these fields from the provider's
 * session object.
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt?: string; // ISO date string
  /** I-11: nowy adres czekajacy na potwierdzenie obu linkow (GoTrue new_email). */
  pendingEmail?: string;
  /** I-11: dostawcy logowania (email, google) - decyduje o etykiecie "Ustaw / Zmien haslo". */
  providers?: string[];
}

interface AuthContextType {
  // Core state
  isLoggedIn: boolean;
  user: User | null;
  /**
   * false dopoki nie wroci pierwsze getSession(). Widoki bramkowane
   * logowaniem musza na to poczekac, inaczej zalogowany uzytkownik
   * widzi migawke ekranu "Zaloguj sie".
   */
  isReady: boolean;

  // Primary API (async — matches Supabase/Firebase/Auth0 patterns)
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, captchaToken?: string) => Promise<void>;
  resendConfirmation: (email: string, captchaToken?: string) => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<void>;

  // I-11: edycja konta w /profile (Supabase Auth updateUser)
  updateDisplayName: (name: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string, nonce?: string) => Promise<void>;
  requestReauthentication: () => Promise<void>;

  // Backward compat aliases for existing consumers (login/logout).
  // New code should prefer signIn/signOut.
  login: () => void;
  logout: () => void;

  // Demo mode for development/testing (unchanged behavior)
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const nonEmptyString = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;

/**
 * I-11: display_name ma pierwszenstwo przed full_name/name, bo te dwa Google
 * nadpisuje przy KAZDYM logowaniu OAuth (GoTrue scala dane tozsamosci
 * z user_metadata). Wlasny klucz przezywa wylogowanie i ponowne logowanie.
 */
export const mapSupabaseUser = (sessionUser: any): User | null => {
  if (!sessionUser) return null;
  const meta = sessionUser.user_metadata ?? {};
  const providers = sessionUser.app_metadata?.providers;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    name: nonEmptyString(meta.display_name) ?? nonEmptyString(meta.full_name) ?? nonEmptyString(meta.name),
    avatarUrl: nonEmptyString(meta.avatar_url),
    createdAt: sessionUser.created_at,
    pendingEmail: nonEmptyString(sessionUser.new_email),
    providers: Array.isArray(providers) ? providers.filter((x: unknown) => typeof x === "string") : undefined,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Listen to real Supabase auth state
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(mapSupabaseUser(data.session?.user ?? null));
      } catch (error) {
        console.error("getSession error:", error);
      } finally {
        // finally, bo inaczej blad odczytu sesji zostawia bramke isReady
        // zamknieta na zawsze i /profile stoi w nieskonczonym ladowaniu.
        setIsReady(true);
      }
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_OUT") wipeLocalUserData();
      setUser(mapSupabaseUser(session?.user ?? null));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (): Promise<void> => {
    // Default sign-in path: Google via Lovable Cloud managed OAuth.
    await signInWithGoogleImpl();
  }, []);

  const signInWithGoogleImpl = async (): Promise<void> => {
    try {
      const returnTo = window.location.pathname + window.location.search;
      window.localStorage.setItem("auth_return_to", returnTo);
    } catch {
      // storage unavailable — ignore
    }
    const returnTo =
      (typeof window !== "undefined" &&
        (window.localStorage.getItem("auth_return_to") ||
          window.location.pathname + window.location.search)) ||
      "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + returnTo },
    });
    if (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
    trackEvent("login", { method: "google" });
  };

  const signInWithGoogle = useCallback(signInWithGoogleImpl, []);

  const rememberReturnTo = () => {
    try {
      window.localStorage.setItem(
        "auth_return_to",
        window.location.pathname + window.location.search
      );
    } catch {
      // storage unavailable — ignore
    }
  };

  const signInWithEmail = useCallback(async (email: string, password: string, captchaToken?: string) => {
    rememberReturnTo();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken },
    });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, captchaToken?: string) => {
    rememberReturnTo();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, captchaToken },
    });
    if (error) throw error;
  }, []);

  const resendConfirmation = useCallback(async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, captchaToken },
    });
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
      captchaToken,
    });
    if (error) throw error;
  }, []);

  // I-11: edycja konta. updateUser odswieza sesje i wysyla USER_UPDATED,
  // wiec user w kontekscie aktualizuje sie sam przez onAuthStateChange.
  const updateDisplayName = useCallback(async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) throw error;
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    // "Secure email change" w Supabase: linki ida na stary i nowy adres,
    // zmiana wchodzi po klikniecu obu. Do tego czasu user.pendingEmail.
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: window.location.origin + "/profile" }
    );
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string, nonce?: string) => {
    // nonce tylko gdy serwer wymaga reauth (M-13) - pusty klucz GoTrue odrzuca.
    const { error } = await supabase.auth.updateUser(nonce ? { password, nonce } : { password });
    if (error) throw error;
  }, []);

  const requestReauthentication = useCallback(async () => {
    const { error } = await supabase.auth.reauthenticate();
    if (error) throw error;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    // Przed signOut: zaraz potem leci window.location.assign i żądanie
    // analityki nie zdążyłoby wyjść.
    trackEvent("logout");
    await supabase.auth.signOut();
    wipeLocalUserData();
    setIsDemoMode(false);
    // Przeładowanie widoku dopiero PO wyczyszczeniu danych lokalnych.
    if (typeof window !== "undefined") window.location.assign("/");
  }, []);

  // Backward-compat: void-returning aliases that fire-and-forget the async API.
  const login = useCallback(() => {
    void signIn();
  }, [signIn]);
  const logout = useCallback(() => {
    void signOut();
  }, [signOut]);

  const toggleDemoMode = useCallback(() => {
    if (!env.isDev) return;
    setIsDemoMode((prev) => {
      const next = !prev;
      if (next) {
        // Demo mode still uses mock user locally
        setUser({
          id: "mock-user-1",
          email: "anna.kowalska@email.com",
          name: "Anna Kowalska",
          createdAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
      return next;
    });
  }, []);

  const effectiveIsLoggedIn = user !== null;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: effectiveIsLoggedIn,
        user,
        isReady,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendConfirmation,
        resetPassword,
        updateDisplayName,
        updateEmail,
        updatePassword,
        requestReauthentication,
        login,
        logout,
        isDemoMode: env.isDev && isDemoMode,
        toggleDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
