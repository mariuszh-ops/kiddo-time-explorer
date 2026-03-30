import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Star, ChevronUp, GripHorizontal } from "lucide-react";
import { Activity, cityCenters } from "@/data/activities";
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

// Manages markers on the map
function MapMarkers({
  activities,
  onMarkerClick,
}: {
  activities: Activity[];
  onMarkerClick: (id: number) => void;
}) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    activities.forEach((activity) => {
      const marker = L.marker([activity.latitude, activity.longitude], {
        icon: createPinIcon(activity.rating),
      })
        .addTo(map)
        .bindPopup(createPopupContent(activity), {
          maxWidth: 240,
          className: "custom-map-popup",
          closeButton: true,
        });

      marker.on("click", () => onMarkerClick(activity.id));
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [activities, map, onMarkerClick]);

  return null;
}

// Recenter map when city changes
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

interface MapViewProps {
  activities: Activity[];
  filters: Filters;
}

const MapView = ({ activities, filters }: MapViewProps) => {
  const isMobile = useIsMobile();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  if (isMobile) {
    return (
      <div className="relative" style={{ height: "calc(100vh - 56px - 64px)" }}>
        <MapContainer
          center={mapCenter}
          zoom={12}
          className="w-full h-full z-0"
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} zoom={12} />
          <MapMarkers activities={activities} onMarkerClick={handleMarkerClick} />
        </MapContainer>

        {/* Static bottom card strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-card rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 flex flex-col">
          <div className="flex items-center pt-3 pb-2 px-3">
            <span className="text-xs text-muted-foreground font-medium">
              {activities.length} atrakcji
            </span>
          </div>
          <div className="flex-1 overflow-x-auto px-3 pb-3">
            <div className="flex gap-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  ref={(el) => { cardRefs.current[activity.id] = el; }}
                  className="min-w-[260px] flex-shrink-0"
                >
                  <MiniActivityCard
                    activity={activity}
                    isHighlighted={highlightedId === activity.id}
                  />
                </div>
              ))}
            </div>
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
            {activities.length} atrakcji
          </span>
        </div>
        <div className="p-3 space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              ref={(el) => { cardRefs.current[activity.id] = el; }}
            >
              <MiniActivityCard
                activity={activity}
                isHighlighted={highlightedId === activity.id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={mapCenter}
          zoom={12}
          className="w-full h-full z-0"
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} zoom={12} />
          <MapMarkers activities={activities} onMarkerClick={handleMarkerClick} />
        </MapContainer>
      </div>
    </div>
  );
};

// Compact activity card for map panels
function MiniActivityCard({
  activity,
  isHighlighted,
}: {
  activity: Activity;
  isHighlighted: boolean;
}) {
  return (
    <Link
      to={`/atrakcje/${activity.slug}`}
      className={cn(
        "flex gap-3 p-2 rounded-xl border bg-card transition-all hover:shadow-md",
        isHighlighted
          ? "border-primary ring-2 ring-primary/20 shadow-md"
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
        <h3 className="font-semibold text-sm text-foreground truncate">
          {activity.title}
        </h3>
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
    </Link>
  );
}

export default MapView;
