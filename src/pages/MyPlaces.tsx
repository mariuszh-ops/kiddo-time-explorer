import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import SavedActivityCard from "@/components/SavedActivityCard";
import SavedActivitiesEmptyState from "@/components/SavedActivitiesEmptyState";
import VisitedActivityCard from "@/components/VisitedActivityCard";
import PageTransition from "@/components/PageTransition";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";


const MyPlaces = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "wantToVisit" ? "wantToVisit" : tabParam === "visited" ? "visited" : "favorites";

  // Scroll to top when component mounts
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
      <div className="min-h-screen bg-background">
      {/* Global header */}
      <Header />

      {/* Page title */}
      <div className="border-b border-border/50">
        <div className="container py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            Moje miejsca
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Twoje zapisane atrakcje w jednym miejscu
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="container py-6 md:py-8">
        <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
          {/* Segmented control with dynamic counts */}
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6 md:mb-8">
            <TabsTrigger value="favorites" className="text-sm md:text-base">
              Ulubione
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({favoritesCount})
              </span>
            </TabsTrigger>
            <TabsTrigger value="wantToVisit" className="text-sm md:text-base">
              Chcę odwiedzić
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({wantToVisitCount})
              </span>
            </TabsTrigger>
            <TabsTrigger value="visited" className="text-sm md:text-base">
              Odwiedzone
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({visitedCount})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Favorites tab */}
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
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        transition: { delay: index * 0.03 }
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <SavedActivityCard
                        id={activity.id}
                        title={activity.title}
                        location={activity.location}
                        rating={activity.rating}
                        reviewCount={activity.reviewCount}
                        ageRange={activity.ageRange}
                        matchPercentage={activity.matchPercentage}
                        imageUrl={activity.imageUrl}
                        tags={activity.tags}
                        listType="favorites"
                        onRemove={removeFromFavorites}
                        type={activity.type}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* Want to visit tab */}
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
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        transition: { delay: index * 0.03 }
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <SavedActivityCard
                        id={activity.id}
                        title={activity.title}
                        location={activity.location}
                        rating={activity.rating}
                        reviewCount={activity.reviewCount}
                        ageRange={activity.ageRange}
                        matchPercentage={activity.matchPercentage}
                        imageUrl={activity.imageUrl}
                        tags={activity.tags}
                        listType="wantToVisit"
                        onRemove={removeFromWantToVisit}
                        type={activity.type}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>

          {/* Visited tab */}
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
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        transition: { delay: index * 0.03 }
                      }}
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
      </main>
    </div>
    </PageTransition>
  );
};

export default MyPlaces;
