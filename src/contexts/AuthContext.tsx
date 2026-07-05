import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { env } from "@/config/env";

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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      console.error("Google sign-in error:", result.error);
      throw result.error instanceof Error ? result.error : new Error(String(result.error));
    }
    // On redirect flow the browser navigates away; on popup flow the session
    // is set and onAuthStateChange updates state.
  };

  const signInWithGoogle = useCallback(signInWithGoogleImpl, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setIsDemoMode(false);
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
