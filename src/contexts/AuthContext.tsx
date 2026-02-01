import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  // Demo mode for development/testing
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Default to logged-out state (production-like behavior)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Demo mode toggle for testing - only effective in development
  const [isDemoMode, setIsDemoMode] = useState(false);

  const login = () => setIsLoggedIn(true);
  const logout = () => {
    setIsLoggedIn(false);
    setIsDemoMode(false); // Also disable demo mode on logout
  };

  const toggleDemoMode = () => {
    if (!isDevelopment) return; // Only allow in development
    setIsDemoMode(prev => {
      const newValue = !prev;
      setIsLoggedIn(newValue); // Sync login state with demo mode
      return newValue;
    });
  };

  // Effective login state: true if logged in OR demo mode is active
  const effectiveIsLoggedIn = isLoggedIn || (isDevelopment && isDemoMode);

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn: effectiveIsLoggedIn, 
      login, 
      logout,
      isDemoMode: isDevelopment && isDemoMode,
      toggleDemoMode,
    }}>
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
