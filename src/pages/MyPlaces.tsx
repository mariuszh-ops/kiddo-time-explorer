import { useEffect } from "react";
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
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import { FEATURES } from "@/lib/featureFlags";
import { Heart, MapPin, Plus, Image } from "lucide-react";
import { Button } from "@/components/ui/button";


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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
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
      <SEOHead title="Moje zapisane miejsca" description="Twoje ulubione atrakcje i lista miejsc do odwiedzenia." path="/my-places" />
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

      <main className="container py-6 md:py-8 pb-20 sm:pb-8">
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
