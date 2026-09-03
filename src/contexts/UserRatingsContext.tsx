import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { Activity, getActivityById, ensureActivitiesLoaded } from "@/data/activities";
import {
  getRawItem,
  setRawItem,
  getItem,
  removeItem,
  STORAGE_KEYS,
  scopedKey,
  clearForeignScopedKeys,
  hasFreshGuestData,
  touchGuestDataMarker,
  syncGuestDataMarker,
} from "@/lib/storage";
import { requestGuestMigrationConsent } from "@/lib/guestMigration";
import { useDataStatus } from "@/hooks/useDataStatus";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STORAGE_KEY = "familyfun_user_ratings";

type StoredRating = { activityId: number; rating: number; review?: string; ratedAt: string };

function loadRatings(key: string = STORAGE_KEY): Map<number, UserRating> {
  try {
    const raw = getRawItem(key);
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

function saveRatings(ratings: Map<number, UserRating>, key: string = STORAGE_KEY) {
  try {
    const arr = Array.from(ratings.values());
    setRawItem(key, JSON.stringify(arr));
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
  // Remove a rating entirely. `true` = ocena faktycznie zniknęła (baza potwierdziła);
  // `false` = nie było czego usuwać albo zapis się nie powiódł (rollback + toast błędu).
  removeRating: (activityId: number) => Promise<boolean>;
  // Get all rated activities with full activity data
  visitedActivities: (Activity & { userRating: UserRating })[];
  // Count of visited/rated activities
  visitedCount: number;
  /** Ponowne pobranie ocen z serwera (np. po wykonaniu odroczonej intencji gościa). */
  refreshRatings: () => Promise<void>;
  /** Klucz odświeżania agregatu ocen — zmienia się po udanym zapisie/usunięciu. */
  aggregateRefreshKey: number;
}

const UserRatingsContext = createContext<UserRatingsContextType | undefined>(undefined);

export function UserRatingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Map<number, UserRating>>(() => loadRatings());
  const [aggregateRefreshKey, setAggregateRefreshKey] = useState(0);
  const previousUserIdRef = useRef(user?.id);
  // Re-render po załadowaniu katalogu — visitedActivities liczone z getActivities().
  useDataStatus();

  // Lista „Odwiedzone" potrzebuje danych katalogu — dociągnij go leniwie,
  // gdy użytkownik ma jakiekolwiek oceny (inaczej lista byłaby pusta przy liczniku > 0).
  useEffect(() => {
    if (ratings.size > 0) ensureActivitiesLoaded();
  }, [ratings]);

  // Gość: localStorage jest źródłem prawdy pod „gołym" kluczem.
  // Zalogowany: baza jest źródłem prawdy, a lokalne lustro trzymamy pod
  // kluczem właściciela (`familyfun_user_ratings:<user_id>`).
  useEffect(() => {
    if (previousUserIdRef.current && !user) return;
    if (user) {
      saveRatings(ratings, scopedKey(STORAGE_KEY, user.id));
    } else if (ratings.size > 0) {
      saveRatings(ratings);
      syncGuestDataMarker();
    } else {
      removeItem(STORAGE_KEY);
      syncGuestDataMarker();
    }
  }, [ratings, user]);

  // Po zalogowaniu: migruj lokalne oceny do bazy (upsert), potem hydratuj z bazy.
  // Po wylogowaniu: wróć do localStorage.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!user) {
        setRatings(previousUserIdRef.current ? new Map() : loadRatings());
        return;
      }

      // Lustra innych kont są nieaktualne — usuwamy je, start z własnego lustra.
      clearForeignScopedKeys(user.id);
      setRatings(loadRatings(scopedKey(STORAGE_KEY, user.id)));

      // Oceny gościa NIGDY nie migrują automatycznie: wymagana jest ta sama
      // sesja przeglądarki (znacznik po ostatnim wylogowaniu) i jawna zgoda.
      const local = loadRatings();
      if (local.size > 0) {
        if (!hasFreshGuestData()) {
          removeItem(STORAGE_KEY);
          syncGuestDataMarker();
        } else {
          const accepted = await requestGuestMigrationConsent("ratings", local.size);
          if (cancelled) return;
          if (!accepted) {
            removeItem(STORAGE_KEY);
            syncGuestDataMarker();
          } else {
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
            if (!error) {
              removeItem(STORAGE_KEY);
              syncGuestDataMarker();
            }
          }
        }
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

  useEffect(() => {
    previousUserIdRef.current = user?.id;
  }, [user]);

  // Upsert/delete do bazy. Zwraca false przy JAKIMKOLWIEK niepowodzeniu
  // (błąd sieci, 404 brakującej tabeli, RLS, brak potwierdzonego wiersza)
  // → rollback w UI + toast. Nigdy nie zgłasza sukcesu "na słowo".
  const syncToServer = useCallback(
    async (entry: UserRating | null, activityId: number): Promise<boolean> => {
      if (!user) return true;
      try {
        if (entry) {
          const { data, error } = await supabase
            .from("user_ratings")
            .upsert(
              {
                user_id: user.id,
                activity_id: activityId,
                rating: entry.rating,
                review: entry.review ?? null,
              },
              { onConflict: "user_id,activity_id" }
            )
            .select("activity_id");
          if (error || !data || data.length === 0) return false;
          return true;
        }
        const { data, error } = await supabase
          .from("user_ratings")
          .delete()
          .eq("user_id", user.id)
          .eq("activity_id", activityId)
          .select("activity_id");
        if (error) return false;
        // Brak wiersza do usunięcia = nic nie zostało w bazie → traktujemy jako sukces.
        return Array.isArray(data);
      } catch {
        return false;
      }
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
    if (!user) touchGuestDataMarker();
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
    } else {
      setAggregateRefreshKey(k => k + 1);
    }
  }, [ratings, syncToServer, user]);

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

  const removeRating = useCallback(async (activityId: number): Promise<boolean> => {
    const previous = ratings.get(activityId);
    if (!previous) return false;
    setRatings(prev => {
      const newMap = new Map(prev);
      newMap.delete(activityId);
      return newMap;
    });

    const ok = await syncToServer(null, activityId);
    if (!ok) {
      setRatings(prev => new Map(prev).set(activityId, previous));
      toast.error("Nie udało się usunąć oceny. Spróbuj ponownie.");
      return false;
    }
    setAggregateRefreshKey(k => k + 1);
    return true;
  }, [ratings, syncToServer]);

  // JEDNO źródło prawdy: mapa ocen. Dane atrakcji dociągamy przez lookup po id;
  // oceny bez odpowiednika w katalogu nie trafiają ani na listę, ani do licznika.
  const visitedActivities = Array.from(ratings.values())
    .map(userRating => {
      const activity = getActivityById(userRating.activityId);
      return activity ? { ...activity, userRating } : null;
    })
    .filter((entry): entry is Activity & { userRating: UserRating } => entry !== null)
    .sort((a, b) => b.userRating.ratedAt.getTime() - a.userRating.ratedAt.getTime());

  // Świeży odczyt ocen z serwera (bez migracji/dialogów).
  const refreshRatings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_ratings")
      .select("activity_id, rating, review, updated_at, created_at")
      .eq("user_id", user.id);
    if (error || !data) return;
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
  }, [user]);

  return (
    <UserRatingsContext.Provider
      value={{
        getUserRating,
        hasRated,
        rateActivity,
        updateReview,
        removeRating,
        visitedActivities,
        visitedCount: visitedActivities.length,
        refreshRatings,
        aggregateRefreshKey,
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
