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
}

interface AuthContextType {
  // Core state
  isLoggedIn: boolean;
  user: User | null;

  // Primary API (async — matches Supabase/Firebase/Auth0 patterns)
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, captchaToken?: string) => Promise<void>;
  resendConfirmation: (email: string, captchaToken?: string) => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<void>;


  // Backward compat aliases for existing consumers (login/logout).
  // New code should prefer signIn/signOut.
  login: () => void;
  logout: () => void;

  // Demo mode for development/testing (unchanged behavior)
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUser = (sessionUser: any): User | null => {
  if (!sessionUser) return null;
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? "",
    name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || undefined,
    avatarUrl: sessionUser.user_metadata?.avatar_url || undefined,
    createdAt: sessionUser.created_at,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Listen to real Supabase auth state
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(mapSupabaseUser(data.session?.user ?? null));
      setIsReady(true);
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


  const signOut = useCallback(async (): Promise<void> => {
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
        signIn,
        signOut,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendConfirmation,
        resetPassword,
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
