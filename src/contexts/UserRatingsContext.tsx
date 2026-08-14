import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Activity, getActivities } from "@/data/activities";
import { getRawItem, setRawItem, getItem, removeItem, STORAGE_KEYS } from "@/lib/storage";
import { useDataStatus } from "@/hooks/useDataStatus";

const STORAGE_KEY = "familyfun_user_ratings";

type StoredRating = { activityId: number; rating: number; review?: string; ratedAt: string };

function loadRatings(): Map<number, UserRating> {
  try {
    const raw = getRawItem(STORAGE_KEY);
    const map = new Map<number, UserRating>();
    if (raw) {
      const arr: StoredRating[] = JSON.parse(raw);
      for (const r of arr) map.set(r.activityId, { ...r, ratedAt: new Date(r.ratedAt) });
    }
    return migrateLegacyRatings(map);
  } catch {
    return new Map();
  }
}

/**
 * Migracja starych ocen z klucza "ff_inline_ratings" (InlineRatingAction)
 * do jednego źródła prawdy. Stary klucz jest usuwany.
 */
function migrateLegacyRatings(map: Map<number, UserRating>): Map<number, UserRating> {
  try {
    const legacy = getItem<Record<string, number>>(STORAGE_KEYS.INLINE_RATINGS, {});
    const entries = Object.entries(legacy);
    if (entries.length === 0) return map;
    for (const [id, rating] of entries) {
      const activityId = Number(id);
      if (!Number.isFinite(activityId) || map.has(activityId)) continue;
      map.set(activityId, { activityId, rating, ratedAt: new Date() });
    }
    removeItem(STORAGE_KEYS.INLINE_RATINGS);
  } catch {
    // silent
  }
  return map;
}

function saveRatings(ratings: Map<number, UserRating>) {
  try {
    const arr = Array.from(ratings.values());
    setRawItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // localStorage unavailable — silent fail
  }
}

export interface UserRating {
  activityId: number;
  rating: number; // 1-5 stars
  review?: string; // Optional review text
  ratedAt: Date;
}

interface UserRatingsContextType {
  // Get user's rating for an activity
  getUserRating: (activityId: number) => UserRating | undefined;
  // Check if user has rated an activity
  hasRated: (activityId: number) => boolean;
  // Add or update a rating
  rateActivity: (activityId: number, rating: number, review?: string) => Promise<void>;
  // Update just the review
  updateReview: (activityId: number, review: string) => Promise<void>;
  // Remove a rating entirely
  removeRating: (activityId: number) => void;
  // Get all rated activities with full activity data
  visitedActivities: (Activity & { userRating: UserRating })[];
  // Count of visited/rated activities
  visitedCount: number;
}

const UserRatingsContext = createContext<UserRatingsContextType | undefined>(undefined);

export function UserRatingsProvider({ children }: { children: ReactNode }) {
  const [ratings, setRatings] = useState<Map<number, UserRating>>(() => loadRatings());
  // Re-render po załadowaniu katalogu — visitedActivities liczone z getActivities().
  useDataStatus();

  useEffect(() => {
    saveRatings(ratings);
  }, [ratings]);

  const getUserRating = useCallback((activityId: number): UserRating | undefined => {
    return ratings.get(activityId);
  }, [ratings]);

  const hasRated = useCallback((activityId: number): boolean => {
    return ratings.has(activityId);
  }, [ratings]);

  const rateActivity = useCallback(async (activityId: number, rating: number, review?: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setRatings(prev => {
      const newMap = new Map(prev);
      newMap.set(activityId, {
        activityId,
        rating,
        review: review?.trim() || undefined,
        ratedAt: new Date(),
      });
      return newMap;
    });
  }, []);

  const updateReview = useCallback(async (activityId: number, review: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setRatings(prev => {
      const existing = prev.get(activityId);
      if (!existing) return prev;
      
      const newMap = new Map(prev);
      newMap.set(activityId, {
        ...existing,
        review: review.trim() || undefined,
      });
      return newMap;
    });
  }, []);

  const removeRating = useCallback((activityId: number) => {
    setRatings(prev => {
      if (!prev.has(activityId)) return prev;
      const newMap = new Map(prev);
      newMap.delete(activityId);
      return newMap;
    });
  }, []);

  // Get all visited activities with their ratings
  const visitedActivities = getActivities()
    .filter(activity => ratings.has(activity.id))
    .map(activity => ({
      ...activity,
      userRating: ratings.get(activity.id)!,
    }))
    .sort((a, b) => b.userRating.ratedAt.getTime() - a.userRating.ratedAt.getTime());

  return (
    <UserRatingsContext.Provider
      value={{
        getUserRating,
        hasRated,
        rateActivity,
        updateReview,
        removeRating,
        visitedActivities,
        visitedCount: ratings.size,
      }}
    >
      {children}
    </UserRatingsContext.Provider>
  );
}

export function useUserRatings() {
  const context = useContext(UserRatingsContext);
  if (context === undefined) {
    throw new Error("useUserRatings must be used within a UserRatingsProvider");
  }
  return context;
}
