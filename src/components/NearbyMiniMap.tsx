import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface NearbyActivity {
  id: number;
  title: string;
  slug: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

interface NearbyMiniMapProps {
  currentActivity: {
    title: string;
    latitude: number;
    longitude: number;
  };
  nearbyActivities: NearbyActivity[];
}

// Markery są klikalne (popup) — przezroczysty wrapper powiększa cel dotyku
// do ≥28×28 px (WCAG target-size), kropka zostaje wizualnie mała.
const currentPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;"><div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const nearbyPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => { mapRef.current = null; };
  }, [map, mapRef]);
  return null;
}

function FitAndMarkers({ currentActivity, nearbyActivities }: NearbyMiniMapProps) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      [currentActivity.latitude, currentActivity.longitude],
      ...nearbyActivities.map((a) => [a.latitude, a.longitude] as [number, number]),
    ];
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

    const currentMarker = L.marker(
      [currentActivity.latitude, currentActivity.longitude],
      { icon: currentPinIcon, zIndexOffset: 1000, title: currentActivity.title, alt: currentActivity.title }
    ).addTo(map);
    currentMarker.bindPopup(
      `<div style="text-align:center;padding:2px 4px;"><strong style="font-size:13px;">${currentActivity.title}</strong></div>`,
      { maxWidth: 200, closeButton: false }
    );

    const markers = nearbyActivities.map((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: nearbyPinIcon,
        title: item.title,
        alt: item.title,
      }).addTo(map);
      marker.bindPopup(
        `<div style="padding:2px 4px;min-width:120px;">
          <strong style="font-size:13px;">${item.title}</strong><br/>
          <span style="font-size:11px;color:#666;">${item.distanceKm.toFixed(1)} km</span><br/>
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
  }, [map, currentActivity, nearbyActivities]);

  return null;
}

const NearbyMiniMap = ({ currentActivity, nearbyActivities }: NearbyMiniMapProps) => {
  // Hooki przed wczesnym returnem (rules-of-hooks)
  const mapRef = useRef<L.Map | null>(null);

  if (nearbyActivities.length === 0) return null;

  const center: [number, number] = [currentActivity.latitude, currentActivity.longitude];

  return (
    <div className="mt-4 h-[200px] md:h-[250px] rounded-xl overflow-hidden shadow-sm relative">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full z-0"
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapRefCapture mapRef={mapRef} />
        <FitAndMarkers currentActivity={currentActivity} nearbyActivities={nearbyActivities} />
      </MapContainer>
      <div className="absolute top-2 right-2 z-[400] flex flex-col gap-1">
        <button
          type="button"
          aria-label="Przybliż mapę"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 rounded-md bg-background hover:bg-muted shadow-md border border-border flex items-center justify-center text-foreground text-lg font-semibold leading-none"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Oddal mapę"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 rounded-md bg-background hover:bg-muted shadow-md border border-border flex items-center justify-center text-foreground text-lg font-semibold leading-none"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default NearbyMiniMap;
