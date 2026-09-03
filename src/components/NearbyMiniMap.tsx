import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  /** Pełna mapa regionu — jedyne interaktywne wyjście z mini-mapy. */
  mapaHref?: string;
}

// Mini-mapa jest PODGLĄDEM, nie nawigacją: markery są nieinteraktywne.
// Wcześniej 44×44 px wrappery nachodziły na siebie (axe target-size: 6 z 12
// „partially obscured"), a treść niosły wyłącznie w [title] — czyli tylko dla
// myszy. Te same atrakcje są klikalnymi kaflami tuż nad mapą (K-15 / K-17).
const currentPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;pointer-events:none;"><div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});


const nearbyPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;pointer-events:none;"><div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});


function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    // Jak w MapView: prefiks atrybucji bez linku z samym [title] (K-17).
    map.attributionControl?.setPrefix("Leaflet");
    return () => { mapRef.current = null; };
  }, [map, mapRef]);
  return null;
}

function FitAndMarkers({ currentActivity, nearbyActivities }: NearbyMiniMapProps) {
  const map = useMap();

  useEffect(() => {
    const currentLatLng: [number, number] = [currentActivity.latitude, currentActivity.longitude];
    const closeby = nearbyActivities.filter((a) => a.distanceKm <= 25);
    if (closeby.length > 0) {
      const points: [number, number][] = [
        currentLatLng,
        ...closeby.map((a) => [a.latitude, a.longitude] as [number, number]),
      ];
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });
      if (map.getZoom() < 11) {
        map.setView(currentLatLng, 12);
      }
    } else {
      map.setView(currentLatLng, 12);
    }

    const currentMarker = L.marker(
      [currentActivity.latitude, currentActivity.longitude],
      { icon: currentPinIcon, zIndexOffset: 1000, interactive: false, keyboard: false }
    ).addTo(map);

    const markers = nearbyActivities.map((item) =>
      L.marker([item.latitude, item.longitude], {
        icon: nearbyPinIcon,
        interactive: false,
        keyboard: false,
      }).addTo(map)
    );

    return () => {
      currentMarker.remove();
      markers.forEach((m) => m.remove());
    };
  }, [map, currentActivity, nearbyActivities]);

  return null;
}

const NearbyMiniMap = ({ currentActivity, nearbyActivities, mapaHref }: NearbyMiniMapProps) => {
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
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2t3k_1_1d73bd80eb2425214fc08f2f"
        />
        <MapRefCapture mapRef={mapRef} />
        <FitAndMarkers currentActivity={currentActivity} nearbyActivities={nearbyActivities} />
      </MapContainer>
      {mapaHref && (
        <Link
          to={mapaHref}
          className="absolute bottom-2 left-2 z-[400] inline-flex min-h-11 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-md hover:bg-muted"
        >
          Otwórz pełną mapę
        </Link>
      )}
      <div className="absolute top-2 right-2 z-[400] flex flex-col gap-1">
        <button
          type="button"
          aria-label="Przybliż mapę"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-10 h-10 md:w-8 md:h-8 rounded-md bg-background hover:bg-muted shadow-md border border-border flex items-center justify-center text-foreground text-lg font-semibold leading-none"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Oddal mapę"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-10 h-10 md:w-8 md:h-8 rounded-md bg-background hover:bg-muted shadow-md border border-border flex items-center justify-center text-foreground text-lg font-semibold leading-none"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default NearbyMiniMap;
