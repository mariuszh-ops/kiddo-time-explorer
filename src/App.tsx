import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { SavedActivitiesProvider } from "@/contexts/SavedActivitiesContext";
import { UserRatingsProvider } from "@/contexts/UserRatingsContext";
import OfflineIndicator from "@/components/OfflineIndicator";
import { FEATURES } from "@/lib/featureFlags";
import Index from "./pages/Index";
import ActivityDetail from "./pages/ActivityDetail";
import ActivityDetailRedirect from "./pages/ActivityDetailRedirect";
import MyPlaces from "./pages/MyPlaces";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Regulamin from "./pages/Regulamin";
import PolitykaPrywatnosci from "./pages/PolitykaPrywatnosci";
import Kontakt from "./pages/Kontakt";
import BlogListPage from "./pages/BlogListPage";
import BlogPostPage from "./pages/BlogPostPage";
import BottomNav from "./components/BottomNav";

const queryClient = new QueryClient();

// Animated routes component to access location for AnimatePresence
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/atrakcje/:slug" element={<ActivityDetail />} />
        <Route path="/activity/:id" element={<ActivityDetailRedirect />} />
        <Route path="/my-places" element={<MyPlaces />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/regulamin" element={<Regulamin />} />
        <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
        <Route path="/kontakt" element={<Kontakt />} />
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
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SavedActivitiesProvider>
          <UserRatingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <BrowserRouter>
                <AnimatedRoutes />
                <BottomNav />
              </BrowserRouter>
            </TooltipProvider>
          </UserRatingsProvider>
        </SavedActivitiesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
