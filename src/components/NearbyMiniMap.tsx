import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPinned, Plus, Minus, X, Maximize2 } from "lucide-react";
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

    const currentMarker = L.marker(
      [currentActivity.latitude, currentActivity.longitude],
      { icon: currentPinIcon }
    ).addTo(map);
    currentMarker.bindPopup(
      `<div style="text-align:center;padding:2px 4px;"><strong style="font-size:13px;">${currentActivity.title}</strong><br/><span style="font-size:11px;color:#666;">Jesteś tutaj</span></div>`,
      { maxWidth: 200, closeButton: false }
    );

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

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

const NearbyMiniMap = ({ currentActivity, nearbyItems }: NearbyMiniMapProps) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  if (nearbyItems.length === 0) return null;

  const center: [number, number] = [currentActivity.latitude, currentActivity.longitude];
  const previewHeight = isMobile ? 220 : 280;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg md:text-xl font-serif font-semibold text-foreground mb-3">
        <MapPinned className="w-5 h-5" />
        Na mapie
      </h3>

      {/* Preview (clickable thumbnail) */}
      <div
        className="rounded-xl border border-border overflow-hidden relative cursor-pointer group"
        style={{ height: previewHeight }}
        onClick={() => setIsExpanded(true)}
      >
        <MapContainer
          center={center}
          zoom={12}
          className="w-full h-full z-0"
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitAndMarkers currentActivity={currentActivity} nearbyItems={nearbyItems} />
        </MapContainer>
        {/* Expand overlay */}
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium text-foreground">
            <Maximize2 className="w-4 h-4" />
            Powiększ mapę
          </div>
        </div>
      </div>

      {/* Expanded fullscreen overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          onClick={(e) => { if (e.target === e.currentTarget) setIsExpanded(false); }}
        >
          <div className="relative w-full max-w-4xl h-[80vh] md:h-[85vh] rounded-2xl overflow-hidden border border-border shadow-2xl bg-background">
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-3 right-3 z-[10000] w-9 h-9 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center hover:bg-accent cursor-pointer"
              aria-label="Zamknij mapę"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <MapContainer
              center={center}
              zoom={12}
              className="w-full h-full z-0"
              zoomControl={false}
              scrollWheelZoom={true}
              dragging={true}
              attributionControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitAndMarkers currentActivity={currentActivity} nearbyItems={nearbyItems} />
              <ZoomControls />
              <InvalidateOnMount />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyMiniMap;
