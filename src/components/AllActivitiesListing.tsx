import ActivityGrid from "@/components/ActivityGrid";
import ActivityLoadError from "@/components/ActivityLoadError";
import { Button } from "@/components/ui/button";
import { useActivitiesInfinite } from "@/hooks/useActivitiesInfinite";
import { activityWord } from "@/lib/plural";

const PAGE_SIZE = 24;

/**
 * Listing „Zobacz wszystkie atrakcje" (/?all=1).
 *
 * Q-E-10: wcześniej ta ścieżka wołała `ensureActivitiesLoaded()`, czyli pętlę po
 * `.range()` ciągnącą CAŁY katalog stronami po 1000 (zmierzone 10.09.2026:
 * 4904 wiersze, 511,4 KB po sieci / 2147,7 KB po dekompresji). Teraz idzie tą samą
 * serwerową paginacją co listing województwa: pierwsza strona to 24 rekordy
 * + `count: 'exact'` (pełna liczba do licznika), reszta na żądanie („Pokaż więcej").
 *
 * Komponent jest montowany WYŁĄCZNIE w gałęzi ?all=1 bez filtrów — inaczej sam
 * fakt wejścia na stronę główną odpalałby zapytanie o pierwszą stronę katalogu.
 */
const AllActivitiesListing = () => {
  const {
    data: activities,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refetch,
  } = useActivitiesInfinite({}, PAGE_SIZE);

  if (error && activities.length === 0) {
    return <ActivityLoadError onRetry={refetch} isRetrying={loading} />;
  }

  return (
    <>
      <section className="bg-background pt-6 md:pt-10">
        <div className="container">
          <h2 className="text-xl md:text-2xl font-serif text-foreground">
            Wszystkie atrakcje w Polsce
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5" role="status" aria-live="polite">
            {loading && total === 0 ? "Wczytywanie…" : `${total} ${activityWord(total)}`}
          </p>
        </div>
      </section>

      <ActivityGrid activities={activities} isLoading={loading} paginate={false} />

      {hasMore && !error && (
        <div className="container mt-8 flex justify-center">
          <Button onClick={loadMore} disabled={loadingMore} variant="outline" size="lg">
            {loadingMore
              ? "Wczytywanie…"
              : `Pokaż więcej (${Math.max(0, total - activities.length)})`}
          </Button>
        </div>
      )}

      {/* Doładowanie kolejnej porcji padło, ale to, co już jest, zostaje na ekranie. */}
      {error && activities.length > 0 && (
        <div className="container mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Nie udało się wczytać kolejnych atrakcji.</p>
          <Button onClick={refetch} variant="outline" size="lg">
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {!hasMore && !loading && !error && total > PAGE_SIZE && (
        <p className="text-center text-muted-foreground mt-10 text-sm">
          To wszystkie atrakcje w katalogu
        </p>
      )}
    </>
  );
};

export default AllActivitiesListing;
