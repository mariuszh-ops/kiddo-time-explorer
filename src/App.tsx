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
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminKatalog = lazy(() => import("./pages/admin/AdminKatalog"));
const AdminDoPrzejrzenia = lazy(() => import("./pages/admin/AdminDoPrzejrzenia"));
const AdminOpinie = lazy(() => import("./pages/admin/AdminOpinie"));
const AdminZgloszenia = lazy(() => import("./pages/admin/AdminZgloszenia"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ActivityOrCategoryResolver = lazy(() => import("./components/ActivityOrCategoryResolver"));
const RegionRouteResolver = lazy(() => import("./components/RegionRouteResolver"));
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
import AuthReturnHandler from "./components/AuthReturnHandler";

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
            {/* Katalog ładowany asynchronicznie z Supabase; poszczególne widoki
                obsługują stany loading/empty samodzielnie. */}
            <Route path="/" element={<DataGate><Index /></DataGate>} />
            <Route path="/atrakcje/:citySlug/:categorySlug" element={<DataGate><CategoryPage /></DataGate>} />
            <Route path="/atrakcje/:slug" element={<DataGate><ActivityOrCategoryResolver /></DataGate>} />
            <Route path="/activity/:id" element={<DataGate><ActivityDetailRedirect /></DataGate>} />
            <Route path="/kategoria/:categorySlug" element={<DataGate><CategoryPage /></DataGate>} />
            <Route path="/my-places" element={<DataGate><MyPlaces /></DataGate>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminKatalog />} />
              <Route path="katalog" element={<AdminKatalog />} />
              <Route path="do-przejrzenia" element={<AdminDoPrzejrzenia />} />
              <Route path="opinie" element={<AdminOpinie />} />
              <Route path="zgloszenia" element={<AdminZgloszenia />} />
              <Route path="dashboard" element={<AdminDashboard />} />
            </Route>
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
            {/* Krótkie URL-e województw: /{region} i /{region}/{type} */}
            <Route path="/:regionSlug" element={<DataGate><RegionRouteResolver /></DataGate>} />
            <Route path="/:regionSlug/:categorySlug" element={<DataGate><RegionRouteResolver /></DataGate>} />
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
                      <AuthReturnHandler />
                      <AnimatedRoutes />
                      <BottomNav />
                      {FEATURES.SUBMIT_ACTIVITY && <SubmitActivityFAB />}
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
