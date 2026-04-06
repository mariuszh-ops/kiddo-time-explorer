import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

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

const currentPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const nearbyPinIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

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
      { icon: currentPinIcon, zIndexOffset: 1000 }
    ).addTo(map);
    currentMarker.bindPopup(
      `<div style="text-align:center;padding:2px 4px;"><strong style="font-size:13px;">${currentActivity.title}</strong></div>`,
      { maxWidth: 200, closeButton: false }
    );

    const markers = nearbyActivities.map((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: nearbyPinIcon,
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
  if (nearbyActivities.length === 0) return null;

  const center: [number, number] = [currentActivity.latitude, currentActivity.longitude];

  return (
    <div className="mt-4 h-[200px] md:h-[250px] rounded-xl overflow-hidden shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full z-0"
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <FitAndMarkers currentActivity={currentActivity} nearbyActivities={nearbyActivities} />
      </MapContainer>
    </div>
  );
};

export default NearbyMiniMap;
