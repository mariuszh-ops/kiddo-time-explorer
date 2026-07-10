import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { catalogClient } from "@/lib/catalogClient";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { Loader2 } from "lucide-react";

const TABS = [
  { to: "/admin/katalog", label: "Katalog" },
  { to: "/admin/do-przejrzenia", label: "Do przejrzenia" },
  { to: "/admin/opinie", label: "Opinie" },
  { to: "/admin/zgloszenia", label: "Zgłoszenia" },
  { to: "/admin/dashboard", label: "Dashboard" },
];

type AdminStatus = "checking" | "allowed" | "denied";

const AdminLayout = () => {
  const { isLoggedIn, user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [status, setStatus] = useState<AdminStatus>("checking");

  // Auth gate — open existing sign-in flow if not logged in.
  useEffect(() => {
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      setStatus("checking");
    } else {
      setAuthModalOpen(false);
    }
  }, [isLoggedIn]);

  // is_admin check on catalog client
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setStatus("checking");
    catalogClient
      .rpc("is_admin")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || data !== true) {
          setStatus("denied");
        } else {
          setStatus("allowed");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  // Redirect bare /admin to /admin/katalog
  if (isLoggedIn && status === "allowed" && location.pathname === "/admin") {
    return <Navigate to="/admin/katalog" replace />;
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Panel FamilyFun</title>
      </Helmet>

      <AuthRequiredModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          if (!isLoggedIn) navigate("/", { replace: true });
        }}
        onGoogleClick={() => signInWithGoogle()}
        onEmailClick={() => signInWithGoogle()}
        onLoginClick={() => signInWithGoogle()}
      />

      {!isLoggedIn ? null : status === "checking" ? (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Sprawdzanie uprawnień…
        </div>
      ) : status === "denied" ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">Brak uprawnień</h1>
          <p className="text-muted-foreground max-w-md">
            To konto nie ma dostępu do panelu.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>Wróć na stronę główną</Button>
        </div>
      ) : (
        <div className="min-h-screen bg-muted/30">
          <header className="bg-card border-b border-border sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
              <h1 className="text-lg font-semibold">Panel FamilyFun</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground truncate max-w-[240px]">
                  {user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate("/", { replace: true });
                  }}
                >
                  Wyloguj
                </Button>
              </div>
            </div>
            <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) =>
                    `px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-6">
            <Outlet />
          </main>
        </div>
      )}
    </>
  );
};

export default AdminLayout;