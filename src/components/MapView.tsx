import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { Link } from "react-router-dom";
import { Star, LocateFixed, LayoutGrid, MapPin } from "lucide-react";
import { Activity, cityCenters, filterOptions } from "@/data/activities";
import { getCategoryColor, CATEGORY_COLORS } from "@/data/categoryColors";
import { Filters } from "@/hooks/useActivityFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MapBottomSheet from "./MapBottomSheet";
import MapCategoryChips from "./MapCategoryChips";

// Custom rating pin icon
const createPinIcon = (rating: number, type?: string) => {
  const color = getCategoryColor(type || "inne");
  return L.divIcon({
    className: "custom-rating-pin",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      cursor:pointer;
    ">${rating.toFixed(1)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
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
}: {
  activities: Activity[];
  onMarkerClick: (id: number) => void;
  markersRef: React.MutableRefObject<Record<number, L.Marker>>;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // Clean up previous
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }
    markersRef.current = {};

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
        icon: createPinIcon(activity.rating, activity.type),
      }).bindPopup(createPopupContent(activity), {
        maxWidth: 240,
        className: "custom-map-popup",
        closeButton: true,
      });

      marker.on("click", () => onMarkerClick(activity.id));
      markersRef.current[activity.id] = marker;
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
  }, [activities, map, onMarkerClick, markersRef]);

  return null;
}

// Listens to map viewport changes and reports visible activities
function ViewportFilter({
  activities,
  onVisibleChange,
}: {
  activities: Activity[];
  onVisibleChange: (visible: Activity[]) => void;
}) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const filterByBounds = useCallback(() => {
    const bounds = map.getBounds();
    const visible = activities.filter((a) =>
      bounds.contains([a.latitude, a.longitude])
    );
    onVisibleChange(visible);
  }, [map, activities, onVisibleChange]);

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
    map.flyTo([targetActivity.latitude, targetActivity.longitude], 15, { duration: 0.8 });
    const marker = markersRef.current[targetActivity.id];
    if (marker) {
      setTimeout(() => marker.openPopup(), 400);
    }
  }, [targetActivity, map, markersRef]);
  return null;
}

// Fit map bounds to all activity pins
function MapFitBounds({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const prevIdsRef = useRef<string>("");

  useEffect(() => {
    if (activities.length === 0) return;
    const ids = activities.map((a) => a.id).sort().join(",");
    if (ids === prevIdsRef.current) return;
    prevIdsRef.current = ids;

    const bounds = L.latLngBounds(
      activities.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [activities, map]);

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

// "Show all attractions" button when viewport has 0 visible
function ShowAllButton({ activities }: { activities: Activity[] }) {
  const map = useMap();
  const handleClick = useCallback(() => {
    if (activities.length === 0) return;
    const bounds = L.latLngBounds(
      activities.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [map, activities]);

  return (
    <button
      onClick={handleClick}
      className="absolute z-[1000] top-16 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-full px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
    >
      <MapPin className="w-4 h-4 text-primary" />
      Pokaż wszystkie atrakcje
    </button>
  );
}

interface MapViewProps {
  activities: Activity[];
  filters: Filters;
  onViewModeChange?: (mode: "grid" | "map", visibleActivities?: Activity[]) => void;
}

const MapView = ({ activities, filters, onViewModeChange }: MapViewProps) => {
  const isMobile = useIsMobile();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<Activity | null>(null);
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>(activities);
  const [fading, setFading] = useState(false);
  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "half" | "full">("peek");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const markersRef = useRef<Record<number, L.Marker>>({});

  const cityKey = filters.city || "warszawa";
  const center = cityCenters[cityKey] || cityCenters.warszawa;
  const mapCenter: [number, number] = [center.lat, center.lng];

  // Filter activities by selected categories
  const filteredActivities = useMemo(() => {
    if (selectedCategories.size === 0) return activities;
    return activities.filter((a) => selectedCategories.has(a.type));
  }, [activities, selectedCategories]);

  const handleCategoryToggle = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Filtered visible activities (viewport + category)
  const displayedActivities = useMemo(() => {
    if (selectedCategories.size === 0) return visibleActivities;
    return visibleActivities.filter((a) => selectedCategories.has(a.type));
  }, [visibleActivities, selectedCategories]);

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

  const handleVisibleChange = useCallback((visible: Activity[]) => {
    setFading(true);
    // Brief fade transition
    setTimeout(() => {
      setVisibleActivities(visible);
      setFading(false);
    }, 100);
  }, []);

  if (isMobile) {
    // Adjust locate button offset based on sheet state
    const locateBottomOffset = mobileSheetState === "peek" ? "96px" : mobileSheetState === "half" ? "54%" : "92%";

    return (
      <div className="fixed inset-0 top-[56px] bottom-[64px] z-20 overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={11}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFitBounds activities={filteredActivities} />
          <ClusteredMarkers activities={filteredActivities} onMarkerClick={handleMarkerClick} markersRef={markersRef} />
          <ViewportFilter activities={filteredActivities} onVisibleChange={handleVisibleChange} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
          <LocateButton bottomOffset={locateBottomOffset} />
          {displayedActivities.length === 0 && <ShowAllButton activities={filteredActivities} />}
        </MapContainer>
        <MapLegend />

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
        />
      </div>
    );
  }

  // Desktop: sidebar left + map right
  return (
    <div className="flex" style={{ height: "calc(100vh - 56px)" }}>
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
          zoom={11}
          className="w-full h-full z-0"
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFitBounds activities={filteredActivities} />
          <ClusteredMarkers activities={filteredActivities} onMarkerClick={handleMarkerClick} markersRef={markersRef} />
          <ViewportFilter activities={filteredActivities} onVisibleChange={handleVisibleChange} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
          <LocateButton />
          {displayedActivities.length === 0 && <ShowAllButton activities={filteredActivities} />}
        </MapContainer>
        <MapLegend />

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

// Collapsible map legend
function MapLegend() {
  const [open, setOpen] = useState(false);
  const labels: Record<string, string> = {
    "sala-zabaw": "Sale zabaw",
    "plac-zabaw": "Place zabaw",
    "sport": "Sport i ruch",
    "zoo": "Zoo i zwierzęta",
    "park-rozrywki": "Parki rozrywki",
    "muzeum-teatr": "Muzea i teatry",
    "park": "Parki i natura",
    "inne": "Inne",
  };

  return (
    <div className="absolute z-[1000] bottom-4 left-4 md:bottom-4 md:left-auto md:right-16">
      {open ? (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-3 min-w-[160px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Legenda</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer">✕</button>
          </div>
          <div className="space-y-1.5">
            {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs text-foreground">{labels[key] || key}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-accent cursor-pointer"
          title="Legenda"
        >
          <span className="text-base">🗂</span>
        </button>
      )}
    </div>
  );
}

export default MapView;
