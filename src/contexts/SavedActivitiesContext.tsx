import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Activity, getActivities, slugFromId, idFromSlug } from "@/data/activities";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, isLoggedIn } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(
    () => new Set(getItem<number[]>(STORAGE_KEYS.FAVORITES, []))
  );
  const [wantToVisitIds, setWantToVisitIds] = useState<Set<number>>(
    () => new Set(getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, []))
  );

  // Persist to localStorage ONLY when the user is a guest. When logged in the
  // source of truth is Supabase; we avoid overwriting the guest cache with
  // account data so that logout can fall back to a clean local state.
  useEffect(() => {
    if (!isLoggedIn) setItem(STORAGE_KEYS.FAVORITES, [...favoriteIds]);
  }, [favoriteIds, isLoggedIn]);
  useEffect(() => {
    if (!isLoggedIn) setItem(STORAGE_KEYS.WANT_TO_VISIT, [...wantToVisitIds]);
  }, [wantToVisitIds, isLoggedIn]);

  // On login: merge local (guest) saved items into Supabase, then hydrate
  // state from Supabase (source of truth). On logout: reset to localStorage.
  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      if (!user) {
        // Guest — restore from localStorage.
        setFavoriteIds(new Set(getItem<number[]>(STORAGE_KEYS.FAVORITES, [])));
        setWantToVisitIds(new Set(getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, [])));
        return;
      }

      // Merge guest cache → Supabase.
      const localFav = getItem<number[]>(STORAGE_KEYS.FAVORITES, []);
      const localWtv = getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, []);
      const toInsert: { user_id: string; activity_slug: string; kind: "favorite" | "want_to_visit" }[] = [];
      for (const id of localFav) {
        const slug = slugFromId(id);
        if (slug) toInsert.push({ user_id: user.id, activity_slug: slug, kind: "favorite" });
      }
      for (const id of localWtv) {
        const slug = slugFromId(id);
        if (slug) toInsert.push({ user_id: user.id, activity_slug: slug, kind: "want_to_visit" });
      }
      if (toInsert.length > 0) {
        await supabase
          .from("saved_activities")
          .upsert(toInsert, { onConflict: "user_id,activity_slug,kind", ignoreDuplicates: true });
      }

      const { data, error } = await supabase
        .from("saved_activities")
        .select("activity_slug, kind")
        .eq("user_id", user.id);
      if (cancelled || error || !data) return;

      const fav = new Set<number>();
      const wtv = new Set<number>();
      for (const row of data) {
        const id = idFromSlug(row.activity_slug);
        if (id == null) continue;
        if (row.kind === "favorite") fav.add(id);
        else if (row.kind === "want_to_visit") wtv.add(id);
      }
      setFavoriteIds(fav);
      setWantToVisitIds(wtv);
    };

    hydrateFromServer();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const favorites = getActivities().filter(a => favoriteIds.has(a.id));
  const wantToVisit = getActivities().filter(a => wantToVisitIds.has(a.id));

  const isFavorite = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);
  const isWantToVisit = useCallback((id: number) => wantToVisitIds.has(id), [wantToVisitIds]);

  const syncToServer = useCallback(
    async (activityId: number, kind: "favorite" | "want_to_visit", add: boolean) => {
      if (!user) return { ok: true as const };
      const slug = slugFromId(activityId);
      if (!slug) return { ok: true as const };
      if (add) {
        const { error } = await supabase
          .from("saved_activities")
          .upsert(
            { user_id: user.id, activity_slug: slug, kind },
            { onConflict: "user_id,activity_slug,kind", ignoreDuplicates: true }
          );
        return { ok: !error, error };
      } else {
        const { error } = await supabase
          .from("saved_activities")
          .delete()
          .eq("user_id", user.id)
          .eq("activity_slug", slug)
          .eq("kind", kind);
        return { ok: !error, error };
      }
    },
    [user]
  );

  const toggleFavorite = useCallback(
    async (activityId: number): Promise<boolean> => {
      const willAdd = !favoriteIds.has(activityId);
      // Optimistic update.
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (willAdd) next.add(activityId);
        else next.delete(activityId);
        return next;
      });
      const res = await syncToServer(activityId, "favorite", willAdd);
      if (!res.ok) {
        // Rollback.
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (willAdd) next.delete(activityId);
          else next.add(activityId);
          return next;
        });
        return !willAdd;
      }
      return willAdd;
    },
    [favoriteIds, syncToServer]
  );

  const toggleWantToVisit = useCallback(
    async (activityId: number): Promise<boolean> => {
      const willAdd = !wantToVisitIds.has(activityId);
      setWantToVisitIds(prev => {
        const next = new Set(prev);
        if (willAdd) next.add(activityId);
        else next.delete(activityId);
        return next;
      });
      const res = await syncToServer(activityId, "want_to_visit", willAdd);
      if (!res.ok) {
        setWantToVisitIds(prev => {
          const next = new Set(prev);
          if (willAdd) next.delete(activityId);
          else next.add(activityId);
          return next;
        });
        return !willAdd;
      }
      return willAdd;
    },
    [wantToVisitIds, syncToServer]
  );

  const removeFromFavorites = useCallback(
    async (id: number): Promise<void> => {
      const had = favoriteIds.has(id);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (!had) return;
      const res = await syncToServer(id, "favorite", false);
      if (!res.ok) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    },
    [favoriteIds, syncToServer]
  );

  const removeFromWantToVisit = useCallback(
    async (id: number): Promise<void> => {
      const had = wantToVisitIds.has(id);
      setWantToVisitIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (!had) return;
      const res = await syncToServer(id, "want_to_visit", false);
      if (!res.ok) {
        setWantToVisitIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    },
    [wantToVisitIds, syncToServer]
  );

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
