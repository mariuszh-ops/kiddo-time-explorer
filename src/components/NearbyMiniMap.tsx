import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { MapPinned, Plus, Minus } from "lucide-react";
import { Activity } from "@/data/activities";
import { getCategoryColor } from "@/data/categoryColors";
import { useIsMobile } from "@/hooks/use-mobile";

interface NearbyItem extends Activity {
  distanceKm: number;
}

interface NearbyMiniMapProps {
  currentActivity: Activity;
  nearbyItems: NearbyItem[];
}

const currentPinIcon = L.divIcon({
  className: "current-pin",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const createNearbyPinIcon = (type?: string) => {
  const color = getCategoryColor(type || "inne");
  return L.divIcon({
    className: "nearby-pin",
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

function FitAndMarkers({
  currentActivity,
  nearbyItems,
}: NearbyMiniMapProps) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      [currentActivity.latitude, currentActivity.longitude],
      ...nearbyItems.map((a) => [a.latitude, a.longitude] as [number, number]),
    ];
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });

    // Current activity marker
    const currentMarker = L.marker(
      [currentActivity.latitude, currentActivity.longitude],
      { icon: currentPinIcon }
    ).addTo(map);
    currentMarker.bindPopup(
      `<div style="text-align:center;padding:2px 4px;"><strong style="font-size:13px;">${currentActivity.title}</strong><br/><span style="font-size:11px;color:#666;">Jesteś tutaj</span></div>`,
      { maxWidth: 200, closeButton: false }
    );

    // Nearby markers
    const markers = nearbyItems.map((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: createNearbyPinIcon(item.type),
      }).addTo(map);
      marker.bindPopup(
        `<div style="padding:2px 4px;min-width:140px;">
          <strong style="font-size:13px;">${item.title}</strong><br/>
          <span style="font-size:11px;color:#666;">${item.distanceKm.toFixed(1)} km stąd</span><br/>
          <a href="/atrakcje/${item.slug}" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600;">Zobacz →</a>
        </div>`,
        { maxWidth: 200, closeButton: false }
      );
      return marker;
    });

    return () => {
      currentMarker.remove();
      markers.forEach((m) => m.remove());
    };
  }, [map, currentActivity, nearbyItems]);

  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
      <button
        onClick={() => map.zoomIn()}
        className="w-7 h-7 rounded-md bg-background/90 border border-border shadow-sm flex items-center justify-center hover:bg-accent cursor-pointer"
        aria-label="Przybliż"
      >
        <Plus className="w-3.5 h-3.5 text-foreground" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-7 h-7 rounded-md bg-background/90 border border-border shadow-sm flex items-center justify-center hover:bg-accent cursor-pointer"
        aria-label="Oddal"
      >
        <Minus className="w-3.5 h-3.5 text-foreground" />
      </button>
    </div>
  );
}

const NearbyMiniMap = ({ currentActivity, nearbyItems }: NearbyMiniMapProps) => {
  const isMobile = useIsMobile();

  if (nearbyItems.length === 0) return null;

  const center: [number, number] = [currentActivity.latitude, currentActivity.longitude];
  const height = isMobile ? 220 : 280;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg md:text-xl font-serif font-semibold text-foreground mb-3">
        <MapPinned className="w-5 h-5" />
        Na mapie
      </h3>
      <div
        className="rounded-xl border border-border overflow-hidden relative"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={12}
          className="w-full h-full z-0"
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={!isMobile}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitAndMarkers currentActivity={currentActivity} nearbyItems={nearbyItems} />
          <ZoomControls />
        </MapContainer>
      </div>
    </div>
  );
};

export default NearbyMiniMap;
