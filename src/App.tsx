import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy, useEffect } from "react";
import { trackPageView } from "@/lib/analytics";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedActivitiesProvider } from "@/contexts/SavedActivitiesContext";
import { UserRatingsProvider } from "@/contexts/UserRatingsContext";
import { SubmissionsProvider } from "@/contexts/SubmissionsContext";
import OfflineIndicator from "@/components/OfflineIndicator";
import SubmitActivityFAB from "@/components/SubmitActivityFAB";
import HomeSkeleton from "@/components/HomeSkeleton";
import DataGate from "@/components/DataGate";
import { FEATURES } from "@/lib/featureFlags";
import { loadActivities } from "@/data/activities";
import Index from "./pages/Index";
const ActivityDetailRedirect = lazy(() => import("./pages/ActivityDetailRedirect"));
const MyPlaces = lazy(() => import("./pages/MyPlaces"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ActivityOrCategoryResolver = lazy(() => import("./components/ActivityOrCategoryResolver"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Regulamin = lazy(() => import("./pages/Regulamin"));
const PolitykaPrywatnosci = lazy(() => import("./pages/PolitykaPrywatnosci"));
const Kontakt = lazy(() => import("./pages/Kontakt"));
const ONas = lazy(() => import("./pages/ONas"));
const BlogListPage = lazy(() => import("./pages/BlogListPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
import BottomNav from "./components/BottomNav";
import CookieConsent from "./components/CookieConsent";
import ErrorBoundary from "./components/ErrorBoundary";
import LayoutDiagnostics from "./components/LayoutDiagnostics";

// SPA pageview tracking
const AnalyticsTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
};

// Animated routes component to access location for AnimatePresence
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <ErrorBoundary fallbackLevel="page" key={location.pathname}>
      <Suspense fallback={<HomeSkeleton />}>
        <AnimatePresence mode="popLayout" initial={false}>
          <Routes location={location} key={location.pathname}>
            {/* Widoki wymagające katalogu atrakcji — bramkowane per-widok (DataGate) */}
            <Route path="/" element={<DataGate><Index /></DataGate>} />
            <Route path="/atrakcje/:citySlug/:categorySlug" element={<DataGate><CategoryPage /></DataGate>} />
            <Route path="/atrakcje/:slug" element={<DataGate><ActivityOrCategoryResolver /></DataGate>} />
            <Route path="/activity/:id" element={<DataGate><ActivityDetailRedirect /></DataGate>} />
            <Route path="/my-places" element={<DataGate><MyPlaces /></DataGate>} />
            <Route path="/profile" element={<Profile />} />
            {import.meta.env.DEV && <Route path="/admin" element={<Admin />} />}
            <Route path="/regulamin" element={<Regulamin />} />
            <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
            <Route path="/kontakt" element={<Kontakt />} />
            <Route path="/o-nas" element={<ONas />} />
            {FEATURES.BLOG && (
              <>
                <Route path="/inspiracje" element={<BlogListPage />} />
                <Route path="/inspiracje/:slug" element={<BlogPostPage />} />
              </>
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = () => {
  // Ładowanie katalogu startuje raz, ale nie blokuje renderu — status
  // trzymany w module danych, widoki bramkuje per-route DataGate.
  useEffect(() => {
    loadActivities().catch(() => {
      // Błąd obsługują widoki przez DataGate (status "error").
    });
  }, []);

  return (
    <ErrorBoundary fallbackLevel="page">
      <HelmetProvider>
          <AuthProvider>
            <SavedActivitiesProvider>
              <UserRatingsProvider>
                <SubmissionsProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <OfflineIndicator />
                    <BrowserRouter>
                      <AnalyticsTracker />
                      <AnimatedRoutes />
                      <BottomNav />
                      <SubmitActivityFAB />
                      {FEATURES.COOKIE_CONSENT && <CookieConsent />}
                      <LayoutDiagnostics />
                    </BrowserRouter>
                  </TooltipProvider>
                </SubmissionsProvider>
              </UserRatingsProvider>
            </SavedActivitiesProvider>
          </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
