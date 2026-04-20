import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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

  // Backward compat aliases for existing consumers (login/logout).
  // New code should prefer signIn/signOut.
  login: () => void;
  logout: () => void;

  // Demo mode for development/testing (unchanged behavior)
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



/**
 * Mock user returned by the fake signIn. When real auth is wired in, this
 * function is replaced by a call to the auth provider's session API.
 */
const createMockUser = (): User => ({
  id: "mock-user-1",
  email: "anna.kowalska@email.com",
  name: "Anna Kowalska",
  avatarUrl: undefined,
  createdAt: new Date().toISOString(),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const signIn = useCallback(async (): Promise<void> => {
    // Simulate network delay — keeps consumer code future-proof
    await new Promise((resolve) => setTimeout(resolve, 150));
    setUser(createMockUser());
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    setUser(null);
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
        setUser(createMockUser());
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
