import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy, useEffect, useState } from "react";
import { trackPageView } from "@/lib/analytics";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedActivitiesProvider } from "@/contexts/SavedActivitiesContext";
import { UserRatingsProvider } from "@/contexts/UserRatingsContext";
import { SubmissionsProvider } from "@/contexts/SubmissionsContext";
import OfflineIndicator from "@/components/OfflineIndicator";
import SubmitActivityFAB from "@/components/SubmitActivityFAB";
import HomeSkeleton from "@/components/HomeSkeleton";
import { FEATURES } from "@/lib/featureFlags";
import { loadActivities } from "@/data/activities";
import DataLoadError from "@/components/DataLoadError";
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

const queryClient = new QueryClient();

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
            <Route path="/" element={<Index />} />
            <Route path="/atrakcje/:citySlug/:categorySlug" element={<CategoryPage />} />
            <Route path="/atrakcje/:slug" element={<ActivityOrCategoryResolver />} />
            <Route path="/activity/:id" element={<ActivityDetailRedirect />} />
            <Route path="/my-places" element={<MyPlaces />} />
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
  const [dataStatus, setDataStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    loadActivities()
      .then(() => setDataStatus("success"))
      .catch(() => setDataStatus("error"));
  }, []);

  if (dataStatus === "loading") {
    return <HomeSkeleton />;
  }

  if (dataStatus === "error") {
    return <DataLoadError />;
  }

  return (
    <ErrorBoundary fallbackLevel="page">
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
