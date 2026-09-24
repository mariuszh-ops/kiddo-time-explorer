import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Link, useLocation } from "react-router-dom";
import { useRealNavigationType } from "@/lib/navigationType";
import { Star, LocateFixed, LayoutGrid, MapPin, Heart, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { Activity, cityCenters, filterOptions } from "@/data/activities";
import { getCategoryColor } from "@/data/categoryColors";
import { Filters } from "@/hooks/useActivityFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MapBottomSheet from "./MapBottomSheet";
import MapCategoryChips, { FAVORITES_CHIP_KEY } from "./MapCategoryChips";
import { useMapPins } from "@/hooks/useMapPins";
import { useMergedPinDetails } from "@/hooks/useMergedPinDetails";
import { fetchPinDetails, mergePinDetails, getCachedPinDetails, type MapBbox } from "@/lib/mapPins";
import { formatRatingPl } from "@/lib/formatRating";
import { buildSrcSet, fallbackToOriginal } from "@/lib/imageSrcSet";

/** Ile kafli lista pod mapa renderuje na raz („Pokaz wiecej" dokleja kolejna porcje). */
const PORCJA_LISTY = 30;

/** F-17: o ile rozszerzamy kadr przed zapytaniem — zapas na drobny pan/zoom. */
const ZAPAS_KADRU = 0.3;
/** F-17: opóźnienie zapytania po ruchu mapy (kolejne moveend zerują licznik). */
const DEBOUNCE_KADRU_MS = 300;
/** Granice Polski — „Pokaż wszystkie atrakcje" w trybie kadrowym. */
const GRANICE_POLSKI = L.latLngBounds([48.9, 13.9], [55.0, 24.3]);

/** Para kadrów: widoczny (do testu pokrycia) i powiększony o zapas (do pobrania). */
export interface KadryMapy {
  bbox: MapBbox;
  visible: MapBbox;
}

/** Kadr widoczny + ten sam kadr powiększony o zapas, przycięty do granic geograficznych. */
function kadryMapy(bounds: L.LatLngBounds): KadryMapy {
  const rozpietoscLat = bounds.getNorth() - bounds.getSouth();
  const rozpietoscLng = bounds.getEast() - bounds.getWest();
  return {
    visible: {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    },
    bbox: {
      minLat: Math.max(-90, bounds.getSouth() - rozpietoscLat * ZAPAS_KADRU),
      maxLat: Math.min(90, bounds.getNorth() + rozpietoscLat * ZAPAS_KADRU),
      minLng: Math.max(-180, bounds.getWest() - rozpietoscLng * ZAPAS_KADRU),
      maxLng: Math.min(180, bounds.getEast() + rozpietoscLng * ZAPAS_KADRU),
    },
  };
}

// Category emoji map
const CATEGORY_EMOJI: Record<string, string> = {
  // Nowa taksonomia
  "sala-zabaw": "🎠",
  "plac-zabaw": "🛝",
  "park-rozrywki": "🎢",
  "centra-rozrywki": "🎮",
  "muzeum-teatr": "🎭",
  "sport": "⚽",
  "zoo": "🦁",
  "park": "🌳",
  "inne": "📌",
  // Compatibility ze starą taksonomią (do czasu migracji danych)
  "warsztaty": "🎨",
  "muzeum": "🎭",
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
  const size = isActive ? 46 : 40;
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

// L-01 (stored-XSS): dymek Leafleta to JEDYNE miejsce, gdzie dane katalogu
// trafiaja do innerHTML — wszystko inne renderuje React, ktory escapuje sam.
// Kazda wartosc pochodzaca z danych (nazwa, miejscowosc, wiek, adres zdjecia)
// musi przejsc przez escapeHtml, inaczej nazwa z `<` wykonuje kod w przegladarce.
const escapeHtml = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Adres obrazka: dopuszczamy tylko http(s):// oraz sciezki wlasnego serwisu. */
const safeImageUrl = (raw?: string | null): string => {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s) && !s.startsWith("/")) return "";
  let norm = s;
  try {
    norm = encodeURI(decodeURI(s));
  } catch {
    norm = encodeURI(s);
  }
  return escapeHtml(norm);
};

// Popup content for pin click
// K-15: serce siedzi po LEWEJ. Po prawej Leaflet rysuje wlasny przycisk zamkniecia
// (44x44, z-index 10, top:4 right:6) — przy top:8 right:8 lezal on na sercu i
// zostawal 1 px do klikniecia, wiec ulubionych nie dalo sie przelaczyc z dymka.
const favButtonMarkup = (isFav: boolean) => `
  <button type="button" data-fav-toggle="1" aria-pressed="${isFav}"
    aria-label="${isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}"
    style="position:absolute;top:8px;left:8px;z-index:5;width:36px;height:36px;border:0;border-radius:9999px;
    background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;cursor:pointer;">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="${isFav ? "#ef4444" : "none"}" stroke="${isFav ? "#ef4444" : "#ffffff"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  </button>`;

// Popup Leafleta budujemy jako HTML, wiec srcset/sizes wstawiamy tekstem.
// Kadr 220x120 px -> przegladarka wybierze wariant 320w zamiast oryginalu 1200 px.
const popupSrcSetAttrs = (src?: string | null) => {
  const set = buildSrcSet(src ?? "");
  if (!set) return "";
  // Kadr popupu to 220x120 px. Bez odciecia kandydata 1200w telefon z DPR 3
  // (220 x 3 = 660 px) siegnalby po oryginal, a wariant 640 px w zupelnosci wystarcza.
  const bezOryginalu = set
    .split(", ")
    .filter((k) => !/\s1200w$/.test(k))
    .join(", ");
  return ` srcset="${escapeHtml(bezOryginalu)}" sizes="220px"`;
};

const createPopupContent = (activity: Activity, isFav: boolean) => {
  const tytul = escapeHtml(activity.title);
  const zdjecie = safeImageUrl(activity.imageUrl);
  const obrazek = zdjecie
    ? `<img src="${zdjecie}"${popupSrcSetAttrs(activity.imageUrl)} alt="${tytul}" loading="lazy" onerror="if(this.srcset){this.srcset='';this.sizes='';}else{this.style.display='none';}" style="width:100%;height:120px;object-fit:cover;border-radius:8px 8px 0 0;" />`
    : "";
  return `
    <div style="position:relative;width:220px;">
    ${favButtonMarkup(isFav)}
    <a href="/atrakcje/${escapeHtml(activity.slug)}" style="text-decoration:none;color:inherit;display:block;width:220px;">
      ${obrazek}
      <div style="padding:8px 10px;">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:#1a1a1a;">${tytul}</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:12px;color:#666;">
          <span style="color:#f59e0b;">★</span> ${escapeHtml(formatRatingPl(activity.rating))}
          <span style="margin-left:4px;">${escapeHtml(activity.ageRange)}</span>
        </div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${escapeHtml(activity.location)}</div>
      </div>
    </a>
    </div>
  `;
};

// W-I-02: odmiana po polsku — 2-4 (poza 12-14) to „atrakcje", reszta „atrakcji".
const odmianaAtrakcji = (ile: number): string => {
  const reszta10 = ile % 10;
  const reszta100 = ile % 100;
  const mnoga = reszta10 >= 2 && reszta10 <= 4 && (reszta100 < 12 || reszta100 > 14);
  return mnoga ? "atrakcje" : "atrakcji";
};

// Cluster icon creator
const createClusterIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 50 ? 44 : 48;
  const ikona = L.divIcon({
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

  // W-I-02: Leaflet daje klastrowi role="button" i tabindex="0", a nazwa dostepna
  // brala sie z samej tresci — czytnik czytal „12, przycisk". Atrybut musi siedziec
  // na ZEWNETRZNYM elemencie markera, wiec nie da sie go wpisac w `html`.
  // Nie uzywamy tez `cluster.once("add")`: markercluster przy zmianie licznika wola
  // `setIcon(this)` i buduje element od nowa BEZ zdarzenia „add" — etykieta by wtedy
  // znikala. Opakowanie `createIcon` trafia w kazdy element, ktory Leaflet utworzy.
  const etykieta = `Grupa ${count} ${odmianaAtrakcji(count)} — kliknij, aby przybliżyć`;
  const zrobIkone = ikona.createIcon.bind(ikona);
  ikona.createIcon = (stara?: HTMLElement) => {
    const el = zrobIkone(stara);
    el.setAttribute("aria-label", etykieta);
    return el;
  };
  return ikona;
};

// W-I-07: dymek dostaje fokus tylko przy otwarciu Z INICJATYWY UZYTKOWNIKA
// (klik/Enter na markerze). Otwarcia programowe — odtworzenie dymku po
// przebudowie grupy i przelot z listy — musza fokus zostawic tam, gdzie jest,
// inaczej mapa wyrywalaby go uzytkownikowi z listy albo z filtrow.
// Leaflet odpala `popupopen` synchronicznie w `openPopup()`, wiec flaga modulowa
// wystarczy (Popup.onAdd -> map.fire('popupopen'), leaflet 1.9.4).
let otwarcieProgramowe = false;
// Fokus uznajemy za zgubiony, gdy wisi na <body> albo w dymku, ktory wlasnie
// znika (przy `fadeAnimation` kontener zyje jeszcze ~200 ms po zamknieciu).
const fokusZgubiony = () => {
  const a = document.activeElement as HTMLElement | null;
  return !a || a === document.body || !!a.closest(".leaflet-popup");
};
const otworzDymekBezFokusu = (marker: L.Marker) => {
  otwarcieProgramowe = true;
  try {
    marker.openPopup();
  } finally {
    otwarcieProgramowe = false;
  }
};

/** FMN-B08: pola, z ktorych zbudowany jest marker (pozycja, ikona, nazwa, link). Inny podpis = marker do wymiany. */
const podpisPinu = (a: Activity): string =>
  `${a.latitude}|${a.longitude}|${a.rating}|${a.type}|${a.slug}|${a.title}`;

// Manages clustered markers on the map
function ClusteredMarkers({
  activities,
  onMarkerClick,
  markersRef,
  highlightedId,
  onMapClick,
  isFavorite,
  toggleFavorite,
}: {
  activities: Activity[];
  onMarkerClick: (id: number) => void;
  markersRef: React.MutableRefObject<Record<number, L.Marker>>;
  highlightedId: number | null;
  onMapClick: () => void;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number, slug?: string) => Promise<boolean>;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const activityMapRef = useRef<Record<number, Activity>>({});
  // Ktory dymek jest otwarty i czy wlasnie wymieniamy jego marker.
  const otwartyIdRef = useRef<number | null>(null);
  const przebudowaRef = useRef(false);
  // W-I-07: czy fokus czeka na oddanie do dymku odtworzonego po wymianie markera.
  const fokusDoOdtworzeniaRef = useRef(false);

  // FMN-B08: markery zyja dluzej niz jeden render, wiec wywolania i stan ikony
  // czytaja przez refy. Zmiana tozsamosci `isFavorite` (kazdy zapis ulubionego)
  // nie moze juz przebudowywac markerow — ikony poprawia efekt nizej.
  const onMarkerClickRef = useRef(onMarkerClick);
  const isFavoriteRef = useRef(isFavorite);
  const toggleFavoriteRef = useRef(toggleFavorite);
  const highlightedIdRef = useRef(highlightedId);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    isFavoriteRef.current = isFavorite;
    toggleFavoriteRef.current = toggleFavorite;
    highlightedIdRef.current = highlightedId;
  });

  // Jedna grupa klastrow na zycie mapy.
  useEffect(() => {
    const group = L.markerClusterGroup({
      disableClusteringAtZoom: 12,
      maxClusterRadius: 60,
      iconCreateFunction: createClusterIcon,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      animate: true,
    });
    map.addLayer(group);
    clusterGroupRef.current = group;
    return () => {
      map.removeLayer(group);
      clusterGroupRef.current = null;
      markersRef.current = {};
      activityMapRef.current = {};
      otwartyIdRef.current = null;
    };
  }, [map, markersRef]);

  // FMN-B08: markery DIFFUJEMY po id: dokladamy nowe, zdejmujemy znikajace,
  // reszty nie ruszamy. Wczesniej KAZDA nowa tablica `activities` (ViewportFilter
  // oddaje nowa przy kazdym przeliczeniu kadru, nawet z tym samym zbiorem) zdejmowala
  // cala grupe i skladala ja od nowa: jedna akcja (zoom, chip, filtr, "wstecz")
  // wymieniala wszystkie piny 2-5 razy (zmierzone 24.09, smoke FMN-0 I11).
  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group) return;

    const nowe = new Map<number, Activity>();
    for (const a of activities) nowe.set(a.id, a);

    const doUsuniecia: L.Marker[] = [];
    const doDodania: L.Marker[] = [];
    for (const [idStr, marker] of Object.entries(markersRef.current)) {
      const id = Number(idStr);
      const nowa = nowe.get(id);
      const stara = activityMapRef.current[id];
      if (nowa && stara && podpisPinu(nowa) === podpisPinu(stara)) {
        // Ten sam pin, moze pelniejszy rekord (np. katalog zamiast krotki z RPC).
        activityMapRef.current[id] = nowa;
        nowe.delete(id);
        continue;
      }
      // Pin zniknal albo zmienil pozycje/wyglad -> marker do zdjecia (i ewentualnie na nowo).
      doUsuniecia.push(marker);
      delete markersRef.current[id];
      delete activityMapRef.current[id];
    }
    nowe.forEach((activity) => doDodania.push(zbudujMarker(activity)));
    if (doUsuniecia.length === 0 && doDodania.length === 0) return;

    // Dymek przezywa wymiane swojego markera (ten sam pin, inny rekord): zamkniecie
    // w trakcie removeLayers nie kasuje pamieci o otwartym dymku, a po dodaniu
    // nowego markera otwieramy go ponownie.
    const doOtwarcia = otwartyIdRef.current;
    przebudowaRef.current = true;
    try {
      if (doUsuniecia.length > 0) group.removeLayers(doUsuniecia);
    } finally {
      przebudowaRef.current = false;
    }
    if (doDodania.length > 0) group.addLayers(doDodania);

    const marker = doOtwarcia !== null ? markersRef.current[doOtwarcia] : undefined;
    if (doOtwarcia !== null && !marker?.isPopupOpen()) {
      // W-I-07: fokus wraca do dymku tylko wtedy, gdy wymiana go osierocila.
      const oddajFokus = fokusDoOdtworzeniaRef.current && fokusZgubiony();
      fokusDoOdtworzeniaRef.current = false;
      // Gdy pin zniknal albo wpadl do klastra, jego dymek nie ma sie gdzie pokazac.
      // autoPan wylaczamy na czas otwarcia, bo przesuniecie mapy to kolejne przeliczenie kadru.
      if (marker && group.getVisibleParent(marker) === marker) {
        const popup = marker.getPopup();
        const autoPan = popup?.options.autoPan;
        if (popup) popup.options.autoPan = false;
        if (oddajFokus) marker.openPopup();
        else otworzDymekBezFokusu(marker);
        if (popup) popup.options.autoPan = autoPan;
      } else {
        otwartyIdRef.current = null;
      }
    }

    function zbudujMarker(activity: Activity): L.Marker {
      const id = activity.id;
      const podswietlony = highlightedIdRef.current;
      const marker = L.marker([activity.latitude, activity.longitude], {
        icon: createPinIcon(
          activity.rating,
          activity.type,
          podswietlony === id,
          podswietlony !== null && podswietlony !== id,
          isFavoriteRef.current(id),
        ),
        title: activity.title,
        alt: activity.title,
        keyboard: true,
      });
      if (podswietlony === id) marker.setZIndexOffset(1000);

      // K-06: tresc dymku budujemy LENIWIE (Leaflet przyjmuje funkcje), wiec przy
      // kazdym otwarciu bierze aktualny stan cache szczegolow. Wersja z gotowym
      // stringiem lepila dymek raz, przy tworzeniu markera — gdy szczegoly (zdjecie)
      // doszly pozniej, dymek do konca zycia pokazywal placeholder.svg.
      const trescDymku = () =>
        createPopupContent(mergePinDetails(activityMapRef.current[id] ?? activity), isFavoriteRef.current(id));
      marker.bindPopup(trescDymku, {
        maxWidth: 240,
        className: "custom-map-popup",
        closeButton: true,
      });

      // [title] to tresc wylacznie dla myszy — czytnik ekranu i klawiatura
      // potrzebuja nazwy dostepnej na tym samym elemencie (K-17). Element ikony
      // powstaje dopiero przy dodaniu do mapy (klastrowanie tworzy go na nowo).
      marker.on("add", () => {
        marker.getElement()?.setAttribute("aria-label", activity.title);
      });

      marker.on("click", () => onMarkerClickRef.current(id));
      // W-I-07: czy to MY przenieslismy fokus do tego dymku. Zmienna zyje tyle,
      // co marker, a ten jest wymieniany razem z dymkiem.
      let fokusWDymku = false;
      // Zamkniecie w trakcie wymiany markera nie liczy sie jako decyzja
      // uzytkownika — inaczej skasowaloby pamiec o otwartym dymku.
      marker.on("popupclose", () => {
        if (!przebudowaRef.current) otwartyIdRef.current = null;
        if (!fokusWDymku) return;
        fokusWDymku = false;
        // Wymiana usuwa marker razem z dymkiem — fokus odda dopiero dymek
        // odtworzony na nowym markerze.
        if (przebudowaRef.current) {
          fokusDoOdtworzeniaRef.current = true;
          return;
        }
        // W-I-07: fokus wraca na marker, ktory dymek otworzyl (wzorzec dialogu).
        // Przy `fadeAnimation` kontener dymku zyje jeszcze ~200 ms z fokusem w
        // srodku, bez niej fokus jest juz na <body> — obsługujemy oba przypadki.
        if (fokusZgubiony()) marker.getElement()?.focus({ preventScroll: true });
      });
      marker.on("popupopen", (e: L.PopupEvent) => {
        otwartyIdRef.current = id;
        const popup = e.popup;
        // W-I-07: dymek zachowuje sie jak dialog, ale nie mial ani roli, ani
        // nazwy, ani fokusu — po Enterze na markerze `document.activeElement`
        // zostawal NA MARKERZE i czytnik ekranu nie oglaszal niczego.
        // `aria-modal` swiadomie pomijamy: mapa pod spodem dziala dalej.
        const dymek = popup.getElement();
        if (dymek) {
          dymek.setAttribute("role", "dialog");
          dymek.setAttribute("aria-label", `Szczegóły atrakcji: ${activity.title}`);
          dymek.setAttribute("tabindex", "-1");
        }
        // Podpiecie kontrolek dymku — wolane tez po kazdej podmianie tresci,
        // bo podmiana innerHTML kasuje wczesniejsze handlery.
        const podepnij = () => {
          const el = popup.getElement();
          // K-05: domyslny przycisk Leafleta ma aria-label="Close popup" (po angielsku).
          const zamknij = el?.querySelector<HTMLElement>(".leaflet-popup-close-button");
          if (zamknij) {
            zamknij.setAttribute("aria-label", "Zamknij dymek");
            zamknij.setAttribute("title", "Zamknij dymek");
          }
          const btn = el?.querySelector<HTMLButtonElement>("[data-fav-toggle]");
          if (!btn) return;
          btn.onclick = async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const mialFokus = document.activeElement === btn;
            const next = await toggleFavoriteRef.current(id, activity.slug);
            btn.outerHTML = favButtonMarkup(next);
            podepnij();
            // W-I-07: podmiana `outerHTML` niszczy element z fokusem. Bez tego
            // Enter na sercu wyrzucal klawiature na <body>, a nasluch Escape
            // siedzi na kontenerze mapy — dymku nie dalo sie juz zamknac.
            // Dwa warunki konieczne. `marker.isPopupOpen()` — w trakcie zapisu
            // marker mogl zniknac z mapy (np. odznaczenie przy „Ulubionych"):
            // ten `popup` jest wtedy nieaktualny, a fokus na oderwanym
            // elemencie ZRZUCA fokus na <body> (tak gubil sie po naprawie).
            // `fokusZgubiony()` — gosciowi zapis otwiera modal „Zapisz to miejsce
            // na pozniej", ktory przejmuje fokus; nie wolno go sciagac z powrotem.
            const noweSerce = popup.getElement()?.querySelector<HTMLElement>("[data-fav-toggle]");
            if (mialFokus && marker.isPopupOpen() && noweSerce?.isConnected && fokusZgubiony()) {
              noweSerce.focus({ preventScroll: true });
            }
          };
        };
        podepnij();
        // Fokus ladujemy na KONTENERZE dymku, nie na pierwszym przycisku: kontener
        // przezywa `popup.update()` (dociaganie zdjecia), a czytnik odczytuje cala
        // tresc dymku zamiast samego „Dodaj do ulubionych”.
        if (dymek && !otwarcieProgramowe) {
          dymek.focus({ preventScroll: true });
          fokusWDymku = true;
        }
        // Piny z rpc('get_map_pins') nie maja zdjecia ani miejscowosci — jesli
        // szczegolow nie ma w cache, dociagamy je dla TEGO pinu i odswiezamy dymek.
        if (!getCachedPinDetails(activity.slug)) {
          void fetchPinDetails([activity.slug])
            .then(() => {
              if (!marker.isPopupOpen()) return;
              const el = popup.getElement();
              const fokusWSrodku = !!el && el.contains(document.activeElement);
              popup.update();
              podepnij();
              // W-I-07: `update()` podmienia innerHTML tresci. Jesli fokus siedzial
              // w srodku, wraca na kontener dymku, a nie na <body>.
              if (fokusWSrodku && el && !el.contains(document.activeElement)) {
                el.focus({ preventScroll: true });
              }
            })
            .catch(() => {
              /* zostaje wersja bez zdjęcia */
            });
        }
      });
      markersRef.current[id] = marker;
      activityMapRef.current[id] = activity;
      return marker;
    }
    // `map` w zaleznosciach: nowa mapa = nowa, pusta grupa, ktora trzeba zapelnic.
  }, [activities, map, markersRef]);

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

  // K-05 pkt 3: Escape na markerze NIE zamykal dymku. Leaflet ma
  // `closeOnEscapeKey`, ale nasluchuje zdarzenia 'keydown' na MAPIE, a gdy fokus
  // siedzi na markerze, Leaflet kieruje zdarzenie do warstwy (markera) i mapa go
  // nie widzi. Jeden nasluch w fazie przechwytywania na kontenerze zalatwia
  // oba przypadki (fokus na markerze i fokus w dymku).
  useEffect(() => {
    const kontener = map.getContainer();
    const naKlawisz = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      if (!kontener.querySelector(".leaflet-popup")) return;
      const zrodlo = (e.target as HTMLElement | null)?.closest(".leaflet-popup");
      map.closePopup();
      // W-I-07: fokus siedzi teraz W dymku, a handler `popupclose` oddaje go
      // markerowi, ktory ten dymek otworzyl. Kontener mapy zostaje FALLBACKIEM na
      // wypadek, gdy fokus nie trafil na marker (np. dymek otwarty programowo, a
      // uzytkownik wszedl do niego Tabem) — inaczej wpadlby na <body>.
      if (zrodlo && fokusZgubiony()) kontener.focus({ preventScroll: true });
      e.stopPropagation();
    };
    kontener.addEventListener("keydown", naKlawisz, true);
    return () => { kontener.removeEventListener("keydown", naKlawisz, true); };
  }, [map]);

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
  onViewportSave,
  onBoundsChange,
}: {
  activities: Activity[];
  onVisibleChange: (visible: Activity[]) => void;
  onCenterChange?: (center: [number, number]) => void;
  onViewportSave?: () => void;
  /** F-17: kadry do pobrania pinów z bazy. Pierwsze zgłoszenie natychmiast,
      kolejne z debounce — przeciąganie myszą ma dać JEDNO zapytanie. */
  onBoundsChange?: (kadry: KadryMapy) => void;
}) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const kadrTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const filterByBounds = useCallback(() => {
    const bounds = map.getBounds();
    const visible = activities.filter((a) =>
      bounds.contains([a.latitude, a.longitude])
    );
    onVisibleChange(visible);
    const c = map.getCenter();
    onCenterChange?.([c.lat, c.lng]);
  }, [map, activities, onVisibleChange, onCenterChange]);

  // Zapis kadru do URL — NATYCHMIAST przy moveend/zoomend (bez debounce),
  // z odczytem getCenter()/getZoom() w momencie zapisu. Debounce 400 ms
  // poniżej dotyczy wyłącznie przeliczania listy widocznych pinów.
  const reportViewport = useCallback(() => {
    onViewportSave?.();
  }, [onViewportSave]);

  const reportBounds = useCallback(() => {
    if (!onBoundsChange) return;
    onBoundsChange(kadryMapy(map.getBounds()));
  }, [map, onBoundsChange]);

  // Pierwsze przeliczenie: natychmiast po gotowości mapy ORAZ po każdej zmianie
  // zbioru atrakcji (piny z RPC dochodzą asynchronicznie). Bez tego licznik
  // pokazywał cały katalog do pierwszego moveend/zoomend.
  // Wywolania trzymamy w refach. `reportViewport` zmienia tozsamosc po KAZDYM
  // zapisie adresu (setSearchParams z react-routera zalezy od searchParams),
  // wiec z lista [map, filterByBounds, reportViewport, reportBounds] ten efekt
  // startowal od nowa po kazdym zapisie i 100 ms pozniej zapisywal znowu --
  // samopodtrzymujaca sie petla ~10 Hz, ktora przemielala cala strone: pasek
  // filtrow migotal, dropdown "Kategoria" nie dawal sie kliknac, a piny
  // przebudowywaly sie w kolko (klastry <-> pojedyncze znaczniki).
  // Efekt ma sie wykonac raz na mape i po kazdej zmianie zbioru pinow.
  const filterByBoundsRef = useRef(filterByBounds);
  const reportViewportRef = useRef(reportViewport);
  const reportBoundsRef = useRef(reportBounds);
  useEffect(() => {
    filterByBoundsRef.current = filterByBounds;
    reportViewportRef.current = reportViewport;
    reportBoundsRef.current = reportBounds;
  });

  useEffect(() => {
    map.whenReady(() => {
      filterByBoundsRef.current();
      // Kadr startowy bez debounce -- inaczej mapa stoi pusta o 300 ms dluzej.
      reportBoundsRef.current();
    });
    // fitBounds/invalidateSize moga jeszcze zmienic kadr -- przelicz ponownie
    const t = setTimeout(() => {
      filterByBoundsRef.current();
      reportViewportRef.current();
      reportBoundsRef.current();
    }, 100);
    return () => clearTimeout(t);
  }, [map, activities]);


  useMapEvents({
    moveend: () => {
      reportViewport();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(filterByBounds, 200);
      clearTimeout(kadrTimerRef.current);
      kadrTimerRef.current = setTimeout(reportBounds, DEBOUNCE_KADRU_MS);
    },
    zoomend: () => {
      reportViewport();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(filterByBounds, 200);
      clearTimeout(kadrTimerRef.current);
      kadrTimerRef.current = setTimeout(reportBounds, DEBOUNCE_KADRU_MS);
    },
  });

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(kadrTimerRef.current);
    };
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
      setTimeout(() => otworzDymekBezFokusu(marker), 400);
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

/** Prywatne pole Leafleta 1.9.4 (Map.js): true od startu animacji zoomu do _onZoomTransitionEnd. */
type MapaZAnimacjaZoomu = L.Map & { _animatingZoom?: boolean };

// FMN-B04: "wstecz" w trakcie animacji zoomu (np. fitBounds zaraz po wejsciu na
// mape regionu) sypal TypeError "Cannot read properties of undefined (reading
// '_leaflet_pos')". Leaflet 1.9.4 konczy animacje zoomu timerem
// setTimeout(_onZoomTransitionEnd, 250) (Map.js:1714), ktorego map.remove() NIE
// kasuje. Timer odpalal na zniszczonej mapie: _onZoomTransitionEnd sprawdza
// _mapPane tylko przy zdjeciu klasy, a potem wola _move() -> getPosition(undefined).
// Zdejmujemy flage _animatingZoom, zanim react-leaflet zniszczy mape: cleanup
// useLayoutEffect wykonuje sie w fazie mutacji, a remove() siedzi w cleanupie
// useEffect <MapContainer>. Spozniony timer konczy sie wtedy na pierwszym
// warunku `if (!this._animatingZoom) return`. Latki na L.Map.prototype nie
// robimy celowo: dotyczylaby kazdej mapy w aplikacji, nie tylko tej.
function ZatrzymajAnimacjeZoomu() {
  const map = useMap();
  useLayoutEffect(
    () => () => {
      (map as MapaZAnimacjaZoomu)._animatingZoom = false;
    },
    [map],
  );
  return null;
}

/** Parametry adresu, ktore NIE sa filtrem: pisze je sama mapa (`fav` = „Ulubione", `cats` = stare linki), przelacznik widoku albo paginacja listy. */
const PARAMY_POZA_FILTREM = ["view", "lat", "lng", "zoom", "fav", "cats", "page"];

/** Filtry z adresu w stalej kolejnosci, np. "age=0-2&region=mazowieckie". */
function kluczFiltrowZAdresu(search: string): string {
  const params = new URLSearchParams(search);
  PARAMY_POZA_FILTREM.forEach((k) => params.delete(k));
  params.sort();
  return params.toString();
}

/** Kadr, do ktorego dopasowalibysmy mape. Ten sam podpis = ta sama docelowa ramka. */
function podpisKadru(activities: Activity[]): string {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const a of activities) {
    minLat = Math.min(minLat, a.latitude);
    maxLat = Math.max(maxLat, a.latitude);
    minLng = Math.min(minLng, a.longitude);
    maxLng = Math.max(maxLng, a.longitude);
  }
  return [minLat, maxLat, minLng, maxLng].map((v) => v.toFixed(5)).join(",");
}

/**
 * Mapa DOKLADNIE na kadr z adresu. `reset: true` (Map.js, setView) idzie wprost do
 * _resetView: bez niego, przy tym samym zoomie, Leaflet przesuwa mape przez panBy
 * o offset obciety do calych pikseli, srodek odjezdza o ulamek piksela, a
 * ViewportFilter zapisuje go do adresu (zmierzone 24.09: lat 52.22913 -> 52.22780
 * przy zoom 7, I4 w SMOKE-02). W trakcie animacji zoomu Leaflet po cichu ignoruje
 * setView (`_tryAnimatedZoom`: `if (this._animatingZoom) return true`), wiec wtedy
 * ustawiamy kadr dopiero po jej koncu.
 */
function przywrocKadr(map: L.Map, stan: SavedMapState) {
  const ustaw = () => {
    const c = map.getCenter();
    const tenSam =
      c.lat.toFixed(5) === stan.center[0].toFixed(5) &&
      c.lng.toFixed(5) === stan.center[1].toFixed(5) &&
      Math.round(map.getZoom()) === Math.round(stan.zoom);
    // `reset` jest w dokumentacji Leafleta, ale nie w @types/leaflet (ZoomPanOptions).
    if (!tenSam) map.setView(stan.center, stan.zoom, { reset: true } as L.ZoomPanOptions);
  };
  if ((map as MapaZAnimacjaZoomu)._animatingZoom) map.once("zoomend", ustaw);
  else ustaw();
}

// FMN-B04: kadr idzie za pinami TYLKO po zmianie filtra przez uzytkownika.
// Wczesniej fitBounds szedl po KAZDEJ nowej tablicy `activities`, a kadr z adresu
// mapa czytala wylacznie przy montazu. "Wstecz" do wpisu z lat/lng/zoom zmienial
// filtr -> nowa tablica pinow -> fitBounds, wiec mapa ladowala w innym kadrze niz
// zapisany we wpisie (zmierzone 24.09: zoom 11 -> 7, SMOKE-02). Zasady:
//  - wejscie z adresu z lat/lng/zoom (link, F5, "wstecz" z karty) = kadr z adresu;
//  - "wstecz"/"naprzod" przy zamontowanej mapie = kadr z adresu tego wpisu;
//  - zmiana filtra w adresie (push/replace, tez chip kategorii) albo „Ulubione"
//    i fraza na mapie = dopasuj do pinow;
//  - nowa tablica pinow z ta sama ramka (np. doladowane ulubione) = nic.
// `aktywny=false` (tryb kadrowy F-17) wylacza samo dopasowanie; przywracanie kadru
// z adresu dziala dalej. Komponent montuje sie razem z mapa, a nie z pierwszym
// filtrem: montowany dopiero z filtrem widzial lat/lng zapisane chwile wczesniej
// przez tryb kadrowy, bral to za "wejscie z adresu" i gubil dopasowanie do regionu.
function MapFitBounds({
  activities,
  aktywny,
  savedMapState,
  zadanieDopasowania,
}: {
  activities: Activity[];
  aktywny: boolean;
  savedMapState?: SavedMapState | null;
  /** Licznik akcji uzytkownika na samej mapie („Ulubione", fraza) — kazda zmiana = dopasuj kadr. */
  zadanieDopasowania: number;
}) {
  const map = useMap();
  const { search } = useLocation();
  const typNawigacji = useRealNavigationType();
  const kluczFiltrow = kluczFiltrowZAdresu(search);

  // "piny": kadr idzie za pinami. "adres": kadr nalezy do adresu, dopasowanie
  // czeka na najblizsza zmiane filtra przez uzytkownika.
  const trybRef = useRef<"piny" | "adres">(savedMapState ? "adres" : "piny");
  const poprzedniKluczRef = useRef(kluczFiltrow);
  const poprzednieZadanieRef = useRef(zadanieDopasowania);
  // Ramka ostatniego dopasowania. null = najblizsze piny dopasuj zawsze.
  const dopasowanaRamkaRef = useRef<string | null>(null);

  useEffect(() => {
    const zmianaNaMapie = zadanieDopasowania !== poprzednieZadanieRef.current;
    const zmianaFiltra = kluczFiltrow !== poprzedniKluczRef.current;
    poprzednieZadanieRef.current = zadanieDopasowania;
    poprzedniKluczRef.current = kluczFiltrow;
    if (!zmianaNaMapie && !zmianaFiltra) return;
    dopasowanaRamkaRef.current = null;
    // Filtry liczymy wprost z adresu (useActivityFilters), wiec "wstecz" zmienia
    // klucz w tym samym renderze, w ktorym typ nawigacji to jeszcze "POP".
    if (!zmianaNaMapie && typNawigacji === "POP" && savedMapState) {
      trybRef.current = "adres";
      przywrocKadr(map, savedMapState);
    } else {
      trybRef.current = "piny";
    }
  }, [kluczFiltrow, zadanieDopasowania, typNawigacji, savedMapState, map]);

  useEffect(() => {
    if (!aktywny || trybRef.current !== "piny" || activities.length === 0) return;
    const ramka = podpisKadru(activities);
    if (ramka === dopasowanaRamkaRef.current) return;

    const coords = activities.map((a) => [a.latitude, a.longitude] as [number, number]);
    // Check if all points are identical
    const allSame = coords.every((c) => c[0] === coords[0][0] && c[1] === coords[0][1]);

    const timeoutId = setTimeout(() => {
      dopasowanaRamkaRef.current = ramka;
      map.invalidateSize();
      if (activities.length === 1 || allSame) {
        map.setView(coords[0], 13, { animate: true });
      } else {
        map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], maxZoom: 14, animate: true });
      }
    }, 150);

    return () => clearTimeout(timeoutId);
    // kluczFiltrow i zadanieDopasowania: po przejsciu w tryb "piny" efekt ma ruszyc
    // takze wtedy, gdy tablica pinow zostala ta sama.
  }, [activities, aktywny, map, kluczFiltrow, zadanieDopasowania]);

  return null;
}

// Geolocation button
// K-05: renderowany POZA <MapContainer>, dlatego mapa idzie refem, nie useMap().
function LocateButton({
  bottomOffset,
  mapRef,
}: {
  bottomOffset?: string;
  mapRef: React.MutableRefObject<L.Map | null>;
}) {
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const pulseRef = useRef<L.CircleMarker | null>(null);

  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!map || denied || locating) return;
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
  }, [mapRef, denied, locating]);

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
      aria-label="Moja lokalizacja"
      title="Moja lokalizacja"
    >
      <LocateFixed className={cn("w-5 h-5", locating ? "animate-pulse text-primary" : "text-foreground")} />
    </button>
  );
}
/**
 * Kontrolki mapy (zoom + lokalizacja) w JEDNYM bloku, renderowanym w DOM
 * PRZED lista boczna. Wczesniej lezaly wewnatrz kontenera mapy, czyli za
 * cala lista — zeby przybliżyć mape klawiatura, trzeba bylo przejsc Tabem
 * przez 686 kafli (finding K-05). Sa pozycjonowane absolutnie, wiec
 * przeniesienie w DOM nie zmienia tego, gdzie sie rysuja.
 */
function MapControls({
  mapRef,
  locateBottomOffset,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
  locateBottomOffset?: string;
}) {
  return (
    <>
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
        <button
          type="button"
          aria-label="Przybliż mapę"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-9 h-9 rounded-md bg-background hover:bg-muted shadow-md border border-border flex items-center justify-center text-foreground text-xl font-semibold leading-none"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Oddal mapę"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-9 h-9 rounded-md bg-background hover:bg-muted shadow-md border border-border flex items-center justify-center text-foreground text-xl font-semibold leading-none"
        >
          −
        </button>
      </div>
      <LocateButton mapRef={mapRef} bottomOffset={locateBottomOffset} />
    </>
  );
}

// MapRefCapture — stores map instance for external use
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    // Domyslny prefiks atrybucji to link z [title] i bez nazwy dostepnej (K-17).
    map.attributionControl?.setPrefix("Leaflet");
  }, [map, mapRef]);
  return null;
}

// W-I-01: kontener mapy nie mial ani roli, ani nazwy — 1032x784 px bez zadnego
// punktu zaczepienia dla czytnika ekranu. Atrybuty ustawiamy imperatywnie, bo
// <MapContainer> z react-leaflet 4.2.1 przepuszcza do <div> WYLACZNIE className,
// id i style (MapContainer.js) — `role`/`aria-label` w JSX poszlyby do opcji
// Leafletu i przepadly. Rola „region" (nie „application"): „application" odbiera
// czytnikowi tryb przegladania, a mapa ma dzialac jak zwykly obszar strony.
function OpisMapy({ nazwa }: { nazwa: string }) {
  const map = useMap();
  useEffect(() => {
    const kontener = map.getContainer();
    kontener.setAttribute("role", "region");
    kontener.setAttribute("aria-label", nazwa);
  }, [map, nazwa]);
  return null;
}

export interface SavedMapState {
  center: [number, number];
  zoom: number;
  /** Chip „Ulubione" (`?fav=1`). Kategorie mapy to filtr `type` strony, nie stan mapy. */
  favoritesOnly: boolean;
}

interface MapViewProps {
  activities: Activity[];
  filters: Filters;
  onViewModeChange?: (mode: "grid" | "map", visibleActivities?: Activity[]) => void;
  savedMapState?: SavedMapState | null;
  onSaveMapState?: (state: SavedMapState) => void;
  /** Błąd pobrania pinów po stronie rodzica (gdy to on woła useMapPins). */
  pinsError?: Error | null;
  /** Ponowienie pobrania pinów rodzica — parą do `pinsError`. */
  onPinsRetry?: () => void;
  /** W-I-01: nazwa obszaru do etykiety mapy, zwykle H1 strony (np. „Atrakcje w Małopolsce"). */
  nazwaObszaru?: string;
  /**
   * FMN-B02: klik chipa kategorii = zmiana filtra `type` u rodzica (ten sam filtr
   * co „Kategoria" w pasku). Brak = kategoria zablokowana ścieżką (/kategoria/zoo):
   * pasek nie ma wtedy „Kategorii", więc mapa nie pokazuje chipów kategorii.
   */
  onCategoryToggle?: (category: string) => void;
  /** FMN-B01: rodzic wciąż dociąga `activities` (katalog albo piny regionu) — pusta lista to wtedy „wczytuję", nie „brak atrakcji". */
  wczytujeDane?: boolean;
}

const MapView = ({ activities, filters, onViewModeChange, savedMapState, onSaveMapState, pinsError, onPinsRetry, nazwaObszaru, onCategoryToggle, wczytujeDane }: MapViewProps) => {
  const isMobile = useIsMobile();
  // W-I-01: nazwa mapy idzie za H1 strony; na home (brak H1 obszaru) zostaje ogólna.
  const etykietaMapy = nazwaObszaru ? `Mapa: ${nazwaObszaru}` : "Mapa atrakcji dla dzieci";
  const { isFavorite, toggleFavorite } = useSavedActivities();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<Activity | null>(null);

  // Gdy żaden filtr katalogowy nie jest aktywny, piny bierzemy z jednego
  // wywołania rpc('get_map_pins') zamiast stronicować public_activities.
  const hasCatalogFilters = useMemo(
    () =>
      Object.entries(filters as Record<string, unknown>).some(([key, value]) => {
        if (key === "sort") return false;
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== "";
      }),
    [filters],
  );
  // F-17: gdy mapa sama pobiera piny, pobiera je TYLKO dla swojego kadru.
  // Kadr zna dopiero zamontowana mapa (ViewportFilter), więc do pierwszego
  // zgłoszenia nie odpalamy zapytania — inaczej poleciałby cały katalog.
  const [kadry, setKadry] = useState<KadryMapy | null>(null);
  const trybKadru = !hasCatalogFilters;
  const kadrKluczRef = useRef<string>("");
  const handleBoundsChange = useCallback((nowe: KadryMapy) => {
    // Ten sam kadr (do ~11 m) nie ma prawa wywołać ponownego renderu.
    const v = nowe.visible;
    const klucz = `${v.minLat.toFixed(4)},${v.maxLat.toFixed(4)},${v.minLng.toFixed(4)},${v.maxLng.toFixed(4)}`;
    if (klucz === kadrKluczRef.current) return;
    kadrKluczRef.current = klucz;
    setKadry(nowe);
  }, []);
  const zapytanieOPiny = useMemo(
    () => ({ bbox: kadry?.bbox ?? null, visible: kadry?.visible ?? null }),
    [kadry],
  );
  const {
    pins,
    loading: ownPinsLoading,
    error: ownPinsError,
    refetch: refetchOwnPins,
  } = useMapPins(trybKadru && kadry != null, zapytanieOPiny);
  // Awaria pinów przychodzi z dwóch stron: z własnego hooka (mapa bez filtrów
  // katalogu) albo od rodzica, który sam woła useMapPins (CategoryPage z filtrem
  // regionu/kategorii). Bez tej drugiej ścieżki mapa regionu przy 500/429 udawała
  // pustkę: 0 pinów, zero komunikatu (audyt: J-01 / A-11).
  const pinsFetchError = pinsError ?? (!hasCatalogFilters ? ownPinsError : null);
  const mapPinsFailed = pinsFetchError != null;
  const refetchPins = pinsError != null ? onPinsRetry : refetchOwnPins;
  const sourceActivities = hasCatalogFilters ? activities : pins;

  // FMN-B01: pusty zbiór w trakcie ładowania to NIE „brak atrakcji". Rodzic
  // dociąga katalog (home z filtrem, 2-6 s) albo piny regionu (CategoryPage),
  // a mapa bez filtrów czeka na piny pierwszego kadru. Wcześniej przez ten czas
  // pusty stan radził „oddal mapę lub przesuń" (rodzic psuł sobie widok albo
  // wracał do listy), a licznik ogłaszał „0 atrakcji w widoku".
  const daneWDrodze = hasCatalogFilters
    ? Boolean(wczytujeDane)
    : pins.length === 0 && ownPinsError == null && (kadry == null || ownPinsLoading);
  // Po dojściu danych lista kadru liczy się jeszcze chwilę (ViewportFilter +
  // wygaszanie 100 ms). „Wczytuję" zdejmujemy dopiero po pierwszym przeliczeniu
  // na PEŁNYM zbiorze — inaczej na 0,3-0,8 s wracały „0 atrakcji" i pusty stan.
  const daneWDrodzeRef = useRef(daneWDrodze);
  // Layout effect, nie zwykły: ref musi być świeży, zanim ViewportFilter
  // (efekt dziecka) przeliczy kadr w tym samym commicie.
  useLayoutEffect(() => {
    daneWDrodzeRef.current = daneWDrodze;
  });
  const [kadrNaDanych, setKadrNaDanych] = useState(!daneWDrodze);
  useEffect(() => {
    if (daneWDrodze) {
      setKadrNaDanych(false);
      return;
    }
    // Bezpiecznik: gdyby kadr nie przeliczył się sam, mapa nie wisi w „wczytuję".
    const t = setTimeout(() => setKadrNaDanych(true), 2000);
    return () => clearTimeout(t);
  }, [daneWDrodze]);
  const wczytuje = daneWDrodze || !kadrNaDanych;

  const [visibleActivities, setVisibleActivities] = useState<Activity[]>([]);
  const [fading, setFading] = useState(false);
  const [mobileSheetState, setMobileSheetState] = useState<"peek" | "half" | "full">("peek");
  // FMN-B02: chip kategorii jest aktywny <=> kategoria jest w `filters.type`.
  // Wczesniej chipy mialy wlasny zbior (w adresie ?cats=), nakladany na piny
  // juz przyciete do `type` warunkiem AND: chip „Zoo" przy type=plac-zabaw nie
  // dodawal zoo, a odklik „Place zabaw" dawal 0 pinow przy type=plac-zabaw
  // w adresie. Jedyny chip z wlasnym stanem to „Ulubione" — nie jest kategoria.
  const [tylkoUlubione, setTylkoUlubione] = useState(() => savedMapState?.favoritesOnly ?? false);
  // Klucz tekstowy, bo CategoryPage buduje `filters.type` na nowo przy kazdym renderze.
  const routeTypesKey = (filters.type ?? []).join(",");
  const selectedCategories = useMemo(() => {
    const s = new Set(routeTypesKey.split(",").filter(Boolean));
    if (tylkoUlubione) s.add(FAVORITES_CHIP_KEY);
    return s;
  }, [routeTypesKey, tylkoUlubione]);
  const [liveMapCenter, setLiveMapCenter] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const markersRef = useRef<Record<number, L.Marker>>({});
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Fallback musi być slugiem województwa (cityCenters ma klucze REGIONS, nie miast).
  // "warszawa" nie istnieje jako klucz → wcześniej center===undefined → crash na center.lat.
  const cityKey = filters.city || "mazowieckie";
  const center = cityCenters[cityKey] || cityCenters.mazowieckie || { lat: 52.2297, lng: 21.0122 };
  const mapCenter: [number, number] = savedMapState ? savedMapState.center : [center.lat, center.lng];
  const initialZoom = savedMapState ? savedMapState.zoom : 11;

  // Zapis stanu mapy (srodek, zoom, „Ulubione") w JEDNYM stabilnym callbacku.
  // Wartosci ida przez refy, dzieki czemu tozsamosc `zapiszStanMapy` NIGDY sie
  // nie zmienia. Wczesniej zarowno efekt "zapis przy unmoncie", jak i
  // handleViewportSave mialy w zaleznosciach [onSaveMapState, selectedCategories],
  // a onSaveMapState zmienia tozsamosc po kazdym zapisie adresu -- cleanup
  // efektu (ktory wykonuje sie przy KAZDEJ zmianie zaleznosci, nie tylko przy
  // unmoncie) zapisywal wtedy URL ponownie i napedzal petle.
  const onSaveMapStateRef = useRef(onSaveMapState);
  const tylkoUlubioneRef = useRef(tylkoUlubione);
  useEffect(() => {
    onSaveMapStateRef.current = onSaveMapState;
    tylkoUlubioneRef.current = tylkoUlubione;
  });

  const zapiszStanMapy = useCallback(() => {
    const map = mapInstanceRef.current;
    const zapisz = onSaveMapStateRef.current;
    if (!map || !zapisz) return;
    const c = map.getCenter();
    zapisz({
      center: [c.lat, c.lng],
      zoom: map.getZoom(),
      favoritesOnly: tylkoUlubioneRef.current,
    });
  }, []);

  // Zapis przy odmontowaniu -- zaleznosci MUSZA byc puste.
  useEffect(() => () => zapiszStanMapy(), [zapiszStanMapy]);

  // Chip „Ulubione" trzymamy w adresie (?fav=1), zeby "wstecz" i F5 go
  // odtworzyly. Robi to osobny efekt, a nie cleanup powyzszego: cleanup
  // odpalal sie takze przy zmianie tozsamosci callbacka, czyli po kazdym
  // zapisie URL-a. Kategorie zapisuje rodzic (filtr `type`), nie ten efekt.
  const pierwszySkladChipow = useRef(true);
  useEffect(() => {
    if (pierwszySkladChipow.current) {
      pierwszySkladChipow.current = false;
      return;
    }
    zapiszStanMapy();
  }, [tylkoUlubione, zapiszStanMapy]);

  // Live sync (center/zoom/chipsy) -- zapis przy KAZDYM moveend/zoomend,
  // wykonywany w ViewportFilter (ponizej) przez handleViewportSave.
  // Srodek i zoom sa odczytywane z map.getCenter()/getZoom() w momencie
  // zapisu -- wczesniejsza wersja szla przez stan Reacta ustawiany w
  // debounce 400 ms, wiec po przeciagnieciu mysza do URL trafiala wartosc
  // sprzed ostatniego moveend (albo zapis nie dochodzil wcale, gdy
  // nawigacja do karty wyprzedzila timer).
  const handleViewportSave = zapiszStanMapy;

  // Normalize for search
  const normalizeText = useCallback((text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), []);

  const searchNormalized = useMemo(() => normalizeText(searchQuery.trim()), [searchQuery, normalizeText]);

  // Kategorie przycina juz rodzic (`activities` / piny sa po filtrze `type`);
  // tu zostaja tylko „Ulubione" i fraza z pola mapy.
  const showFavoritesOnly = tylkoUlubione;

  const matchesSearch = useCallback((a: Activity) => {
    if (!searchNormalized) return true;
    return normalizeText(a.title).includes(searchNormalized) ||
      normalizeText(a.location).includes(searchNormalized) ||
      normalizeText(a.type).includes(searchNormalized);
  }, [searchNormalized, normalizeText]);

  const filteredActivities = useMemo(() => {
    let result = sourceActivities;
    if (showFavoritesOnly) {
      result = result.filter((a) => isFavorite(a.id));
    }
    if (searchNormalized) {
      result = result.filter(matchesSearch);
    }
    return result;
  }, [sourceActivities, showFavoritesOnly, isFavorite, searchNormalized, matchesSearch]);

  // FMN-B04: filtry, ktore zyja TYLKO w mapie („Ulubione", fraza w polu mapy), to
  // zmiana filtra przez uzytkownika -> MapFitBounds dopasowuje kadr. Chip kategorii
  // tego licznika nie potrzebuje: zmienia `type` w adresie (push), a to MapFitBounds
  // widzi sam.
  const [zadanieDopasowania, setZadanieDopasowania] = useState(0);

  // Klik chipa kategorii zmienia filtr `type` u rodzica (jeden wpis historii,
  // jak w pasku filtrow). „Ulubione" to lokalny stan mapy.
  const handleCategoryToggle = useCallback((category: string) => {
    if (category === FAVORITES_CHIP_KEY) {
      setTylkoUlubione((v) => !v);
      setZadanieDopasowania((n) => n + 1);
      return;
    }
    onCategoryToggle?.(category);
  }, [onCategoryToggle]);
  const pokazChipyKategorii = onCategoryToggle != null;

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setZadanieDopasowania((n) => n + 1);
  }, []);

  // Filtered visible activities (viewport + favorites + search)
  const displayedActivities = useMemo(() => {
    let result = visibleActivities;
    if (showFavoritesOnly) {
      result = result.filter((a) => isFavorite(a.id));
    }
    if (searchNormalized) {
      result = result.filter(matchesSearch);
    }
    return result;
  }, [visibleActivities, showFavoritesOnly, isFavorite, searchNormalized, matchesSearch]);

  // Uwaga: NIE zasilamy tu visibleActivities całym katalogiem. Jedynym źródłem
  // prawdy jest zbiór przefiltrowany przez kadr mapy (ViewportFilter), który
  // przelicza się także przy pierwszym renderze.


  // A-10: lista pod mapa pokazuje kafle porcjami. Wczesniej renderowala CALY
  // kadr (na home 4 907 linkow w DOM) i dociagala szczegoly dla wszystkich
  // pinow partiami po 60 — ~82 zapytania ≈ 1,1 MB na jedno otwarcie mapy.
  // Teraz szczegoly ida tylko za tym, co faktycznie widac na liscie.
  const [listLimit, setListLimit] = useState(PORCJA_LISTY);
  useEffect(() => {
    setListLimit(PORCJA_LISTY);
  }, [displayedActivities]);
  const kafleListy = useMergedPinDetails(displayedActivities, listLimit);
  const zostaloWLiscie = Math.max(0, displayedActivities.length - kafleListy.length);


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
    // FMN-B01: przeliczenie na zbiorze sprzed dojścia danych nie zdejmuje „wczytuję".
    const naDanych = !daneWDrodzeRef.current;
    setFading(true);
    // Brief fade transition
    setTimeout(() => {
      setVisibleActivities(visible);
      if (naDanych) setKadrNaDanych(true);
      setFading(false);
    }, 100);
  }, []);

  const handleShowAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // W trybie kadrowym `filteredActivities` to tylko to, co zdążyliśmy pobrać —
    // „wszystkie" musi więc znaczyć całą Polskę, a nie zbiór z ostatnich kadrów.
    if (trybKadru) {
      map.fitBounds(GRANICE_POLSKI, { padding: [20, 20] });
      return;
    }
    if (filteredActivities.length === 0) return;
    const bounds = L.latLngBounds(
      filteredActivities.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [filteredActivities, trybKadru]);

  if (isMobile) {
    // Adjust locate button offset based on sheet state
    const locateBottomOffset = mobileSheetState === "peek" ? "96px" : mobileSheetState === "half" ? "54%" : "92%";

    return (
      <div className="fixed inset-0 top-[56px] bottom-[64px] z-20 overflow-hidden">
        {/* K-05: kontrolki mapy w DOM PRZED mapa i lista */}
        <MapControls mapRef={mapInstanceRef} locateBottomOffset={locateBottomOffset} />
        <MapContainer
          center={mapCenter}
          zoom={initialZoom}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2t3k_1_1d73bd80eb2425214fc08f2f"
          />
          <MapInvalidateSize />
          <MapRefCapture mapRef={mapInstanceRef} />
          <OpisMapy nazwa={etykietaMapy} />
          <ZatrzymajAnimacjeZoomu />
          {/* F-17: w trybie kadrowym NIE dopasowujemy kadru do pinow (aktywny=false):
              kazda paczka pinow rozszerzalaby kadr -> nowe zapytanie -> kolejne piny
              (petla az do calej Polski). Kadr nalezy tu do uzytkownika; ucieczka
              z pustego obszaru jest pod przyciskiem „Pokaz wszystkie atrakcje".
              FMN-B04: komponent jest zawsze zamontowany, bo „wstecz" przywraca
              kadr z adresu takze w trybie kadrowym. */}
          <MapFitBounds
            activities={filteredActivities}
            aktywny={!trybKadru}
            savedMapState={savedMapState}
            zadanieDopasowania={zadanieDopasowania}
          />
          <ClusteredMarkers activities={displayedActivities} onMarkerClick={handleMarkerClick} markersRef={markersRef} highlightedId={highlightedId} onMapClick={handleMapClick} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />

          <ViewportFilter activities={filteredActivities} onVisibleChange={handleVisibleChange} onCenterChange={setLiveMapCenter} onViewportSave={handleViewportSave} onBoundsChange={trybKadru ? handleBoundsChange : undefined} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
        </MapContainer>

        {/* Back to list button (mobile) */}
        <button
          onClick={() => onViewModeChange?.("grid", displayedActivities)}
          className="absolute top-3 left-3 z-[1000] bg-background/95 hover:bg-background shadow-lg rounded-full px-3.5 py-2 flex items-center gap-2 border border-border text-sm font-medium cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
          {mapPinsFailed || wczytuje ? "Lista" : `Lista · ${displayedActivities.length}`}
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
          showCategoryChips={pokazChipyKategorii}
          mapCenter={liveMapCenter}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onShowAll={handleShowAll}
          error={pinsFetchError}
          onRetry={refetchPins}
          loading={wczytuje}
        />
      </div>
    );
  }

  // Desktop: sidebar left + map right
  return (
    <div className="flex relative" style={{ height: "calc(100vh - 64px - 52px)" }}>
      {/* K-05: kontrolki mapy w DOM PRZED lista boczna (Tab trafia w nie od razu) */}
      <MapControls mapRef={mapInstanceRef} />

      {/* Sidebar */}
      <div className="w-[320px] min-w-[320px] flex-shrink-0 border-r border-border bg-card overflow-y-auto">
        {mapPinsFailed ? (
          <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[300px] text-center px-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Nie udało się wczytać mapy
            </p>
            {refetchPins && (
              <button
                onClick={refetchPins}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-button hover:opacity-90 transition-opacity cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Spróbuj ponownie
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border space-y-2">
              {/* K-10: jedyna live region licznika — nakladka na mapie ma aria-hidden,
                  zeby czytnik nie ogłaszał tej samej liczby dwa razy. */}
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="text-sm text-muted-foreground font-medium"
              >
                {wczytuje ? "Wczytuję…" : `${displayedActivities.length} atrakcji w widoku`}
              </p>
              <MapCategoryChips selected={selectedCategories} onToggle={handleCategoryToggle} showCategories={pokazChipyKategorii} />
            </div>
            <div
              className={cn("p-3 space-y-3 transition-opacity duration-150", fading ? "opacity-50" : "opacity-100")}
            >
              {wczytuje ? (
                <div className="py-12 text-center px-4 flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Wczytuję atrakcje…</p>
                </div>
              ) : displayedActivities.length === 0 ? (
                /* Bez przycisku pusty stan był ślepą uliczką: kadr poza Polską
                   nie ma jak wrócić do pinów (audyt 400: K-21). */
                <div className="py-12 text-center px-4 flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Brak atrakcji w tym obszarze — oddal mapę lub przesuń
                  </p>
                  {filteredActivities.length > 0 && (
                    <button
                      onClick={handleShowAll}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-button hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" />
                      Pokaż wszystkie atrakcje
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {kafleListy.map((activity) => (
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
                  ))}
                  {zostaloWLiscie > 0 && (
                    <button
                      type="button"
                      onClick={() => setListLimit((n) => n + PORCJA_LISTY)}
                      className="w-full py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium text-foreground cursor-pointer"
                    >
                      Pokaż więcej ({zostaloWLiscie})
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={initialZoom}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2t3k_1_1d73bd80eb2425214fc08f2f"
          />
          <MapInvalidateSize />
          <MapRefCapture mapRef={mapInstanceRef} />
          <OpisMapy nazwa={etykietaMapy} />
          <ZatrzymajAnimacjeZoomu />
          {/* F-17: w trybie kadrowym NIE dopasowujemy kadru do pinow (aktywny=false):
              kazda paczka pinow rozszerzalaby kadr -> nowe zapytanie -> kolejne piny
              (petla az do calej Polski). Kadr nalezy tu do uzytkownika; ucieczka
              z pustego obszaru jest pod przyciskiem „Pokaz wszystkie atrakcje".
              FMN-B04: komponent jest zawsze zamontowany, bo „wstecz" przywraca
              kadr z adresu takze w trybie kadrowym. */}
          <MapFitBounds
            activities={filteredActivities}
            aktywny={!trybKadru}
            savedMapState={savedMapState}
            zadanieDopasowania={zadanieDopasowania}
          />
          <ClusteredMarkers activities={displayedActivities} onMarkerClick={handleMarkerClick} markersRef={markersRef} highlightedId={highlightedId} onMapClick={handleMapClick} isFavorite={isFavorite} toggleFavorite={toggleFavorite} />
          <ViewportFilter activities={filteredActivities} onVisibleChange={handleVisibleChange} onCenterChange={setLiveMapCenter} onViewportSave={handleViewportSave} onBoundsChange={trybKadru ? handleBoundsChange : undefined} />
          <FlyToHandler targetActivity={flyTarget} markersRef={markersRef} />
        </MapContainer>
        

        {/* Count label — duplikat wizualny licznika z listy (K-10: nie ogłaszamy dwa razy) */}
        <div
          aria-hidden="true"
          className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-sm font-medium text-foreground shadow-sm"
        >
          {mapPinsFailed
            ? "Nie udało się wczytać mapy"
            : wczytuje
              ? "Wczytuję atrakcje…"
              : `${displayedActivities.length} atrakcji w widoku`}
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
          srcSet={buildSrcSet(activity.imageUrl)}
          sizes="80px"
          alt={activity.title}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
          onError={(e) => {
            if (!fallbackToOriginal(e.currentTarget)) setImgError(true);
          }}
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
            {formatRatingPl(activity.rating)}
          </span>
          <span className="text-xs text-muted-foreground">{activity.ageRange}</span>
        </div>
      </div>
    </div>
  );
}


export default MapView;
