import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { Link } from "react-router-dom";
import { Star, LocateFixed, LayoutGrid } from "lucide-react";
import { Activity, cityCenters, filterOptions } from "@/data/activities";
import { getCategoryColor, CATEGORY_COLORS } from "@/data/categoryColors";
import { Filters } from "@/hooks/useActivityFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Custom rating pin icon
const createPinIcon = (rating: number) => {
  const color = rating >= 4.5 ? "#16a34a" : rating >= 4.0 ? "#2563eb" : "#6b7280";
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
        icon: createPinIcon(activity.rating),
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
      timerRef.current = setTimeout(filterByBounds, 250);
    },
    zoomend: () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(filterByBounds, 250);
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
function LocateButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const markerRef = useRef<L.CircleMarker | null>(null);

  const handleLocate = useCallback(() => {
    if (denied || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (markerRef.current) markerRef.current.remove();
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
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [map, denied, locating]);

  return (
    <button
      onClick={handleLocate}
      disabled={denied}
      className={cn(
        "absolute z-[1000] bottom-4 right-4 md:top-4 md:bottom-auto w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center transition-colors",
        denied ? "opacity-40 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
      )}
      title="Moja lokalizacja"
    >
      <LocateFixed className={cn("w-5 h-5", locating ? "animate-pulse text-primary" : "text-foreground")} />
    </button>
  );
}

interface MapViewProps {
  activities: Activity[];
  filters: Filters;
  onViewModeChange?: (mode: "grid" | "map") => void;
}

const MapView = ({ activities, filters, onViewModeChange }: MapViewProps) => {
  const isMobile = useIsMobile();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<Activity | null>(null);
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>(activities);
  const [fading, setFading] = useState(false);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const markersRef = useRef<Record<number, L.Marker>>({});

  const cityKey = filters.city || "warszawa";
  const center = cityCenters[cityKey] || cityCenters.warszawa;
  const mapCenter: [number, number] = [center.lat, center.lng];

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
    return (
      <div className="relative" style={{ height: "calc(100vh - 56px - 64px)" }}>
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
          <MapFitBounds activities={activities} />
          <ClusteredMarkers activities={activities} onMarkerClick={handleMarkerClick} markersRef={markersRef} />
          <ViewportFilter activities={activities} onVisibleChange={handleVisibleChange} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
          <LocateButton />
        </MapContainer>

        {/* Count label */}
        <div className="absolute top-3 left-14 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
          {visibleActivities.length} atrakcji w widoku
        </div>

        {/* Back to list button (mobile) */}
        <button
          onClick={() => onViewModeChange?.("grid")}
          className="absolute top-3 left-3 z-[1000] bg-background/95 hover:bg-background shadow-lg rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-border text-xs font-medium"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Lista
        </button>

        {/* Static bottom card strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-card rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 flex flex-col">
          <div className="flex items-center pt-3 pb-2 px-3">
            <span className="text-xs text-muted-foreground font-medium">
              {visibleActivities.length} atrakcji
            </span>
          </div>
          <div
            className={cn("flex-1 overflow-x-auto px-3 pb-3 transition-opacity duration-150", fading ? "opacity-50" : "opacity-100")}
          >
            {visibleActivities.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground px-4 text-center">
                Brak atrakcji w tym obszarze — oddal mapę lub przesuń
              </div>
            ) : (
              <div className="flex gap-3">
                {visibleActivities.map((activity) => (
                  <div
                    key={activity.id}
                    ref={(el) => { cardRefs.current[activity.id] = el; }}
                    className="min-w-[260px] flex-shrink-0"
                  >
                    <MiniActivityCard
                      activity={activity}
                      isHighlighted={highlightedId === activity.id}
                      onCardClick={handleCardClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: sidebar left + map right
  return (
    <div className="flex" style={{ height: "calc(100vh - 56px)" }}>
      {/* Sidebar */}
      <div className="w-[380px] flex-shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="p-3 border-b border-border">
          <span className="text-sm text-muted-foreground font-medium">
            {visibleActivities.length} atrakcji w widoku
          </span>
        </div>
        <div
          className={cn("p-3 space-y-3 transition-opacity duration-150", fading ? "opacity-50" : "opacity-100")}
        >
          {visibleActivities.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground px-4">
              Brak atrakcji w tym obszarze — oddal mapę lub przesuń
            </div>
          ) : (
            visibleActivities.map((activity) => (
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
          <MapFitBounds activities={activities} />
          <ClusteredMarkers activities={activities} onMarkerClick={handleMarkerClick} markersRef={markersRef} />
          <ViewportFilter activities={activities} onVisibleChange={handleVisibleChange} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
          <LocateButton />
        </MapContainer>

        {/* Count label */}
        <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
          {visibleActivities.length} atrakcji w widoku
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
  return (
    <div
      onClick={() => onCardClick(activity)}
      className={cn(
        "flex gap-3 p-2 rounded-xl border bg-card transition-all hover:shadow-md cursor-pointer",
        isHighlighted
          ? "border-l-[3px] border-l-[#2F6B4F] bg-[#DCEEDB]/40 border-t-border border-r-border border-b-border shadow-md"
          : "border-border"
      )}
    >
      <img
        src={activity.imageUrl}
        alt={activity.title}
        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0 py-0.5">
        <Link
          to={`/atrakcje/${activity.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-foreground truncate block hover:underline"
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
