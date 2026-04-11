import { useRef, useState, useCallback, useEffect } from "react";
import { Activity } from "@/data/activities";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryColor } from "@/data/categoryColors";

type SheetState = "peek" | "half" | "full";

interface MapBottomSheetProps {
  visibleActivities: Activity[];
  highlightedId: number | null;
  onCardClick: (activity: Activity) => void;
  fading: boolean;
  onSheetStateChange?: (state: SheetState) => void;
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

export default function MapBottomSheet({
  visibleActivities,
  highlightedId,
  onCardClick,
  fading,
  onSheetStateChange,
}: MapBottomSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>("peek");
  const [sheetHeight, setSheetHeight] = useState(PEEK_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const updateState = useCallback((state: SheetState) => {
    setSheetState(state);
    setSheetHeight(getTargetHeight(state));
    onSheetStateChange?.(state);
  }, [onSheetStateChange]);

  // Snap to nearest state
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

  // Touch handlers on handle bar
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

  // Tap on handle bar toggles peek <-> half
  const handleHandleTap = useCallback(() => {
    if (isDragging) return;
    if (sheetState === "peek") {
      updateState("half");
    } else {
      updateState("peek");
    }
  }, [sheetState, isDragging, updateState]);

  // Scroll highlighted card into view
  useEffect(() => {
    if (highlightedId && listRef.current && sheetState !== "peek") {
      const card = listRef.current.querySelector(`[data-activity-id="${highlightedId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [highlightedId, sheetState]);

  // When marker is clicked on map, open to half if in peek
  useEffect(() => {
    if (highlightedId && sheetState === "peek") {
      updateState("half");
    }
  }, [highlightedId]); // intentionally not including sheetState/updateState to avoid loops

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
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
        <span className="text-xs text-muted-foreground font-medium">
          {visibleActivities.length} atrakcji w widoku
        </span>
      </div>

      {/* List content */}
      {showList && (
        <div
          ref={listRef}
          className={cn(
            "flex-1 overflow-y-auto px-3 pb-3 transition-opacity duration-150",
            fading ? "opacity-50" : "opacity-100"
          )}
        >
          {visibleActivities.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground text-center px-4">
              Brak atrakcji w tym obszarze — oddal mapę lub przesuń
            </div>
          ) : (
            <div className="space-y-2">
              {visibleActivities.map((activity) => (
                <SheetActivityCard
                  key={activity.id}
                  activity={activity}
                  isHighlighted={highlightedId === activity.id}
                  onCardClick={onCardClick}
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
}: {
  activity: Activity;
  isHighlighted: boolean;
  onCardClick: (activity: Activity) => void;
}) {
  const categoryColor = getCategoryColor(activity.type);
  const [imgError, setImgError] = useState(false);
  const initial = activity.title?.charAt(0)?.toUpperCase() || "?";

  return (
    <div
      data-activity-id={activity.id}
      onClick={() => onCardClick(activity)}
      className={cn(
        "flex gap-3 p-2 rounded-xl border bg-card transition-all cursor-pointer active:opacity-90",
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
      <div className="flex-1 min-w-0 py-0.5">
        <Link
          to={`/atrakcje/${activity.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-foreground hover:underline line-clamp-2"
        >
          {activity.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {activity.location}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            {activity.rating.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">{activity.ageRange}</span>
        </div>
      </div>
    </div>
  );
}
