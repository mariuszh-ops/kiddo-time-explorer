import { useParams, Link, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { useMemo, useState, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ActivityGrid from "@/components/ActivityGrid";
import ActivityLoadError from "@/components/ActivityLoadError";

import { Button } from "@/components/ui/button";
const MapView = lazy(() => import("@/components/MapView"));
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import SeoPagination from "@/components/SeoPagination";
import { filterOptions } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";
import { activityWord } from "@/lib/plural";
import { LEGACY_CITY_TO_REGION, REGION_BY_SLUG, REGION_SLUGS } from "@/data/regions";
import { REGION_SEO_DESCRIPTIONS } from "@/data/regionSeo";
import {
  getCategoryConfig,
  resolveCityText,
  cityLabels,
} from "@/data/categoryPages";
import { useActivitiesInfinite } from "@/hooks/useActivitiesInfinite";
import CategoryFilterBar, { type SortOption, AGE_RANGES, CATEGORY_TYPES, AMENITY_FILTER_VALUES } from "@/components/CategoryFilterBar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import BreadcrumbCategoryDropdown from "@/components/BreadcrumbCategoryDropdown";
import BreadcrumbCityDropdown from "@/components/BreadcrumbCityDropdown";
import NotFound from "@/pages/NotFound";
import { useMapUrlState } from "@/hooks/useMapUrlState";
import { useMapPins } from "@/hooks/useMapPins";
import { fetchFilteredSlugs } from "@/lib/mapPins";
import { useRealNavigationType } from "@/lib/navigationType";
import { trackEvent } from "@/lib/analytics";



const BASE_URL = "https://familyfun.pl";


const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const pluralizeActivities = activityWord;
const DEFAULT_SORT: SortOption = "reviews";

const CategoryPage = () => {
  const params = useParams<{ citySlug?: string; categorySlug?: string; slug?: string; regionSlug?: string }>();
  // Obsługiwane ścieżki:
  //   /atrakcje/:citySlug/:categorySlug
  //   /atrakcje/:slug (gdzie slug = miasto/województwo)
  //   /:regionSlug (krótki URL województwa)
  //   /:regionSlug/:categorySlug
  //   /kategoria/:categorySlug (kategoria we wszystkich województwach)
  const citySlug = params.regionSlug || params.citySlug || params.slug;
  const categorySlug = params.categorySlug;

  // Stary slug miasta → nowe województwo. Zachowujemy kategorię.
  if (citySlug && LEGACY_CITY_TO_REGION[citySlug]) {
    const target = categorySlug
      ? `/${LEGACY_CITY_TO_REGION[citySlug]}/${categorySlug}`
      : `/${LEGACY_CITY_TO_REGION[citySlug]}`;
    return <Navigate to={target} replace />;
  }

  // Waliduj slug województwa (16 województw) — nieznany → 404, nie pusty listing.
  if (citySlug && !REGION_SLUGS.includes(citySlug)) {
    return <NotFound />;
  }

  const config = getCategoryConfig(categorySlug);

  // Waliduj slug kategorii przeciwko znanej liście — nieznany → 404.
  if (categorySlug && !config) {
    return <NotFound />;
  }

  const cityLabel = citySlug ? cityLabels[citySlug] : undefined;

  // URL-persisted filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const { viewMode, setViewMode, savedMapState, handleSaveMapState } = useMapUrlState(
    searchParams,
    setSearchParams,
  );
  // Walidacja parametrów URL — nieznane wartości odrzucamy po cichu,
  // żeby nie budować z nich zapytania do backendu.
  const rawType = searchParams.get("type") ?? undefined;
  const urlType = rawType && CATEGORY_TYPES.some((t) => t.value === rawType) ? rawType : undefined;
  const urlAmenities = useMemo(() => {
    const raw = searchParams.get("amenities");
    if (!raw) return [];
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => AMENITY_FILTER_VALUES.includes(v));
  }, [searchParams]);
  const urlMinRating = Number(searchParams.get("min") ?? "0") || 0;
  // Domyślnie "reviews" (najpopularniejsze): rating desc wypychał na górę
  // obiekty 5.0★ z kilkudziesięcioma opiniami ponad znane kotwice (zoo/aquaparki).
  const rawSort = searchParams.get("sort");
  const urlSort: SortOption =
    rawSort === "rating" || rawSort === "reviews" || rawSort === "name" ? rawSort : DEFAULT_SORT;
  // ?auto=0 → ukryj klasyfikowane automatycznie. Domyślnie widoczne (auto brak / auto=1).
  const includeUncertain = searchParams.get("auto") !== "0";
  // ?age=0-2 | 3-5 | 6-9 | 10-13 | 14-16
  const rawAge = searchParams.get("age") ?? undefined;
  const ageOption = rawAge ? AGE_RANGES.find((a) => a.value === rawAge) : undefined;
  const urlAge = ageOption?.value;
  // ?free=1 → zawężaj do atrakcji bez biletu.
  const onlyFree = searchParams.get("free") === "1";
  // ?search=zoo → fraza z wyszukiwarki w headerze (zawężona do tej strony).
  const urlSearch = searchParams.get("search")?.trim() ?? "";
  // ?page=N (1-based) → N-ta porcja wyników. Linki paginacji renderujemy pod listą.
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const initialPage = pageParam - 1;

  // If a category is set in the route, it wins over any URL ?type=
  const effectiveType = categorySlug ?? urlType;

  const {
    data: activities,
    total,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    page,
    refetch,
    goToPage,
  } = useActivitiesInfinite(
    {
    region: citySlug,
    type: effectiveType,
    amenities: urlAmenities,
    minRating: urlMinRating,
    sort: urlSort,
    includeUncertain,
    ageMin: ageOption?.min,
    ageMax: ageOption?.max,
    onlyFree,
    search: urlSearch,
    },
    24,
    initialPage,
  );

  // Mapa musi pokazywać WSZYSTKIE piny spełniające filtry, nie tylko
  // wczytaną stronę listingu (24). Piny bierzemy z tego samego cache co home
  // (rpc get_map_pins) i filtrujemy po stronie klienta tak samo jak backend.
  const mapEnabled = FEATURES.MAP_VIEW && viewMode === "map";
  // F-17: województwo zawężamy w BAZIE (region_slug), nie po stronie klienta.
  // Wcześniej /malopolskie?view=map ściągało komplet 4892 pinów (924 KiB), żeby
  // zaraz odrzucić 86% z nich. `citySlug` jest tu już zwalidowany do jednego
  // z 16 slugów województw (nieznany → NotFound wyżej), więc idzie wprost do RPC.
  const mapQuery = useMemo(() => ({ region: citySlug ?? null }), [citySlug]);
  const { pins, error: pinsError, refetch: refetchPins } = useMapPins(mapEnabled, mapQuery);

  // Filtry, których NIE ma w tuplach get_map_pins (min / auto=0 / amenities).
  // Dla nich dociągamy z katalogu same slugi spełniające komplet warunków.
  const amenitiesKey = urlAmenities.join(",");
  const needsSlugFilter =
    urlMinRating > 0 || !includeUncertain || urlAmenities.length > 0;
  const [allowedSlugs, setAllowedSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!mapEnabled || !needsSlugFilter) {
      setAllowedSlugs(null);
      return;
    }
    let cancelled = false;
    setAllowedSlugs(null);
    fetchFilteredSlugs({
      region: citySlug,
      type: effectiveType,
      amenities: urlAmenities,
      minRating: urlMinRating,
      includeUncertain,
      onlyFree,
      ageMin: ageOption?.min,
      ageMax: ageOption?.max,
      search: urlSearch,
    })
      .then((set) => {
        if (!cancelled) setAllowedSlugs(set);
      })
      .catch(() => {
        if (!cancelled) setAllowedSlugs(new Set());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mapEnabled,
    needsSlugFilter,
    citySlug,
    effectiveType,
    amenitiesKey,
    urlMinRating,
    includeUncertain,
    onlyFree,
    ageOption?.min,
    ageOption?.max,
    urlSearch,
  ]);

  const mapActivities = useMemo(() => {
    if (!mapEnabled) return [];
    // Dopóki zbiór slugów się nie wczyta, nie pokazujemy nadmiaru pinów.
    if (needsSlugFilter && !allowedSlugs) return [];
    const term = urlSearch.length >= 2 ? urlSearch.toLowerCase() : "";
    return pins.filter((p) => {
      if (needsSlugFilter && !allowedSlugs!.has(p.slug)) return false;
      if (citySlug && p.city !== citySlug) return false;
      if (effectiveType && p.type !== effectiveType) return false;
      if (onlyFree && !p.isFree) return false;
      if (ageOption) {
        // Piny bez wieku sa WYLACZONE z filtra (przechodza zawsze) — M-07, 04.09.2026.
        // Ten sam kontrakt co `ageRangeOrFilter` w zapytaniach do bazy; wczesniej
        // `!p.hasAgeInfo -> false` gasilo je na mapie przy kazdym ustawieniu filtra.
        if (p.hasAgeInfo && (p.ageMin > ageOption.max || p.ageMax < ageOption.min)) return false;
      }
      if (term) {
        const haystack = `${p.title} ${p.location}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [mapEnabled, pins, citySlug, effectiveType, onlyFree, ageOption, urlSearch, needsSlugFilter, allowedSlugs]);



  // Świadome zmiany filtrów idą pushem (jeden filtr = jeden wpis w historii).
  // { replace: true } zostaje wyłącznie dla automatycznych zapisów stanu (np. ?page=).
  const updateParams = useCallback(
    (
      patch: Record<string, string | undefined | null>,
      options?: { replace?: boolean },
    ) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Ostatnia realna strona (hook sam cofa się na nią przy ?page poza zakresem).
  const totalPages = Math.max(1, Math.ceil(total / 24));

  // Numer strony żyje w DWÓCH miejscach i musi płynąć w OBIE strony:
  //   URL → stan   klik w numer w SeoPagination (<Link>) albo „wstecz",
  //   stan → URL   „Pokaż więcej" zapisuje osiągniętą stronę (replace).
  // Wcześniej istniał tylko drugi kierunek, więc efekt natychmiast cofał
  // ?page= wpisane przez <Link> i paginacja SEO była martwa dla człowieka (K-03).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pageJumpRef = useRef(false);
  const lastPageParamRef = useRef(pageParam);
  useEffect(() => {
    if (pageParam !== lastPageParamRef.current) {
      lastPageParamRef.current = pageParam;
      if (pageParam - 1 !== page) {
        pageJumpRef.current = true;
        goToPage(pageParam - 1);
        window.scrollTo(0, 0);
      }
      return;
    }
    if (pageParam !== page + 1) {
      lastPageParamRef.current = page > 0 ? page + 1 : 1;
      updateParams({ page: page > 0 ? String(page + 1) : undefined }, { replace: true });
    }
  }, [pageParam, page, goToPage, updateParams]);

  // Po dojściu nowej porcji: góra listy + fokus na H1. Bez tego klawiatura
  // zostaje na dole strony, przy linku, którego już nie ma.
  useEffect(() => {
    if (!pageJumpRef.current || loading) return;
    pageJumpRef.current = false;
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [loading, activities.length]);

  // Zapamiętaj i przywróć pozycję scrolla dla tego widoku (klucz = ścieżka + filtry).
  const location = useLocation();
  // NIE useNavigationType(): wewnątrz <Routes location={…}> react-router zawsze
  // zwraca "POP", przez co reset scrolla nigdy się nie wykonywał (F-12).
  const navigationType = useRealNavigationType();
  // Nawigacja „w przód" na listing (PUSH) zawsze startuje od góry strony —
  // bez tego SPA zachowuje scroll z poprzedniego widoku (np. przewiniętej home).
  const scrollKey = `ff:scroll:${location.pathname}?${new URLSearchParams(
    Array.from(searchParams.entries()).filter(([k]) => k !== "page"),
  ).toString()}`;
  // Typ nawigacji zamrażamy na pierwszym renderze — nasze własne
  // setSearchParams({ replace: true }) zmieniają go na "REPLACE" i zabiłyby
  // przywracanie pozycji po „wstecz".
  const entryNavTypeRef = useRef(navigationType);
  const isBackNavigation = entryNavTypeRef.current === "POP";
  // Reset do góry przy każdej zmianie trasy/filtrów w przód (PUSH/REPLACE).
  // Klucz pomija ?page=, żeby doładowanie kolejnych stron nie skakało na górę.
  const lastResetKeyRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (lastResetKeyRef.current === scrollKey) return;
    const isFirst = lastResetKeyRef.current === null;
    lastResetKeyRef.current = scrollKey;
    // Wejście „wstecz" na tę trasę → pozycję przywraca efekt niżej.
    if (isFirst && isBackNavigation) return;
    if (navigationType === "POP") return;
    window.scrollTo(0, 0);
  }, [scrollKey, isBackNavigation, navigationType]);
  const restoredRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      // Nie nadpisuj zapamiętanej pozycji, dopóki jej nie przywrócimy —
      // wcześniejsze przewinięcia przeglądarki (clamp na krótkiej liście) zjadały wartość.
      if (!restoredRef.current) return;
      try {
        if (window.scrollY > 0) sessionStorage.setItem(scrollKey, String(window.scrollY));
      } catch { /* brak sessionStorage — pomijamy */ }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollKey]);

  useEffect(() => {
    if (restoredRef.current || loading || activities.length === 0) return;
    // Czekaj, aż doładowane („Pokaż więcej") strony faktycznie dojdą.
    if (page > initialPage && activities.length <= 24) return;
    restoredRef.current = true;
    // Przy wejściu w przód nie przywracamy zapisanej pozycji — pokazujemy górę
    // listingu. Reset powtarzamy po dojściu kart: dokument urósł od pierwszego
    // scrollTo(0,0) i bez tego klatka mogła zostać z dalszej części strony.
    if (!isBackNavigation) {
      window.scrollTo(0, 0);
      return;
    }
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(scrollKey) ?? "0") || 0;
    } catch { /* brak sessionStorage */ }
    if (saved > 0) {
      // Karty dociągają się progresywnie — ponawiaj skok, aż strona urośnie
      // do zapamiętanej wysokości (maks. ~1,5 s).
      let tries = 0;
      const timer = window.setInterval(() => {
        window.scrollTo(0, saved);
        tries += 1;
        if (Math.abs(window.scrollY - saved) <= 4 || tries >= 60) window.clearInterval(timer);
      }, 100);
    }
  }, [loading, activities.length, page, scrollKey, isBackNavigation]);

  const hasActiveFilters =
    (urlType && !categorySlug ? true : false) ||
    urlAmenities.length > 0 ||
    urlMinRating > 0 ||
    urlSort !== DEFAULT_SORT ||
    !includeUncertain ||
    Boolean(urlAge) ||
    onlyFree ||
    Boolean(urlSearch);

  // Fallback config / cityLabel so we never render a completely blank page
  const effectiveConfig = config ?? {
    slug: categorySlug || "",
    emoji: "📍",
    label: categorySlug
      ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
      : "Atrakcje",
    seoTitle: "Atrakcje dla dzieci {city} — FamilyFun",
    seoDescription: "Odkryj atrakcje dla dzieci {city}.",
    h1: "Atrakcje dla dzieci {city}",
    description: "Sprawdzone miejsca na wspólny czas z dzieckiem {city}.",
    filterFn: () => false,
  };

  // Fallback etykieta: dla znanego regionu użyj label/locative z REGIONS,
  // dla trybu „tylko kategoria" (brak citySlug) — „w Polsce".
  const region = citySlug ? REGION_BY_SLUG[citySlug] : undefined;
  const effectiveCityLabel = cityLabel ?? {
    nominative: region?.label ?? (citySlug ?? "Polska"),
    locative: region?.locative ?? (citySlug ? citySlug : "Polsce"),
  };

  const isError = Boolean(error) && !loading;
  const isEmpty = !loading && !isError && activities.length === 0;

  const resolvedTitle = resolveCityText(effectiveConfig.seoTitle, citySlug || "");
  const resolvedDescription = resolveCityText(effectiveConfig.seoDescription, citySlug || "");
  const resolvedH1 = resolveCityText(effectiveConfig.h1, citySlug || "");
  const resolvedBodyDescription = resolveCityText(effectiveConfig.description, citySlug || "");

  // Strony 2+ dostaja krotsza forme, zeby „— strona N” zmiescilo sie w 65
  // znakach bez ucinania wojewodztwa (inaczej dwa regiony mialyby ten sam
  // <title> po skroceniu — audyt 400: BC-E-02).
  const pagedTitle = `${effectiveConfig.label} ${citySlug ? `w ${effectiveCityLabel.locative}` : ""}`
    .replace(/\s+/g, " ")
    .trim();

  const path = citySlug
    ? (categorySlug ? `/${citySlug}/${categorySlug}` : `/${citySlug}`)
    : `/kategoria/${categorySlug}`;

  // JSON-LD: ItemList + BreadcrumbList
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: resolvedH1,
    numberOfItems: activities.length,
    itemListElement: activities.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/atrakcje/${a.slug}`,
      name: a.title,
    })),
  };

  const breadcrumbItems = [
    { name: "Strona główna", url: `${BASE_URL}/` },
    { name: effectiveCityLabel.nominative, url: `${BASE_URL}/atrakcje/${citySlug}` },
  ];
  if (categorySlug && effectiveConfig.slug) {
    breadcrumbItems.push({
      name: effectiveConfig.label,
      url: `${BASE_URL}${path}`,
    });
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const combinedJsonLd = [itemListJsonLd, breadcrumbJsonLd];

  const countLabel = `${total} ${pluralizeActivities(total)} w ${capitalize(effectiveCityLabel.locative)}`;

  // Kontekst wyszukiwania: chipy do usunięcia + wyjście na wyniki ogólnopolskie.
  const searchQS = urlSearch ? `?search=${encodeURIComponent(urlSearch)}` : "";
  const removeRegionTo = categorySlug
    ? `/kategoria/${categorySlug}${searchQS}`
    : `/${searchQS}`;
  const removeCategoryTo = citySlug ? `/${citySlug}${searchQS}` : `/${searchQS}`;
  const categoryLabel =
    filterOptions.type.find((t) => t.value === categorySlug)?.label ?? effectiveConfig.label;

  // Meta description: liczba atrakcji + krótki opis kategorii (docięty do ~160 znaków).
  const dynamicMetaDescription = (() => {
    // Strona województwa (bez kategorii) → unikalny opis regionu.
    const regionCopy = !categorySlug && citySlug ? REGION_SEO_DESCRIPTIONS[citySlug] : undefined;
    const base = `${countLabel}. ${regionCopy ?? resolvedDescription}`.trim();
    if (base.length <= 160) return base;
    const cut = base.slice(0, 160);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
  })();

  return (
    <PageTransition>
      {/* Bez `image`: zdjęcie pierwszej atrakcji bywa niższe niż 630 px i
          Facebook przycinał podgląd (BC-E-05). Baner sitewide ma 1200x630. */}
      <SEOHead
        title={pageParam > 1 ? `${pagedTitle} — strona ${pageParam}` : resolvedTitle.replace(" | FamilyFun", "")}
        description={dynamicMetaDescription}
        path={pageParam > 1 ? `${path}?page=${pageParam}` : path}
        jsonLd={combinedJsonLd as unknown as Record<string, unknown>}
      />
      <Header />
      <main id="main-content" className="pb-20 md:pb-0">
        <div className="container py-6">
          {/* Breadcrumbs: Strona główna > [City] > [Category ▾] */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Strona główna</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {categorySlug && citySlug ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbCityDropdown currentCitySlug={citySlug!} />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbCategoryDropdown
                      citySlug={citySlug!}
                      activeCategorySlug={categorySlug}
                      currentLabel={filterOptions.type.find(t => t.value === categorySlug)?.label ?? effectiveConfig.label}
                    />
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground font-medium">
                    {categorySlug
                      ? (filterOptions.type.find(t => t.value === categorySlug)?.label ?? effectiveConfig.label)
                      : effectiveCityLabel.nominative}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* H1 + Description */}
          <div className="mb-8">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl md:text-3xl font-serif text-foreground mb-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {resolvedH1}
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              {resolvedBodyDescription}
            </p>
          </div>

          {/* Filter bar */}
          <CategoryFilterBar
            type={effectiveType}
            typeLocked={Boolean(categorySlug)}
            onTypeChange={(v) => {
              if (v) trackEvent("filter_type", { type: v, source: "listing" });
              updateParams({ type: v });
            }}
            amenities={urlAmenities}
            onAmenitiesChange={(next) =>
              updateParams({ amenities: next.length ? next.join(",") : undefined })
            }
            minRating={urlMinRating}
            onMinRatingChange={(v) => updateParams({ min: v > 0 ? String(v) : undefined })}
            sort={urlSort}
            onSortChange={(v) => updateParams({ sort: v === DEFAULT_SORT ? undefined : v })}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            includeUncertain={includeUncertain}
            onIncludeUncertainChange={(v) => updateParams({ auto: v ? undefined : "0" })}
            age={urlAge}
            onAgeChange={(v) => {
              if (v) trackEvent("filter_age", { age: v, source: "listing" });
              updateParams({ age: v ?? undefined });
            }}
            onlyFree={onlyFree}
            onOnlyFreeChange={(v) => updateParams({ free: v ? "1" : undefined })}
          />

          {/* Count */}
          {urlSearch && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">
                Wyniki dla „{urlSearch}” w:
              </span>
              {citySlug && (
                <Link
                  to={removeRegionTo}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-primary/10 text-primary text-sm hover:bg-primary/15 transition-colors"
                  aria-label={`Usuń filtr województwa: ${effectiveCityLabel.nominative}`}
                >
                  {effectiveCityLabel.nominative}
                  <span aria-hidden="true">×</span>
                </Link>
              )}
              {categorySlug && (
                <Link
                  to={removeCategoryTo}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border bg-primary/10 text-primary text-sm hover:bg-primary/15 transition-colors"
                  aria-label={`Usuń filtr kategorii: ${categoryLabel}`}
                >
                  {categoryLabel}
                  <span aria-hidden="true">×</span>
                </Link>
              )}
              <Link to={`/${searchQS}`} className="text-sm text-primary hover:underline">
                Szukaj w całej Polsce
              </Link>
            </div>
          )}

          {/* Licznik — ukryty przy błędzie, bo „0 atrakcji" byłoby nieprawdą.
              Tak samo przy awarii pinów mapy: liczba z listingu opisywałaby
              pustą mapę i kłamała (audyt: J-01). */}
          {!isError && !(mapEnabled && pinsError) && (
            <p
              className="text-sm text-muted-foreground mb-4 min-h-5"
              aria-live="polite"
              role="status"
            >
              {loading ? "Wczytywanie atrakcji…" : countLabel}
            </p>
          )}

          {/* Stan błędu — wyłącznie ten blok, bez pustego stanu filtrów */}
          {isError && (
            <ActivityLoadError onRetry={refetch} />
          )}

          {/* Empty state */}
          {isError ? null : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              {/* Po wpisaniu frazy rada o filtrach była nie na temat — rodzic
                  żadnych filtrów nie ustawiał (audyt 400: K-21). */}
              <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3">
                {urlSearch
                  ? `Nie znaleźliśmy „${urlSearch}”`
                  : "Nic nie pasuje do wybranych filtrów"}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                {urlSearch
                  ? "Sprawdź pisownię albo wpisz miasto lub kategorię."
                  : "Spróbuj poluzować filtry — zmień kategorię, obniż minimalną ocenę albo odznacz część udogodnień."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {urlSearch && (
                  <Button onClick={() => updateParams({ search: undefined, page: undefined })}>
                    Wyczyść wyszukiwanie
                  </Button>
                )}
                {hasActiveFilters && (
                  <Button
                    onClick={clearAll}
                    variant={urlSearch ? "outline" : "default"}
                  >
                    Wyczyść filtry
                  </Button>
                )}
                <Button asChild variant={hasActiveFilters ? "outline" : "default"}>
                  <Link to="/">Wróć na stronę główną</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* View toggle */}
              {FEATURES.MAP_VIEW && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors min-h-10 min-w-[72px] ${viewMode === "grid" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-muted"}`}
                  >
                    Lista
                  </button>
                  <button
                    onClick={() => {
                      trackEvent("map_open", { source: "listing" });
                      setViewMode("map");
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-colors min-h-10 min-w-[72px] ${viewMode === "map" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border hover:bg-muted"}`}
                  >
                    Mapa
                  </button>
                </div>
              )}

              {/* Activity Grid or Map */}
              {FEATURES.MAP_VIEW && viewMode === "map" ? (
                <Suspense fallback={<div className="h-[60vh] bg-muted animate-pulse rounded-lg" />}>
                  <MapView
                    activities={mapActivities}

                    filters={{
                      city: citySlug,
                      // Kategoria ze ścieżki (/kategoria/zoo, /malopolskie/zoo) ma
                      // działać na mapie tak samo jak ?type= — zasila piny i chipsy.
                      type: effectiveType ? [effectiveType] : undefined,
                    }}
                    onViewModeChange={(mode) => setViewMode(mode)}
                    savedMapState={savedMapState}
                    onSaveMapState={handleSaveMapState}
                    pinsError={pinsError}
                    onPinsRetry={refetchPins}
                  />
                </Suspense>
              ) : (
                <>
                  <h2 className="sr-only">Lista atrakcji</h2>
                  <ActivityGrid
                    activities={activities}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={clearAll}
                    isLoading={loading}
                    paginate={false}
                  />
                </>
              )}
            </>
          )}

          {/* Pokaż więcej (serwerowa paginacja co 24) */}
          {!isEmpty && !error && hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                size="lg"
              >
                {loadingMore ? "Wczytywanie…" : `Pokaż więcej (${Math.max(0, total - initialPage * 24 - activities.length)})`}
              </Button>
            </div>
          )}

          {/* Linki paginacji dla wyszukiwarek (crawlable, w HTML od razu).
              W widoku mapy NIE renderujemy: mapa nie jest stronicowana, a klik w numer
              gubił kadr i widok (audyt 325: J-15). */}
          {!isEmpty && !error && !mapEnabled && (
            <SeoPagination
              basePath={path}
              searchParams={searchParams}
              currentPage={pageParam}
              totalPages={totalPages}
            />
          )}

          {/* Koniec listy */}
          {!isEmpty && !error && !hasMore && !loading && total > 24 && (
            <p className="text-center text-muted-foreground mt-10 text-sm">
              {categorySlug && !citySlug
                ? "To wszystkie atrakcje w tej kategorii"
                : citySlug && !categorySlug
                ? "To wszystkie atrakcje w tym województwie"
                : "To wszystkie atrakcje w tej kategorii"}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
};

export default CategoryPage;
