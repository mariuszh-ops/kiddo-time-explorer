import React, { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SavedActivityCard from "@/components/SavedActivityCard";
import SavedActivitiesEmptyState from "@/components/SavedActivitiesEmptyState";
import VisitedActivityCard from "@/components/VisitedActivityCard";
import PageTransition from "@/components/PageTransition";
import SubmitActivityCTA from "@/components/SubmitActivityCTA";
import TripPlannerFavorites from "@/components/TripPlannerFavorites";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { FEATURES } from "@/lib/featureFlags";
import { Heart, MapPin, Plus, Image, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthRequiredModal from "@/components/AuthRequiredModal";


const CollectionsView = () => {
  const { favorites, wantToVisit, favoritesCount, wantToVisitCount } = useSavedActivities();

  // Mock collections for placeholder UI
  const collections = [
    {
      name: "Ulubione",
      count: favoritesCount,
      icon: Heart,
      images: favorites.slice(0, 3).map(a => a.imageUrl),
      color: "text-red-500",
    },
    {
      name: "Chcę odwiedzić",
      count: wantToVisitCount,
      icon: MapPin,
      images: wantToVisit.slice(0, 3).map(a => a.imageUrl),
      color: "text-primary",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {collections.map((col) => (
          <div
            key={col.name}
            className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          >
            {/* Miniaturki */}
            <div className="grid grid-cols-3 gap-0.5 aspect-[3/1.2]">
              {col.images.length > 0 ? (
                col.images.map((img, i) => (
                  <div key={i} className="bg-muted overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))
              ) : (
                <div className="col-span-3 bg-accent flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {col.images.length > 0 && col.images.length < 3 && (
                Array.from({ length: 3 - col.images.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-accent" />
                ))
              )}
            </div>
            {/* Info */}
            <div className="p-3">
              <div className="flex items-center gap-2">
                <col.icon className={`w-4 h-4 ${col.color}`} />
                <span className="font-medium text-foreground text-sm">{col.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {col.count} {col.count === 1 ? "atrakcja" : col.count < 5 ? "atrakcje" : "atrakcji"}
              </p>
            </div>
          </div>
        ))}

        {/* Nowa kolekcja */}
        <button className="flex flex-col items-center justify-center gap-2 bg-card border border-dashed border-border rounded-xl p-8 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer min-h-[140px]">
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Nowa kolekcja</span>
        </button>
      </div>
    </div>
  );
};


const MyPlaces = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "wantToVisit" ? "wantToVisit" : tabParam === "visited" ? "visited" : "favorites";
  const { isLoggedIn, login, signInWithGoogle } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const handleAuthAction = () => {
    login();
    setIsAuthModalOpen(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  // Logged-out empty state
  if (!isLoggedIn) {
    return (
      <PageTransition>
        <SEOHead title="Moje zapisane miejsca" description="Twoje ulubione atrakcje i lista miejsc do odwiedzenia." path="/my-places" noindex />
        <div className="min-h-screen bg-background">
          <Header />
          <main className="flex flex-col items-center justify-center py-24 md:py-32 text-center max-w-sm mx-auto px-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-accent-foreground" />
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-2">
              Twoje ulubione miejsca
            </h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Zaloguj się, aby zapisywać atrakcje i planować wizyty z rodziną.
            </p>
            <div className="w-full max-w-xs space-y-3">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                className="gap-3 w-full border-gray-300"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Kontynuuj przez Google
              </Button>
              <Button onClick={() => setIsAuthModalOpen(true)} className="gap-2 w-full">
                <LogIn className="w-4 h-4" />
                Zaloguj się
              </Button>
            </div>
          </main>
          <Footer />
        </div>
        <AuthRequiredModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onGoogleClick={handleAuthAction}
          onEmailClick={handleAuthAction}
          onLoginClick={handleAuthAction}
        />
      </PageTransition>
    );
  }

  return <MyPlacesContent defaultTab={defaultTab} />;
};

const MyPlacesContent = ({ defaultTab }: { defaultTab: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const {
    favorites,
    wantToVisit,
    removeFromFavorites,
    removeFromWantToVisit,
    favoritesCount,
    wantToVisitCount,
  } = useSavedActivities();

  const { visitedActivities, visitedCount } = useUserRatings();
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <PageTransition>
      <SEOHead title="Moje zapisane miejsca" description="Twoje ulubione atrakcje i lista miejsc do odwiedzenia." path="/my-places" noindex />
      <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b border-border/50">
        <div className="container py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                Moje miejsca
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Twoje zapisane atrakcje w jednym miejscu
              </p>
            </div>
            <SubmitActivityCTA className="self-start" />
          </div>
        </div>
      </div>

      <main className="container py-6 md:py-8 pb-20 md:pb-8">
        {FEATURES.COLLECTIONS ? (
          <>
            {/* Collections grid */}
            <div className="mb-8">
              <h2 className="text-lg font-serif font-semibold text-foreground mb-4">Kolekcje</h2>
              <CollectionsView />
            </div>

            {/* Visited tab stays separate */}
            <div>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                Odwiedzone
                <span className="ml-2 text-sm font-normal text-muted-foreground">({visitedCount})</span>
              </h2>
              {visitedActivities.length === 0 ? (
                <SavedActivitiesEmptyState type="visited" />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
                >
                  <AnimatePresence mode="popLayout">
                    {visitedActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.03 } }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <VisitedActivityCard activity={activity} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6 md:mb-8">
              <TabsTrigger value="favorites" className="text-sm md:text-base">
                Ulubione
                <span className="ml-1.5 text-xs text-muted-foreground">({favoritesCount})</span>
              </TabsTrigger>
              <TabsTrigger value="wantToVisit" className="text-sm md:text-base">
                Chcę odwiedzić
                <span className="ml-1.5 text-xs text-muted-foreground">({wantToVisitCount})</span>
              </TabsTrigger>
              <TabsTrigger value="visited" className="text-sm md:text-base">
                Odwiedzone
                <span className="ml-1.5 text-xs text-muted-foreground">({visitedCount})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites">
              {favorites.length === 0 ? (
                <SavedActivitiesEmptyState type="favorites" />
              ) : FEATURES.TRIP_PLANNER ? (
                <TripPlannerFavorites favorites={favorites} onRemove={removeFromFavorites} />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {favorites.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.03 } }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <SavedActivityCard
                          id={activity.id} title={activity.title} location={activity.location}
                          rating={activity.rating} reviewCount={activity.reviewCount}
                          ageRange={activity.ageRange} matchPercentage={activity.matchPercentage}
                          imageUrl={activity.imageUrl} tags={activity.tags}
                          listType="favorites" onRemove={removeFromFavorites}
                          type={activity.type} slug={activity.slug}
                          google_rating={activity.google_rating}
                          google_review_count={activity.google_review_count}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="wantToVisit">
              {wantToVisit.length === 0 ? (
                <SavedActivitiesEmptyState type="wantToVisit" />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {wantToVisit.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.03 } }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <SavedActivityCard
                          id={activity.id} title={activity.title} location={activity.location}
                          rating={activity.rating} reviewCount={activity.reviewCount}
                          ageRange={activity.ageRange} matchPercentage={activity.matchPercentage}
                          imageUrl={activity.imageUrl} tags={activity.tags}
                          listType="wantToVisit" onRemove={removeFromWantToVisit}
                          type={activity.type} slug={activity.slug}
                          google_rating={activity.google_rating}
                          google_review_count={activity.google_review_count}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="visited">
              {visitedActivities.length === 0 ? (
                <SavedActivitiesEmptyState type="visited" />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
                >
                  <AnimatePresence mode="popLayout">
                    {visitedActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1, transition: { delay: index * 0.03 } }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <VisitedActivityCard activity={activity} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
    </PageTransition>
  );
};

export default MyPlaces;
