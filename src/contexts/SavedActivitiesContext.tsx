import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Activity, mockActivities } from "@/data/activities";

// Przyszła struktura kolekcji (FEATURES.COLLECTIONS):
// interface Collection {
//   id: string;
//   name: string;           // np. "Weekendowe pomysły", "Na deszcz"
//   activityIds: number[];
//   createdAt: Date;
//   color?: string;         // opcjonalny kolor kolekcji
//   icon?: string;          // opcjonalna ikona
// }
//
// Domyślne kolekcje (predefiniowane, nieusuwalne):
// - "Ulubione" (zastępuje obecne favorites)
// - "Chcę odwiedzić" (zastępuje obecne wantToVisit)
//
// Użytkownik może tworzyć własne: "Na deszcz", "Wakacje", "Z dziadkami"
//
// UI: Na stronie "Zapisane" — lista kolekcji jako karty.
//     Przy zapisywaniu (serce) — modal "Zapisz do:" z checkboxami kolekcji.
//     Wzorzec: Airbnb "Save to list"

interface SavedActivitiesContextType {
  favorites: Activity[];
  wantToVisit: Activity[];
  isFavorite: (id: number) => boolean;
  isWantToVisit: (id: number) => boolean;
  toggleFavorite: (activityId: number) => Promise<boolean>;
  toggleWantToVisit: (activityId: number) => Promise<boolean>;
  removeFromFavorites: (id: number) => Promise<void>;
  removeFromWantToVisit: (id: number) => Promise<void>;
  favoritesCount: number;
  wantToVisitCount: number;
}

const SavedActivitiesContext = createContext<SavedActivitiesContextType | undefined>(undefined);

export function SavedActivitiesProvider({ children }: { children: ReactNode }) {
  // Initialize with mock data for demo purposes
  // 4 favorites: IDs 1, 5, 8, 12
  // 7 want to visit: IDs 2, 3, 6, 10, 14, 17, 20
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [wantToVisitIds, setWantToVisitIds] = useState<Set<number>>(new Set());

  // Get full activity objects for saved items
  const favorites = mockActivities.filter(a => favoriteIds.has(a.id));
  const wantToVisit = mockActivities.filter(a => wantToVisitIds.has(a.id));

  const isFavorite = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);
  const isWantToVisit = useCallback((id: number) => wantToVisitIds.has(id), [wantToVisitIds]);

  const toggleFavorite = useCallback(async (activityId: number): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    let newState = false;
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
        newState = false;
      } else {
        newSet.add(activityId);
        newState = true;
      }
      return newSet;
    });
    
    return newState;
  }, []);

  const toggleWantToVisit = useCallback(async (activityId: number): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    let newState = false;
    setWantToVisitIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
        newState = false;
      } else {
        newSet.add(activityId);
        newState = true;
      }
      return newSet;
    });
    
    return newState;
  }, []);

  const removeFromFavorites = useCallback(async (id: number): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Uncomment to test error state:
    // if (Math.random() > 0.5) throw new Error("Network error");
    
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const removeFromWantToVisit = useCallback(async (id: number): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Uncomment to test error state:
    // if (Math.random() > 0.5) throw new Error("Network error");
    
    setWantToVisitIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  return (
    <SavedActivitiesContext.Provider
      value={{
        favorites,
        wantToVisit,
        isFavorite,
        isWantToVisit,
        toggleFavorite,
        toggleWantToVisit,
        removeFromFavorites,
        removeFromWantToVisit,
        favoritesCount: favoriteIds.size,
        wantToVisitCount: wantToVisitIds.size,
      }}
    >
      {children}
    </SavedActivitiesContext.Provider>
  );
}

export function useSavedActivities() {
  const context = useContext(SavedActivitiesContext);
  if (context === undefined) {
    throw new Error("useSavedActivities must be used within a SavedActivitiesProvider");
  }
  return context;
}
