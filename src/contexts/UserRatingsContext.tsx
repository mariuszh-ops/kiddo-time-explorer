import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Activity, getActivities } from "@/data/activities";
import { getRawItem, setRawItem, getItem, removeItem, STORAGE_KEYS } from "@/lib/storage";
import { useDataStatus } from "@/hooks/useDataStatus";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  removeRating: (activityId: number) => Promise<void>;
  // Get all rated activities with full activity data
  visitedActivities: (Activity & { userRating: UserRating })[];
  // Count of visited/rated activities
  visitedCount: number;
}

const UserRatingsContext = createContext<UserRatingsContextType | undefined>(undefined);

export function UserRatingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Map<number, UserRating>>(() => loadRatings());
  // Re-render po załadowaniu katalogu — visitedActivities liczone z getActivities().
  useDataStatus();

  // Gość: localStorage jest źródłem prawdy. Zalogowany: źródłem jest baza,
  // więc nie nadpisujemy lokalnego cache'u danymi konta.
  useEffect(() => {
    if (!user) saveRatings(ratings);
  }, [ratings, user]);

  // Po zalogowaniu: migruj lokalne oceny do bazy (upsert), potem hydratuj z bazy.
  // Po wylogowaniu: wróć do localStorage.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!user) {
        setRatings(loadRatings());
        return;
      }

      const local = loadRatings();
      if (local.size > 0) {
        const rows = Array.from(local.values()).map(r => ({
          user_id: user.id,
          activity_id: r.activityId,
          rating: r.rating,
          review: r.review ?? null,
        }));
        const { error } = await supabase
          .from("user_ratings")
          .upsert(rows, { onConflict: "user_id,activity_id", ignoreDuplicates: true });
        if (cancelled) return;
        if (!error) removeItem(STORAGE_KEY);
      }

      const { data, error } = await supabase
        .from("user_ratings")
        .select("activity_id, rating, review, updated_at, created_at")
        .eq("user_id", user.id);
      if (cancelled || error || !data) return;

      const map = new Map<number, UserRating>();
      for (const row of data as { activity_id: number; rating: number; review: string | null; updated_at: string; created_at: string }[]) {
        map.set(row.activity_id, {
          activityId: row.activity_id,
          rating: row.rating,
          review: row.review ?? undefined,
          ratedAt: new Date(row.updated_at ?? row.created_at),
        });
      }
      setRatings(map);
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Upsert/delete do bazy. Zwraca false przy błędzie sieciowym → rollback w UI.
  const syncToServer = useCallback(
    async (entry: UserRating | null, activityId: number): Promise<boolean> => {
      if (!user) return true;
      if (entry) {
        const { error } = await supabase.from("user_ratings").upsert(
          {
            user_id: user.id,
            activity_id: activityId,
            rating: entry.rating,
            review: entry.review ?? null,
          },
          { onConflict: "user_id,activity_id" }
        );
        return !error;
      }
      const { error } = await supabase
        .from("user_ratings")
        .delete()
        .eq("user_id", user.id)
        .eq("activity_id", activityId);
      return !error;
    },
    [user]
  );

  const getUserRating = useCallback((activityId: number): UserRating | undefined => {
    return ratings.get(activityId);
  }, [ratings]);

  const hasRated = useCallback((activityId: number): boolean => {
    return ratings.has(activityId);
  }, [ratings]);

  const rateActivity = useCallback(async (activityId: number, rating: number, review?: string): Promise<void> => {
    const previous = ratings.get(activityId);
    const next: UserRating = {
      activityId,
      rating,
      review: review?.trim() || previous?.review,
      ratedAt: new Date(),
    };
    // Optimistic update.
    setRatings(prev => new Map(prev).set(activityId, next));

    const ok = await syncToServer(next, activityId);
    if (!ok) {
      setRatings(prev => {
        const newMap = new Map(prev);
        if (previous) newMap.set(activityId, previous);
        else newMap.delete(activityId);
        return newMap;
      });
      toast.error("Nie udało się zapisać oceny. Spróbuj ponownie.");
    }
  }, [ratings, syncToServer]);

  const updateReview = useCallback(async (activityId: number, review: string): Promise<void> => {
    const previous = ratings.get(activityId);
    if (!previous) return;
    const next: UserRating = { ...previous, review: review.trim() || undefined };
    setRatings(prev => new Map(prev).set(activityId, next));

    const ok = await syncToServer(next, activityId);
    if (!ok) {
      setRatings(prev => new Map(prev).set(activityId, previous));
      toast.error("Nie udało się zapisać opinii. Spróbuj ponownie.");
    }
  }, [ratings, syncToServer]);

  const removeRating = useCallback(async (activityId: number) => {
    const previous = ratings.get(activityId);
    if (!previous) return;
    setRatings(prev => {
      const newMap = new Map(prev);
      newMap.delete(activityId);
      return newMap;
    });

    const ok = await syncToServer(null, activityId);
    if (!ok) {
      setRatings(prev => new Map(prev).set(activityId, previous));
      toast.error("Nie udało się usunąć oceny. Spróbuj ponownie.");
    }
  }, [ratings, syncToServer]);

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
