import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import { Link } from "react-router-dom";
import { Star, LocateFixed, LayoutGrid, MapPin, Heart } from "lucide-react";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { Activity, cityCenters, filterOptions } from "@/data/activities";
import { getCategoryColor } from "@/data/categoryColors";
import { Filters } from "@/hooks/useActivityFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MapBottomSheet from "./MapBottomSheet";
import MapCategoryChips, { FAVORITES_CHIP_KEY } from "./MapCategoryChips";

// Category emoji map
const CATEGORY_EMOJI: Record<string, string> = {
  "plac-zabaw": "🛝",
  "sport": "⚽",
  "warsztaty": "🎨",
  "zoo": "🦁",
  "muzeum": "🎭",
  "park": "🌳",
  "inne": "📌",
};

// Border color based on rating
const getRatingBorderColor = (rating: number): string => {
  if (rating >= 4.5) return "#22c55e";
  if (rating >= 4.0) return "#84cc16";
  if (rating >= 3.5) return "#eab308";
  return "#9ca3af";
};

// Custom pin icon — normal state
const createPinIcon = (rating: number, type?: string, isActive = false, isDimmed = false, isFav = false) => {
  const emoji = CATEGORY_EMOJI[type || "inne"] || "📌";
  const borderColor = isActive ? "#1a1a1a" : getRatingBorderColor(rating);
  const size = isActive ? 46 : 36;
  const borderW = isActive ? 3 : 2.5;
  const fontSize = isActive ? 22 : 18;
  const radius = isActive ? 10 : 8;
  const opacity = isDimmed ? 0.55 : 1;
  const shadow = isActive
    ? "0 4px 12px rgba(0,0,0,0.4)"
    : "0 2px 6px rgba(0,0,0,0.25)";
  const arrowSize = isActive ? 8 : 6;
  const arrowInner = isActive ? 6 : 4.5;
  const arrowOffset = isActive ? -8 : -7;
  const arrowInnerOffset = isActive ? -5 : -4;

  const heartBadge = isFav ? `<div style="
    position:absolute;top:-5px;right:-5px;
    width:16px;height:16px;border-radius:50%;
    background:#fff;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 1px 3px rgba(0,0,0,0.2);
  "><span style="font-size:10px;line-height:1;">❤️</span></div>` : "";

  return L.divIcon({
    className: "custom-rating-pin",
    html: `<div style="
      position:relative;
      width:${size}px;height:${size}px;border-radius:${radius}px;
      background:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:${fontSize}px;
      border:${borderW}px solid ${borderColor};
      box-shadow:${shadow};
      cursor:pointer;
      opacity:${opacity};
      transition:opacity 0.2s;
    ">${emoji}${heartBadge}<div style="
      position:absolute;bottom:${arrowOffset}px;left:50%;transform:translateX(-50%);
      width:0;height:0;
      border-left:${arrowSize}px solid transparent;
      border-right:${arrowSize}px solid transparent;
      border-top:${Math.abs(arrowOffset)}px solid ${borderColor};
    "></div><div style="
      position:absolute;bottom:${arrowInnerOffset}px;left:50%;transform:translateX(-50%);
      width:0;height:0;
      border-left:${arrowInner}px solid transparent;
      border-right:${arrowInner}px solid transparent;
      border-top:${Math.abs(arrowInnerOffset) + 1}px solid #fff;
    "></div></div>`,
    iconSize: [size, size + Math.abs(arrowOffset)],
    iconAnchor: [size / 2, size + Math.abs(arrowOffset)],
    popupAnchor: [0, -(size + Math.abs(arrowOffset))],
  });
};

// Popup content for pin click
const createPopupContent = (activity: Activity) => {
  return `
    <a href="/atrakcje/${activity.slug}" style="text-decoration:none;color:inherit;display:block;width:220px;">
      <img src="${activity.imageUrl}" alt="${activity.title}" style="width:100%;height:120px;object-fit:cover;border-radius:8px 8px 0 0;" />
      <div style="padding:8px 10px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:#1a1a1a;">${activity.title}</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:#666;">
          <span style="color:#f59e0b;">★</span> ${activity.rating.toFixed(1)}
          <span style="margin-left:4px;">${activity.ageRange}</span>
        </div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${activity.location}</div>
      </div>
    </a>
  `;
};

// Cluster icon creator
const createClusterIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 42 : 48;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:#2F6B4F;color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:${count < 10 ? 13 : 12}px;font-weight:700;
      border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Manages clustered markers on the map
function ClusteredMarkers({
  activities,
  onMarkerClick,
  markersRef,
  highlightedId,
  onMapClick,
  isFavorite,
}: {
  activities: Activity[];
  onMarkerClick: (id: number) => void;
  markersRef: React.MutableRefObject<Record<number, L.Marker>>;
  highlightedId: number | null;
  onMapClick: () => void;
  isFavorite: (id: number) => boolean;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const activityMapRef = useRef<Record<number, Activity>>({});

  // Build markers
  useEffect(() => {
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }
    markersRef.current = {};
    activityMapRef.current = {};

    const group = L.markerClusterGroup({
      disableClusteringAtZoom: 12,
      maxClusterRadius: 60,
      iconCreateFunction: createClusterIcon,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      animate: true,
    });

    activities.forEach((activity) => {
      const marker = L.marker([activity.latitude, activity.longitude], {
        icon: createPinIcon(activity.rating, activity.type, false, false, isFavorite(activity.id)),
      }).bindPopup(createPopupContent(activity), {
        maxWidth: 240,
        className: "custom-map-popup",
        closeButton: true,
      });

      marker.on("click", () => onMarkerClick(activity.id));
      markersRef.current[activity.id] = marker;
      activityMapRef.current[activity.id] = activity;
      group.addLayer(marker);
    });

    map.addLayer(group);
    clusterGroupRef.current = group;

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
      markersRef.current = {};
    };
  }, [activities, map, onMarkerClick, markersRef, isFavorite]);

  // Update pin icons when highlightedId or favorites change
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([idStr, marker]) => {
      const id = Number(idStr);
      const activity = activityMapRef.current[id];
      if (!activity) return;
      const isActive = highlightedId === id;
      const isDimmed = highlightedId !== null && !isActive;
      marker.setIcon(createPinIcon(activity.rating, activity.type, isActive, isDimmed, isFavorite(id)));
      if (isActive) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });
  }, [highlightedId, markersRef, isFavorite]);

  // Listen for clicks on empty map area to deselect
  useMapEvents({
    click: () => onMapClick(),
  });

  return null;
}

// Listens to map viewport changes and reports visible activities + center
function ViewportFilter({
  activities,
  onVisibleChange,
  onCenterChange,
}: {
  activities: Activity[];
  onVisibleChange: (visible: Activity[]) => void;
  onCenterChange?: (center: [number, number]) => void;
}) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const filterByBounds = useCallback(() => {
    const bounds = map.getBounds();
    const visible = activities.filter((a) =>
      bounds.contains([a.latitude, a.longitude])
    );
    onVisibleChange(visible);
    const c = map.getCenter();
    onCenterChange?.([c.lat, c.lng]);
  }, [map, activities, onVisibleChange, onCenterChange]);

  // Initial filter after map loads
  useEffect(() => {
    // Small delay to let fitBounds settle
    const t = setTimeout(filterByBounds, 100);
    return () => clearTimeout(t);
  }, [filterByBounds]);

  useMapEvents({
    moveend: () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(filterByBounds, 400);
    },
    zoomend: () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(filterByBounds, 400);
    },
  });

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return null;
}

// Imperatively fly to a location and open popup
function FlyToHandler({
  targetActivity,
  markersRef,
}: {
  targetActivity: Activity | null;
  markersRef: React.MutableRefObject<Record<number, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!targetActivity) return;
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 13);
    map.flyTo([targetActivity.latitude, targetActivity.longitude], targetZoom, { duration: 0.5 });
    const marker = markersRef.current[targetActivity.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  }, [targetActivity, map, markersRef]);
  return null;
}
// Invalidate map size after mount/visibility change to fix grey tiles bug
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Fit map bounds to all activity pins — only on initial mount (skip if restoring saved state)
function MapFitBounds({ activities, skip }: { activities: Activity[]; skip?: boolean }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current || activities.length === 0 || skip) return;
    hasInitialized.current = true;

    const bounds = L.latLngBounds(
      activities.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [activities, map, skip]);

  return null;
}

// Geolocation button
function LocateButton({ bottomOffset }: { bottomOffset?: string }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const pulseRef = useRef<L.CircleMarker | null>(null);

  const handleLocate = useCallback(() => {
    if (denied || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (markerRef.current) markerRef.current.remove();
        if (pulseRef.current) pulseRef.current.remove();
        // Pulse ring
        pulseRef.current = L.circleMarker([latitude, longitude], {
          radius: 20,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          color: "#3b82f6",
          weight: 1,
          opacity: 0.3,
        }).addTo(map);
        // Solid dot
        markerRef.current = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: "#3b82f6",
          fillOpacity: 0.9,
          color: "#fff",
          weight: 3,
        }).addTo(map);
        map.setView([latitude, longitude], 13, { animate: true });
        setLocating(false);
      },
      () => {
        setDenied(true);
        setLocating(false);
        toast.error("Włącz lokalizację w ustawieniach przeglądarki");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [map, denied, locating]);

  return (
    <button
      onClick={handleLocate}
      disabled={denied}
      className={cn(
        "absolute z-[1000] w-11 h-11 rounded-full bg-background border border-border shadow-md flex items-center justify-center transition-colors",
        bottomOffset ? `right-4` : "bottom-4 right-4",
        denied ? "opacity-40 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
      )}
      style={bottomOffset ? { bottom: bottomOffset } : undefined}
      title="Moja lokalizacja"
    >
      <LocateFixed className={cn("w-5 h-5", locating ? "animate-pulse text-primary" : "text-foreground")} />
    </button>
  );
}
// MapRefCapture — stores map instance for external use
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

export interface SavedMapState {
  center: [number, number];
  zoom: number;
  selectedCategories: Set<string>;
}

interface MapViewProps {
  activities: Activity[];
  filters: Filters;
  onViewModeChange?: (mode: "grid" | "map", visibleActivities?: Activity[]) => void;
  savedMapState?: SavedMapState | null;
  onSaveMapState?: (state: SavedMapState) => void;
}

const MapView = ({ activities, filters, onViewModeChange, savedMapState, onSaveMapState }: MapViewProps) => {
  const isMobile = useIsMobile();
  const { isFavorite, toggleFavorite } = useSavedActivities();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<Activity | null>(null);
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>(activities);
  const [fading, setFading] = useState(false);
  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "half" | "full">("peek");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(savedMapState?.selectedCategories ?? new Set());
  const [liveMapCenter, setLiveMapCenter] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const markersRef = useRef<Record<number, L.Marker>>({});
  const mapInstanceRef = useRef<L.Map | null>(null);

  const cityKey = filters.city || "warszawa";
  const center = cityCenters[cityKey] || cityCenters.warszawa;
  const mapCenter: [number, number] = savedMapState ? savedMapState.center : [center.lat, center.lng];
  const initialZoom = savedMapState ? savedMapState.zoom : 11;

  // Save map state on unmount
  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current;
      if (map && onSaveMapState) {
        const c = map.getCenter();
        onSaveMapState({
          center: [c.lat, c.lng],
          zoom: map.getZoom(),
          selectedCategories,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSaveMapState, selectedCategories]);

  // Normalize for search
  const normalizeText = useCallback((text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), []);

  const searchNormalized = useMemo(() => normalizeText(searchQuery.trim()), [searchQuery, normalizeText]);

  // Filter activities by selected categories + favorites + search
  const showFavoritesOnly = selectedCategories.has(FAVORITES_CHIP_KEY);
  const categoryFilters = useMemo(() => {
    const s = new Set(selectedCategories);
    s.delete(FAVORITES_CHIP_KEY);
    return s;
  }, [selectedCategories]);

  const matchesSearch = useCallback((a: Activity) => {
    if (!searchNormalized) return true;
    return normalizeText(a.title).includes(searchNormalized) ||
      normalizeText(a.location).includes(searchNormalized) ||
      normalizeText(a.type).includes(searchNormalized);
  }, [searchNormalized, normalizeText]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (categoryFilters.size > 0) {
      result = result.filter((a) => categoryFilters.has(a.type));
    }
    if (showFavoritesOnly) {
      result = result.filter((a) => isFavorite(a.id));
    }
    if (searchNormalized) {
      result = result.filter(matchesSearch);
    }
    return result;
  }, [activities, categoryFilters, showFavoritesOnly, isFavorite, searchNormalized, matchesSearch]);

  const handleCategoryToggle = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Filtered visible activities (viewport + category + favorites + search)
  const displayedActivities = useMemo(() => {
    let result = visibleActivities;
    if (categoryFilters.size > 0) {
      result = result.filter((a) => categoryFilters.has(a.type));
    }
    if (showFavoritesOnly) {
      result = result.filter((a) => isFavorite(a.id));
    }
    if (searchNormalized) {
      result = result.filter(matchesSearch);
    }
    return result;
  }, [visibleActivities, categoryFilters, showFavoritesOnly, isFavorite, searchNormalized, matchesSearch]);

  // Auto-fly when exactly 1 search result
  useEffect(() => {
    if (searchNormalized && displayedActivities.length === 1) {
      const activity = displayedActivities[0];
      setHighlightedId(activity.id);
      setFlyTarget(activity);
    }
  }, [displayedActivities, searchNormalized]);

  const handleMarkerClick = useCallback((id: number) => {
    setHighlightedId(id);
    const card = cardRefs.current[id];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, []);

  const handleCardClick = useCallback((activity: Activity) => {
    setHighlightedId(activity.id);
    setFlyTarget(activity);
  }, []);

  const handleMapClick = useCallback(() => {
    setHighlightedId(null);
  }, []);

  const handleVisibleChange = useCallback((visible: Activity[]) => {
    setFading(true);
    // Brief fade transition
    setTimeout(() => {
      setVisibleActivities(visible);
      setFading(false);
    }, 100);
  }, []);

  const handleShowAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || filteredActivities.length === 0) return;
    const bounds = L.latLngBounds(
      filteredActivities.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [filteredActivities]);

  if (isMobile) {
    // Adjust locate button offset based on sheet state
    const locateBottomOffset = mobileSheetState === "peek" ? "96px" : mobileSheetState === "half" ? "54%" : "92%";

    return (
      <div className="fixed inset-0 top-[56px] bottom-[64px] z-20 overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={initialZoom}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInvalidateSize />
          <MapRefCapture mapRef={mapInstanceRef} />
          <MapFitBounds activities={activities} skip={!!savedMapState} />
          <ClusteredMarkers activities={filteredActivities} onMarkerClick={handleMarkerClick} markersRef={markersRef} highlightedId={highlightedId} onMapClick={handleMapClick} isFavorite={isFavorite} />
          <ViewportFilter activities={filteredActivities} onVisibleChange={handleVisibleChange} onCenterChange={setLiveMapCenter} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
          <LocateButton bottomOffset={locateBottomOffset} />
        </MapContainer>

        {/* Back to list button (mobile) */}
        <button
          onClick={() => onViewModeChange?.("grid", displayedActivities)}
          className="absolute top-3 left-3 z-[1000] bg-background/95 hover:bg-background shadow-lg rounded-full px-3.5 py-2 flex items-center gap-2 border border-border text-sm font-medium cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
          Lista · {displayedActivities.length}
        </button>

        {/* Draggable bottom sheet */}
        <MapBottomSheet
          visibleActivities={displayedActivities}
          highlightedId={highlightedId}
          onCardClick={handleCardClick}
          fading={fading}
          onSheetStateChange={setMobileSheetState}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          mapCenter={liveMapCenter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShowAll={handleShowAll}
        />
      </div>
    );
  }

  // Desktop: sidebar left + map right
  return (
    <div className="flex" style={{ height: "calc(100vh - 64px - 52px)" }}>
      {/* Sidebar */}
      <div className="w-[320px] min-w-[320px] flex-shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="p-3 border-b border-border space-y-2">
          <span className="text-sm text-muted-foreground font-medium">
            {displayedActivities.length} atrakcji w widoku
          </span>
          <MapCategoryChips selected={selectedCategories} onToggle={handleCategoryToggle} />
        </div>
        <div
          className={cn("p-3 space-y-3 transition-opacity duration-150", fading ? "opacity-50" : "opacity-100")}
        >
          {displayedActivities.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground px-4">
              Brak atrakcji w tym obszarze — oddal mapę lub przesuń
            </div>
          ) : (
            displayedActivities.map((activity) => (
              <div
                key={activity.id}
                ref={(el) => { cardRefs.current[activity.id] = el; }}
              >
                <MiniActivityCard
                  activity={activity}
                  isHighlighted={highlightedId === activity.id}
                  onCardClick={handleCardClick}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={initialZoom}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInvalidateSize />
          <MapRefCapture mapRef={mapInstanceRef} />
          <MapFitBounds activities={activities} skip={!!savedMapState} />
          <ClusteredMarkers activities={filteredActivities} onMarkerClick={handleMarkerClick} markersRef={markersRef} highlightedId={highlightedId} onMapClick={handleMapClick} isFavorite={isFavorite} />
          <ViewportFilter activities={filteredActivities} onVisibleChange={handleVisibleChange} onCenterChange={setLiveMapCenter} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
          <LocateButton />
        </MapContainer>
        

        {/* Count label */}
        <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
          {displayedActivities.length} atrakcji w widoku
        </div>
      </div>
    </div>
  );
};

// Compact activity card for map panels
function MiniActivityCard({
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
      onClick={() => onCardClick(activity)}
      className={cn(
        "flex gap-3 p-2 rounded-xl border bg-card transition-all hover:shadow-md cursor-pointer",
        isHighlighted
          ? "shadow-md"
          : "border-border"
      )}
      style={{
        borderLeft: `4px solid ${categoryColor}`,
        background: isHighlighted ? `${categoryColor}12` : undefined,
      }}
    >
      {imgError || !activity.imageUrl ? (
        <div className="w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center bg-muted">
          <span className="text-2xl font-bold text-muted-foreground">{initial}</span>
        </div>
      ) : (
        <img
          src={activity.imageUrl}
          alt={activity.title}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
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
        <div className="flex items-center gap-2 mt-1.5">
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


export default MapView;
