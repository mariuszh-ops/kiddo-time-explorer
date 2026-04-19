import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Activity, getActivities } from "@/data/activities";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

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
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(
    () => new Set(getItem<number[]>(STORAGE_KEYS.FAVORITES, []))
  );
  const [wantToVisitIds, setWantToVisitIds] = useState<Set<number>>(
    () => new Set(getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, []))
  );

  useEffect(() => {
    setItem(STORAGE_KEYS.FAVORITES, [...favoriteIds]);
  }, [favoriteIds]);

  useEffect(() => {
    setItem(STORAGE_KEYS.WANT_TO_VISIT, [...wantToVisitIds]);
  }, [wantToVisitIds]);

  const favorites = getActivities().filter(a => favoriteIds.has(a.id));
  const wantToVisit = getActivities().filter(a => wantToVisitIds.has(a.id));

  const isFavorite = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);
  const isWantToVisit = useCallback((id: number) => wantToVisitIds.has(id), [wantToVisitIds]);

  const toggleFavorite = useCallback(async (activityId: number): Promise<boolean> => {
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
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const removeFromWantToVisit = useCallback(async (id: number): Promise<void> => {
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
