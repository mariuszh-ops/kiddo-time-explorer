import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Activity } from "@/data/activities";
import { cn } from "@/lib/utils";
import { Star, ArrowUpDown, Check, Heart, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryColor } from "@/data/categoryColors";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import MapCategoryChips from "./MapCategoryChips";

type SheetState = "peek" | "half" | "full";
type SortMode = "rating" | "nearest";

interface MapBottomSheetProps {
  visibleActivities: Activity[];
  highlightedId: number | null;
  onCardClick: (activity: Activity) => void;
  fading: boolean;
  onSheetStateChange?: (state: SheetState) => void;
  selectedCategories: Set<string>;
  onCategoryToggle: (category: string) => void;
  mapCenter?: [number, number] | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Available height = viewport - header(56) - bottomNav(64)
const HEADER_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 64;

const PEEK_HEIGHT = 80;
const getHalfHeight = () => (window.innerHeight - HEADER_HEIGHT - BOTTOM_NAV_HEIGHT) * 0.5;
const getFullHeight = () => (window.innerHeight - HEADER_HEIGHT - BOTTOM_NAV_HEIGHT) * 0.9;

function getTargetHeight(state: SheetState): number {
  switch (state) {
    case "peek": return PEEK_HEIGHT;
    case "half": return getHalfHeight();
    case "full": return getFullHeight();
  }
}

// Simple distance calc (good enough for sorting)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function MapBottomSheet({
  visibleActivities,
  highlightedId,
  onCardClick,
  fading,
  onSheetStateChange,
  selectedCategories,
  onCategoryToggle,
  mapCenter,
  searchQuery,
  onSearchChange,
}: MapBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("peek");
  const [sheetHeight, setSheetHeight] = useState(PEEK_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!sortDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortDropdownOpen]);

  // Compute distances from map center
  const distancesMap = useMemo(() => {
    if (!mapCenter) return new Map<number, number>();
    const m = new Map<number, number>();
    visibleActivities.forEach((a) => {
      m.set(a.id, distanceKm(mapCenter[0], mapCenter[1], a.latitude, a.longitude));
    });
    return m;
  }, [visibleActivities, mapCenter]);

  // Sort activities
  const sortedActivities = useMemo(() => {
    const arr = [...visibleActivities];
    if (sortMode === "nearest" && mapCenter) {
      arr.sort((a, b) => (distancesMap.get(a.id) ?? 0) - (distancesMap.get(b.id) ?? 0));
    } else {
      arr.sort((a, b) => b.rating - a.rating);
    }
    return arr;
  }, [visibleActivities, sortMode, mapCenter, distancesMap]);

  const updateState = useCallback((state: SheetState) => {
    setSheetState(state);
    setSheetHeight(getTargetHeight(state));
    onSheetStateChange?.(state);
  }, [onSheetStateChange]);

  const snapToNearest = useCallback((currentHeight: number) => {
    const peek = PEEK_HEIGHT;
    const half = getHalfHeight();
    const full = getFullHeight();
    const distances = [
      { state: "peek" as SheetState, dist: Math.abs(currentHeight - peek) },
      { state: "half" as SheetState, dist: Math.abs(currentHeight - half) },
      { state: "full" as SheetState, dist: Math.abs(currentHeight - full) },
    ];
    distances.sort((a, b) => a.dist - b.dist);
    updateState(distances[0].state);
  }, [updateState]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
  }, [sheetHeight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.touches[0].clientY;
    const newHeight = Math.max(PEEK_HEIGHT, Math.min(getFullHeight(), dragStartHeight.current + deltaY));
    setSheetHeight(newHeight);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToNearest(sheetHeight);
  }, [isDragging, sheetHeight, snapToNearest]);

  const handleHandleTap = useCallback(() => {
    if (isDragging) return;
    if (sheetState === "peek") {
      updateState("half");
    } else {
      updateState("peek");
    }
  }, [sheetState, isDragging, updateState]);

  useEffect(() => {
    if (listRef.current && sheetState !== "peek") {
      listRef.current.scrollTop = 0;
    }
  }, [sheetState, visibleActivities]);

  useEffect(() => {
    if (highlightedId && listRef.current && sheetState !== "peek") {
      const card = listRef.current.querySelector(`[data-activity-id="${highlightedId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [highlightedId, sheetState]);

  useEffect(() => {
    if (highlightedId && sheetState === "peek") {
      updateState("half");
    }
  }, [highlightedId]); // intentionally not including sheetState/updateState

  const showList = sheetState !== "peek";

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-30 bg-card rounded-t-2xl flex flex-col",
        isDragging ? "" : "transition-[height] duration-300 ease-out"
      )}
      style={{
        height: sheetHeight,
        bottom: 0,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
      }}
    >
      {/* Handle bar area — draggable */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleHandleTap}
        className="flex flex-col items-center pt-2 pb-2 cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
        <div className="flex items-center justify-between w-full px-3">
          <span className="text-xs text-muted-foreground font-medium">
            {visibleActivities.length} atrakcji w widoku
          </span>
          {/* Sort button */}
          <div
            ref={sortRef}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSortDropdownOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-accent"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortMode === "rating" ? "Ocena ↓" : "Najbliższe"}
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] py-1">
                <button
                  onClick={() => { setSortMode("rating"); setSortDropdownOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors cursor-pointer"
                >
                  <span className={cn("text-foreground", sortMode === "rating" && "font-semibold")}>
                    Najlepiej oceniane
                  </span>
                  {sortMode === "rating" && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
                <button
                  onClick={() => { setSortMode("nearest"); setSortDropdownOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-accent transition-colors cursor-pointer"
                >
                  <span className={cn("text-foreground", sortMode === "nearest" && "font-semibold")}>
                    Najbliższe centrum mapy
                  </span>
                  {sortMode === "nearest" && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category chips */}
      <div className="px-3 pb-1 shrink-0">
        <MapCategoryChips selected={selectedCategories} onToggle={onCategoryToggle} />
      </div>

      {/* List content */}
      {showList && (
        <div
          ref={listRef}
          className={cn(
            "flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-3 transition-opacity duration-150",
            fading ? "opacity-50" : "opacity-100"
          )}
        >
          {sortedActivities.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground text-center px-4">
              Brak atrakcji w tym obszarze — oddal mapę lub przesuń
            </div>
          ) : (
            <div className="space-y-2">
              {sortedActivities.map((activity) => (
                <SheetActivityCard
                  key={activity.id}
                  activity={activity}
                  isHighlighted={highlightedId === activity.id}
                  onCardClick={onCardClick}
                  distance={sortMode === "nearest" ? distancesMap.get(activity.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Peek state: horizontal scroll preview */}
      {!showList && visibleActivities.length > 0 && (
        <div className="flex-1 overflow-x-auto px-3 pb-1 scrollbar-hide">
          <div className="flex gap-2">
            {visibleActivities.slice(0, 10).map((a) => (
              <button
                key={a.id}
                onClick={() => onCardClick(a)}
                className="shrink-0 px-2.5 py-1 rounded-full border border-border bg-background text-xs font-medium text-foreground whitespace-nowrap"
              >
                {a.title.length > 20 ? a.title.slice(0, 20) + "…" : a.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Card used inside bottom sheet list
function SheetActivityCard({
  activity,
  isHighlighted,
  onCardClick,
  distance,
}: {
  activity: Activity;
  isHighlighted: boolean;
  onCardClick: (activity: Activity) => void;
  distance?: number;
}) {
  const categoryColor = getCategoryColor(activity.type);
  const [imgError, setImgError] = useState(false);
  const initial = activity.title?.charAt(0)?.toUpperCase() || "?";
  const { isFavorite, toggleFavorite } = useSavedActivities();
  const fav = isFavorite(activity.id);

  return (
    <div
      data-activity-id={activity.id}
      onClick={() => onCardClick(activity)}
      className={cn(
        "flex gap-3 p-2 rounded-xl border bg-card transition-all cursor-pointer active:opacity-90 relative",
        isHighlighted ? "shadow-md" : "border-border"
      )}
      style={{
        borderLeft: `4px solid ${categoryColor}`,
        background: isHighlighted ? `${categoryColor}12` : undefined,
      }}
    >
      {imgError || !activity.imageUrl ? (
        <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center bg-muted">
          <span className="text-xl font-bold text-muted-foreground">{initial}</span>
        </div>
      ) : (
        <img
          src={activity.imageUrl}
          alt={activity.title}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      <div className="flex-1 min-w-0 py-0.5 pr-6">
        <Link
          to={`/atrakcje/${activity.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-foreground hover:underline line-clamp-2"
        >
          {activity.title}
        </Link>
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {activity.location}
          </p>
          {distance !== undefined && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {formatDistance(distance)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            {activity.rating.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">{activity.ageRange}</span>
        </div>
      </div>
      {/* Favorite heart button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(activity.id);
        }}
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent transition-colors cursor-pointer"
      >
        <Heart
          className={cn(
            "w-4 h-4 transition-colors",
            fav ? "fill-red-500 text-red-500" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}
