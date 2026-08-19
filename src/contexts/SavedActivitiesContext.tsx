import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import {
  Activity,
  getActivities,
  slugFromId,
  idFromSlug,
  loadActivities,
} from "@/data/activities";
import {
  getItem,
  setItem,
  removeItem,
  STORAGE_KEYS,
  scopedKey,
  clearForeignScopedKeys,
  hasFreshGuestData,
  touchGuestDataMarker,
  syncGuestDataMarker,
} from "@/lib/storage";
import { requestGuestMigrationConsent } from "@/lib/guestMigration";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { useAuth } from "@/contexts/AuthContext";
import { useDataStatus } from "@/hooks/useDataStatus";
import { toast } from "sonner";

const SAVE_ERROR = "Nie udało się zapisać. Spróbuj ponownie.";
const notifySaveError = () => toast.error(SAVE_ERROR);

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
  /** `slug` jest opcjonalny — karta/atrakcja zwykle go zna, wtedy nie potrzebujemy mapy id→slug. */
  toggleFavorite: (activityId: number, slug?: string) => Promise<boolean>;
  toggleWantToVisit: (activityId: number, slug?: string) => Promise<boolean>;
  removeFromFavorites: (id: number) => Promise<void>;
  removeFromWantToVisit: (id: number) => Promise<void>;
  favoritesCount: number;
  wantToVisitCount: number;
  /** True dopóki listy zapisanych atrakcji nie są wiarygodne (katalog się ładuje lub trwa pierwszy select). */
  isLoading: boolean;
}

const SavedActivitiesContext = createContext<SavedActivitiesContextType | undefined>(undefined);

export function SavedActivitiesProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  // Mapowanie id↔slug wymaga załadowanego katalogu; hook wymusza też
  // re-render (favorites/wantToVisit liczone z getActivities()).
  const dataStatus = useDataStatus();
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(
    () => new Set(getItem<number[]>(STORAGE_KEYS.FAVORITES, []))
  );
  const [wantToVisitIds, setWantToVisitIds] = useState<Set<number>>(
    () => new Set(getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, []))
  );
  const previousUserIdRef = useRef(user?.id);

  // Lokalne lustro: gość pisze pod „gołym" kluczem, zalogowany pod kluczem
  // przypisanym do właściciela (`ff_favorites:<user_id>`), żeby dane jednego
  // konta nigdy nie wyciekły do drugiego na tej samej przeglądarce.
  useEffect(() => {
    if (previousUserIdRef.current && !user) return;
    if (user) {
      setItem(scopedKey(STORAGE_KEYS.FAVORITES, user.id), [...favoriteIds]);
    } else if (favoriteIds.size > 0) {
      setItem(STORAGE_KEYS.FAVORITES, [...favoriteIds]);
      syncGuestDataMarker();
    } else {
      removeItem(STORAGE_KEYS.FAVORITES);
      syncGuestDataMarker();
    }
  }, [favoriteIds, user]);
  useEffect(() => {
    if (previousUserIdRef.current && !user) return;
    if (user) {
      setItem(scopedKey(STORAGE_KEYS.WANT_TO_VISIT, user.id), [...wantToVisitIds]);
    } else if (wantToVisitIds.size > 0) {
      setItem(STORAGE_KEYS.WANT_TO_VISIT, [...wantToVisitIds]);
      syncGuestDataMarker();
    } else {
      removeItem(STORAGE_KEYS.WANT_TO_VISIT);
      syncGuestDataMarker();
    }
  }, [wantToVisitIds, user]);

  // On login: merge local (guest) saved items into Supabase, then hydrate
  // state from Supabase (source of truth). On logout: reset to localStorage.
  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      if (!user) {
        const justLoggedOut = Boolean(previousUserIdRef.current);
        // Po wylogowaniu najpierw zerujemy pamięć. Przy zwykłym wejściu gościa
        // odtwarzamy wyłącznie dane utworzone przez niego w tej przeglądarce.
        setFavoriteIds(new Set(justLoggedOut ? [] : getItem<number[]>(STORAGE_KEYS.FAVORITES, [])));
        setWantToVisitIds(new Set(justLoggedOut ? [] : getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, [])));
        setIsLoadingSaved(false);
        return;
      }

      // Lustra innych kont są nieaktualne dla tego użytkownika — usuwamy je,
      // a start bierzemy z lustra przypisanego do zalogowanego konta.
      clearForeignScopedKeys(user.id);
      setFavoriteIds(new Set(getItem<number[]>(scopedKey(STORAGE_KEYS.FAVORITES, user.id), [])));
      setWantToVisitIds(new Set(getItem<number[]>(scopedKey(STORAGE_KEYS.WANT_TO_VISIT, user.id), [])));

      // Mapy id↔slug wymagają katalogu. Na wejściu bezpośrednio na kartę atrakcji
      // katalog nie jest ładowany („idle"), więc dociągamy go tutaj sami —
      // bez tego hydracja i zapisy cicho przepadały.
      if (dataStatus === "loading") return;
      if (dataStatus !== "success") {
        try {
          await loadActivities();
        } catch {
          toast.error("Nie udało się wczytać zapisanych atrakcji.");
          setIsLoadingSaved(false);
          return;
        }
        if (cancelled) return;
      }

      setIsLoadingSaved(true);

      // Migracja danych gościa → konto. Tylko gdy powstały PO ostatnim
      // wylogowaniu (ta sama sesja przeglądarki) i tylko po jawnej zgodzie.
      const localFav = getItem<number[]>(STORAGE_KEYS.FAVORITES, []);
      const localWtv = getItem<number[]>(STORAGE_KEYS.WANT_TO_VISIT, []);
      const guestCount = localFav.length + localWtv.length;
      if (guestCount > 0) {
        if (!hasFreshGuestData()) {
          // Dane z poprzedniej sesji (innego użytkownika) — nie migrujemy.
          removeItem(STORAGE_KEYS.FAVORITES);
          removeItem(STORAGE_KEYS.WANT_TO_VISIT);
          syncGuestDataMarker();
        } else {
          const accepted = await requestGuestMigrationConsent("savedPlaces", guestCount);
          if (cancelled) return;
          if (!accepted) {
            removeItem(STORAGE_KEYS.FAVORITES);
            removeItem(STORAGE_KEYS.WANT_TO_VISIT);
            syncGuestDataMarker();
          } else {
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
              const { error: mergeError } = await supabase
                .from("saved_activities")
                .upsert(toInsert, { onConflict: "user_id,activity_slug,kind", ignoreDuplicates: true });
              if (cancelled) return;
              if (mergeError) {
                notifySaveError();
              } else {
                // Czyścimy lokalne klucze DOPIERO po potwierdzonym zapisie.
                removeItem(STORAGE_KEYS.FAVORITES);
                removeItem(STORAGE_KEYS.WANT_TO_VISIT);
              }
            }
          }
        }
      }

      const { data, error } = await supabase
        .from("saved_activities")
        .select("activity_slug, kind")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error || !data) {
        if (error) toast.error("Nie udało się wczytać zapisanych atrakcji.");
        setIsLoadingSaved(false);
        return;
      }

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
      setIsLoadingSaved(false);
    };

    hydrateFromServer();
    return () => {
      cancelled = true;
    };
  }, [user, dataStatus]);

  useEffect(() => {
    previousUserIdRef.current = user?.id;
  }, [user]);

  // Jedno źródło prawdy dla list i liczników: zapisane atrakcje odnalezione
  // w katalogu (licznik = długość listy, więc nigdy nie rozjadą się ze sobą).
  const favorites = getActivities().filter(a => favoriteIds.has(a.id));
  const wantToVisit = getActivities().filter(a => wantToVisitIds.has(a.id));

  const isFavorite = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);
  const isWantToVisit = useCallback((id: number) => wantToVisitIds.has(id), [wantToVisitIds]);

  // Slug rozwiązujemy z mapy, a gdy katalog nie jest jeszcze wczytany —
  // dociągamy go i próbujemy ponownie. Brak sluga = błąd, nie sukces.
  const resolveSlug = useCallback(async (activityId: number, knownSlug?: string) => {
    if (knownSlug) return knownSlug;
    const direct = slugFromId(activityId);
    if (direct) return direct;
    try {
      await loadActivities();
    } catch {
      return undefined;
    }
    return slugFromId(activityId);
  }, []);

  const syncToServer = useCallback(
    async (
      activityId: number,
      kind: "favorite" | "want_to_visit",
      add: boolean,
      knownSlug?: string
    ) => {
      if (!user) return { ok: true as const };
      const slug = await resolveSlug(activityId, knownSlug);
      if (!slug) return { ok: false as const, error: new Error("missing-slug") };
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
    [user, resolveSlug]
  );

  const toggleFavorite = useCallback(
    async (activityId: number, slug?: string): Promise<boolean> => {
      const willAdd = !favoriteIds.has(activityId);
      if (!user && willAdd) touchGuestDataMarker();
      // Optimistic update.
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (willAdd) next.add(activityId);
        else next.delete(activityId);
        return next;
      });
      const res = await syncToServer(activityId, "favorite", willAdd, slug);
      if (!res.ok) {
        notifySaveError();
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
    [favoriteIds, syncToServer, user]
  );

  const toggleWantToVisit = useCallback(
    async (activityId: number, slug?: string): Promise<boolean> => {
      const willAdd = !wantToVisitIds.has(activityId);
      if (!user && willAdd) touchGuestDataMarker();
      setWantToVisitIds(prev => {
        const next = new Set(prev);
        if (willAdd) next.add(activityId);
        else next.delete(activityId);
        return next;
      });
      const res = await syncToServer(activityId, "want_to_visit", willAdd, slug);
      if (!res.ok) {
        notifySaveError();
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
    [wantToVisitIds, syncToServer, user]
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
        notifySaveError();
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
        notifySaveError();
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
        favoritesCount: favorites.length,
        wantToVisitCount: wantToVisit.length,
        isLoading: dataStatus !== "success" || isLoadingSaved,
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
