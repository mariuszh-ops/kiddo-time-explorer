import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy } from "react";
import { RealNavigationTypeContext } from "@/lib/navigationType";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedActivitiesProvider } from "@/contexts/SavedActivitiesContext";
import { UserRatingsProvider } from "@/contexts/UserRatingsContext";
import OfflineIndicator from "@/components/OfflineIndicator";
import SubmitActivityFAB from "@/components/SubmitActivityFAB";
import HomeSkeleton from "@/components/HomeSkeleton";
import DataGate from "@/components/DataGate";
import { FEATURES } from "@/lib/featureFlags";
import SkipLink from "./components/SkipLink";

import Index from "./pages/Index";
const ActivityDetailRedirect = lazy(() => import("./pages/ActivityDetailRedirect"));
const MyPlaces = lazy(() => import("./pages/MyPlaces"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const BlogListPage = lazy(() => import("./pages/BlogListPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const IndexDirectory = lazy(() => import("./pages/IndexDirectory"));
const IndexRegion = lazy(() => import("./pages/IndexRegion"));
import BottomNav from "./components/BottomNav";
import CookieConsent from "./components/CookieConsent";
import ErrorBoundary from "./components/ErrorBoundary";
import LayoutDiagnostics from "./components/LayoutDiagnostics";
import AuthReturnHandler from "./components/AuthReturnHandler";
import AuthLinkErrorHandler from "./components/AuthLinkErrorHandler";
import { PendingIntentProvider } from "./contexts/PendingIntentContext";
import PendingIntentRunner from "./components/PendingIntentRunner";
import SessionExpiredHandler from "./components/SessionExpiredHandler";
import GuestDataMigrationDialog from "./components/GuestDataMigrationDialog";

// Pageview: liczy je WYLACZNIE skrypt Plausible z index.html (script.js sam
// sledzi History API, wiec nawigacje SPA tez sa raportowane). Nie dodawac tu
// wlasnego trackPageView — kazda odslona byla wtedy liczona dwa razy (N-01).

// Animated routes component to access location for AnimatePresence
const AnimatedRoutes = () => {
  const location = useLocation();
  // Prawdziwy typ nawigacji. Wewnątrz <Routes location={…}> react-router raportuje
  // zawsze "POP" — dlatego czytamy go tutaj i rozdajemy kontekstem.
  const navigationType = useNavigationType();

  return (
    <RealNavigationTypeContext.Provider value={navigationType}>
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
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/indeks" element={<IndexDirectory />} />
            <Route path="/indeks/:regionSlug" element={<IndexRegion />} />
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
    </RealNavigationTypeContext.Provider>
  );
};

const App = () => {
  // Pełny katalog NIE jest już pobierany na starcie. Widoki korzystają
  // z zapytań punktowych (count head:true, SELECT z limitem), a pełny zbiór
  // dociąga się leniwie przez ensureActivitiesLoaded() tylko tam, gdzie
  // naprawdę jest potrzebny (filtry, mapa, ulubione).
  return (
    <ErrorBoundary fallbackLevel="page">
      <HelmetProvider>
          <AuthProvider>
            <PendingIntentProvider>
            <SavedActivitiesProvider>
              <UserRatingsProvider>
                <TooltipProvider>
                    <PendingIntentRunner />
                    <Toaster />
                    <Sonner />
                    <OfflineIndicator />
                    <SessionExpiredHandler />
                    <AuthLinkErrorHandler />
                    <GuestDataMigrationDialog />
                    <BrowserRouter>
                      <SkipLink />
                      <AuthReturnHandler />
                      <AnimatedRoutes />
                      <BottomNav />
                      {FEATURES.SUBMIT_ACTIVITY && <SubmitActivityFAB />}
                      {FEATURES.COOKIE_CONSENT && <CookieConsent />}
                      <LayoutDiagnostics />
                    </BrowserRouter>
                </TooltipProvider>
              </UserRatingsProvider>
            </SavedActivitiesProvider>
            </PendingIntentProvider>
          </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
