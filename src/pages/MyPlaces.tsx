import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import SavedActivityCard from "@/components/SavedActivityCard";
import SavedActivitiesEmptyState from "@/components/SavedActivitiesEmptyState";
import { mockActivities, Activity } from "@/data/activities";

const MyPlaces = () => {
  // Mock saved data - in real app this would come from backend/state
  const [favorites, setFavorites] = useState<Activity[]>(() => 
    mockActivities.slice(0, 4) // Mock: first 4 activities as favorites
  );
  const [wantToVisit, setWantToVisit] = useState<Activity[]>(() => 
    mockActivities.slice(4, 7) // Mock: next 3 activities as want to visit
  );

  // Simulate async removal with potential failure
  const handleRemoveFromFavorites = async (id: number): Promise<void> => {
    // Simulate API call - uncomment the throw to test error state
    // throw new Error("Network error");
    
    // Simulated delay for realistic feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setFavorites((prev) => prev.filter((activity) => activity.id !== id));
  };

  const handleRemoveFromWantToVisit = async (id: number): Promise<void> => {
    // Simulate API call - uncomment the throw to test error state
    // throw new Error("Network error");
    
    // Simulated delay for realistic feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setWantToVisit((prev) => prev.filter((activity) => activity.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Global header */}
      <Header />

      {/* Page title */}
      <div className="border-b border-border/50">
        <div className="container py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            Moje miejsca
          </h1>
        </div>
      </div>

      {/* Main content */}
      <main className="container py-6 md:py-8">
        <Tabs defaultValue="favorites" className="w-full">
          {/* Segmented control */}
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 md:mb-8">
            <TabsTrigger value="favorites" className="text-sm md:text-base">
              Ulubione
              {favorites.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({favorites.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="wantToVisit" className="text-sm md:text-base">
              Chcę odwiedzić
              {wantToVisit.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({wantToVisit.length})
                </span>
              )}
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
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
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
                        onRemove={handleRemoveFromFavorites}
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
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
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
                        onRemove={handleRemoveFromWantToVisit}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyPlaces;
