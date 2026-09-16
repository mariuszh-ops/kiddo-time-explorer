// JEDYNY klient Supabase w aplikacji — projekt katalogowy
// (public_activities, user_reviews, issue_reports, saved_activities, admins,
// rpc('is_admin'), rpc('admin_stats')). Autoryzacja i wszystkie zapytania
// przechodzą przez ten sam klient, dzięki czemu nagłówek Authorization: Bearer
// niesie token zalogowanego użytkownika (role:"authenticated").
// Klucz anon jest publiczny — może żyć w kodzie frontu.
import { createClient } from "@supabase/supabase-js";
import { displayLocation, formatAddress } from "@/lib/address";
import { reportInvalidSession } from "@/lib/sessionRecovery";

const CATALOG_URL = "https://zpqpgatnnbojgiejmtpt.supabase.co";
const CATALOG_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwcXBnYXRubmJvamdpZWptdHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTY2OTIsImV4cCI6MjA5MzE5MjY5Mn0.nHm-KdlT1r2VlXQRfXqRDCCisU4KEf9yPI96kIpx4tc";

export const CATALOG_AUTH_STORAGE_KEY = "sb-catalog-auth";

/**
 * I-01: wspólny komputer. `signOut()` sam kasuje klucze sesji, ale gdy żądanie
 * wylogowania padnie albo wyścignie się z odświeżaniem tokenu, klucz może
 * przeżyć — a wtedy kolejna osoba przy tej przeglądarce widzi cudze konto.
 * Kasujemy więc jawnie WSZYSTKIE klucze GoTrue tego klienta
 * (`sb-catalog-auth`, `-user`, `-code-verifier`, `-flows-code-verifier`).
 */
export function clearCatalogAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const doKasacji: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(CATALOG_AUTH_STORAGE_KEY)) doKasacji.push(key);
    }
    doKasacji.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // brak storage — nic do sprzątania
  }
}

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const headersOf = (input: RequestInfo | URL, init?: RequestInit): Headers => {
  const headers = new Headers(
    typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
  );
  if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  return headers;
};

const withAnonAuth = (headers: Headers): Headers => {
  headers.set("apikey", CATALOG_ANON_KEY);
  headers.set("Authorization", `Bearer ${CATALOG_ANON_KEY}`);
  return headers;
};

/* ------------------------------------------------------------------ *
 * X-H-01: rozjechany zegar urzadzenia = petla odswiezania tokenu.
 *
 * `exp` tokenu porownuje sie z zegarem KLIENTA. Gdy urzadzenie wyprzedza
 * serwer o wiecej niz TTL tokenu (zmierzone: expires_in = 3600 s),
 * supabase-js uznaje swiezo wydany token za wygasly i odswieza go — a nowy
 * token, liczony od PRAWDZIWEGO teraz, rodzi sie tak samo "przeterminowany".
 * Zmierzone 10.09.2026: zegar +2 h => 32 x POST /auth/v1/token w ~10 s,
 * ostatnie 429, potem 401 na /rest/v1/saved_activities, ZERO zapisow i ZERO
 * komunikatu. Kontrola +30 min (ponizej TTL) dziala bez zarzutu, wiec prog
 * lezy dokladnie na TTL tokenu.
 *
 * Dwie warstwy: (1) mierzymy odchylenie zegara, (2) przerywamy petle, zanim
 * zjemy limit GoTrue (100 zadan/h dzielone z rejestracjami i resetami hasla).
 * ------------------------------------------------------------------ */

/** Ostatnio zmierzone odchylenie: czas serwera - czas urzadzenia (ms).
 *  `null` = jeszcze nie zmierzono. Zyje tyle co karta — swiadomie NIE
 *  trzymamy tego w localStorage. */
let odchylenieZegaraMs: number | null = null;

/**
 * Odchylenie zegara urzadzenia wzgledem serwera w ms (dodatnie = urzadzenie
 * spoznione, ujemne = urzadzenie do przodu). `null`, dopoki zadna odpowiedz
 * nie dala sie odczytac.
 */
export function getClockSkewMs(): number | null {
  return odchylenieZegaraMs;
}

/**
 * Zapisz odchylenie na podstawie naglowka `Date`.
 *
 * UWAGA (sprawdzone curl-em 16.09.2026 na zywym projekcie): naglowek `Date`
 * jest czytelny z JS TYLKO na `/rest/v1/` — PostgREST wymienia go w
 * `Access-Control-Expose-Headers`. GoTrue (`/auth/v1/`) wystawia tam jedynie
 * `X-Total-Count, Link, X-Supabase-Api-Version`, wiec tam `get("Date")` odda
 * `null` mimo ze naglowek leci po sieci. Dlatego odchylenie bierzemy z ruchu
 * REST (a w ostatecznosci z sondy ponizej), nie z odpowiedzi odswiezania.
 *
 * Dokladnosc: naglowek ma rozdzielczosc 1 s, a czytamy go po dotarciu
 * odpowiedzi, wiec wynik jest obciazony o ~RTT. Przy progu 60 s bez znaczenia.
 */
function zapiszOdchylenieZegara(response: Response): void {
  try {
    const serwer = response.headers.get("Date");
    if (!serwer) return;
    const czasSerwera = new Date(serwer).getTime();
    if (!Number.isFinite(czasSerwera)) return;
    odchylenieZegaraMs = czasSerwera - Date.now();
  } catch {
    // naglowek nieczytelny (CORS / dziwna proxy) — zostajemy przy `null`
  }
}

/** Awaryjny pomiar, gdy petla wybuchla, zanim poszlo cokolwiek po REST.
 *  Jedno HEAD bez tresci — tylko po to, zeby odczytac `Date`. */
async function zmierzOdchylenieSonda(): Promise<void> {
  try {
    const odp = await fetch(`${CATALOG_URL}/rest/v1/public_activities?select=slug&limit=1`, {
      method: "HEAD",
      headers: { apikey: CATALOG_ANON_KEY, Authorization: `Bearer ${CATALOG_ANON_KEY}` },
    });
    zapiszOdchylenieZegara(odp);
  } catch {
    // brak sieci — trudno, pokazemy zwykly komunikat o wygasnieciu
  }
}

/** Powyzej tego odchylenia winimy zegar, a nie wygasniecie sesji. */
const PROG_ODCHYLENIA_MS = 60_000;
/** Ile odswiezen w oknie uznajemy jeszcze za normalne. */
const LIMIT_REFRESHY = 3;
const OKNO_REFRESHY_MS = 60_000;

/** Zegar odporny na skok systemowego czasu (uzytkownik poprawia date w trakcie). */
const monotonicznie = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

let znacznikiRefreshu: number[] = [];
let odpowiedziNaRefresh = 0;
let petlaPrzerwana = false;

const jestOdswiezeniemTokenu = (url: string): boolean =>
  url.includes("/auth/v1/token") && url.includes("grant_type=refresh_token");

/**
 * Zatrzymaj petle i powiedz uzytkownikowi, co sie stalo. Odpalane raz.
 * `stopAutoRefresh()` ubija tykacz auth-js; samo blokowanie zadan w
 * `catalogFetch` pilnuje sciezki wyzwalanej zapytaniami.
 */
async function przerwijPetleOdswiezania(): Promise<void> {
  try {
    await catalogClient.auth.stopAutoRefresh();
  } catch {
    // klient jeszcze sie nie zainicjalizowal — blokada zadan i tak dziala
  }
  if (odchylenieZegaraMs === null) await zmierzOdchylenieSonda();
  const odchylenie = odchylenieZegaraMs;
  reportInvalidSession(
    odchylenie !== null && Math.abs(odchylenie) > PROG_ODCHYLENIA_MS ? "zegar" : "token"
  );
}

/**
 * Fetch klienta katalogu:
 * - wszystkie zapytania przechodzą z bieżącym tokenem użytkownika;
 * - 401 / PGRST301 na zasobach → globalne zgłoszenie martwej sesji
 *   i ponowna próba jako anonim.
 */
const catalogFetch: typeof fetch = async (input, init) => {
  const url = urlOf(input);
  const isAuthEndpoint = url.includes("/auth/v1/");

  // X-H-01: zanim cokolwiek poleci na siec — policz odswiezenia w oknie 60 s.
  // Czwarte w oknie NIE wychodzi: przerywamy tu, zanim GoTrue odda 429.
  // Rzucamy TypeError, bo tak wyglada padnieta siec — auth-js klasyfikuje to
  // jako blad ponawialny i NIE wylogowuje po cichu przy okazji.
  //
  // WARUNEK `odpowiedziNaRefresh >= 1` nie jest ozdoba. `_callRefreshToken`
  // w auth-js ponawia probe przy bledzie SIECI, z narastajacym odstepem, przez
  // ok. 30 s — czyli kilka sekund bez zasiegu samo w sobie potrafi wygenerowac
  // 4+ prob w oknie. Petla zegarowa rozni sie od zerwanej sieci tym, ze serwer
  // ODPOWIADA (w pomiarze: 33 x 200, ostatnia 429). Blokujemy wiec dopiero
  // wtedy, gdy wiemy, ze druga strona zyje — inaczej karalibysmy chwilowy brak
  // zasiegu cichym wylogowaniem, czyli dokladnie ta wada, ktora naprawiamy.
  if (jestOdswiezeniemTokenu(url)) {
    const teraz = monotonicznie();
    znacznikiRefreshu = znacznikiRefreshu.filter((t) => teraz - t < OKNO_REFRESHY_MS);
    znacznikiRefreshu.push(teraz);
    if (znacznikiRefreshu.length > LIMIT_REFRESHY && odpowiedziNaRefresh >= 1) {
      if (!petlaPrzerwana) {
        petlaPrzerwana = true;
        void przerwijPetleOdswiezania();
      }
      throw new TypeError("Failed to fetch");
    }
  }

  const response = await fetch(input, init);
  zapiszOdchylenieZegara(response);
  if (jestOdswiezeniemTokenu(url)) odpowiedziNaRefresh += 1;
  if (response.status !== 401 || isAuthEndpoint) return response;

  let code = "";
  try {
    code = (await response.clone().json())?.code ?? "";
  } catch {
    code = "";
  }
  if (code && code !== "PGRST301" && code !== "PGRST303") return response;

  reportInvalidSession();

  const headers = headersOf(input, init);
  const auth = headers.get("Authorization");
  if (auth && auth !== `Bearer ${CATALOG_ANON_KEY}`) {
    return fetch(new Request(url, { ...init, headers: withAnonAuth(headers) }));
  }
  return response;
};

/**
 * W-D-01: `window.localStorage` to GETTER. Polityka MDM albo rozszerzenie
 * prywatnosci potrafi sprawic, ze sam odczyt rzuca `SecurityError` — a ten
 * odczyt stal wczesniej w wywolaniu `createClient` na poziomie MODULU, wiec
 * wyjatek leci przy imporcie, zanim React w ogole sie zamontuje. Skutek:
 * biala strona (sam shell z index.html), zero kafli, zero klikalnych
 * przyciskow — dla KAZDEGO, takze goscia, ktory o logowanie nie prosil.
 *
 * Dotykamy magazynu raz, w try/catch, i przy odmowie oddajemy `undefined`.
 * Wtedy auth-js sam wykrywa brak localStorage (`supportsLocalStorage()` jest
 * u niego opakowane w try/catch) i wklada `memoryLocalStorageAdapter` —
 * sesja zyje do zamkniecia karty, a katalog dziala bez zmian.
 */
const bezpiecznyMagazynSesji = ((): Storage | undefined => {
  try {
    if (typeof window === "undefined") return undefined;
    const magazyn = window.localStorage; // tu wlasnie leci SecurityError
    magazyn.getItem(CATALOG_AUTH_STORAGE_KEY); // i tu, gdy getter oddaje atrape
    return magazyn;
  } catch {
    return undefined; // sesja tylko w pamieci — gosc dziala normalnie
  }
})();

export const catalogClient = createClient(CATALOG_URL, CATALOG_ANON_KEY, {
  global: { fetch: catalogFetch },
  auth: {
    storage: bezpiecznyMagazynSesji,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: CATALOG_AUTH_STORAGE_KEY,
  },
});

// Alias — zachęcamy do używania nazwy `supabase` w nowym kodzie.
export const supabase = catalogClient;

// Lekka lista kolumn dla widoków listowych (kafle + filtry + sortowanie +
// wyszukiwarka + dystans). Świadomie pomija ciężkie pola strony detalu:
// reviews, experience_points, description, price_note, phone, website,
// opening_hours, address, confidence, good_for_children.
export const CARD_COLUMNS =
  "place_id,slug,name,type,region,city,lat,lng,rating,reviews_count," +
  "age_min,age_max,is_free,amenities,image_url,uncertain";

// Lista kolumn dla tabeli katalogu w /admin — suma tego, co renderuje
// CatalogTable, i tego, co edytuje AdminCatalogDrawer (drawer dostaje wiersz
// z tabeli, nie dociąga go osobno). Świadomie pomija dwa ciężkie jsonb-y:
// `reviews` (7,2 MB w tabeli, 73 kB na stronę 50 wierszy) i
// `experience_points` — admin ich nie pokazuje ani nie edytuje.
// M-16: `select("*")` na tej stronie kosztował 157 kB i ~290 ms; ta lista 69 kB.
export const ADMIN_COLUMNS =
  "place_id,slug,name,type,region,city,address,description,price_note," +
  "phone,website,opening_hours,image_url,lat,lng,amenities,rating," +
  "reviews_count,age_min,age_max,is_free,good_for_children,published," +
  "admin_hidden,featured,uncertain,locked_fields,reviewed_at";

/**
 * N-14 (decyzja wlasciciela 04.09.2026): przelacznik "Wyrozniona (featured)"
 * jest UKRYTY w /admin — na start i przez jakis czas po starcie nic nie ma byc
 * wyroznione. Kolumna `featured` ZOSTAJE w bazie, w typach i w ADMIN_COLUMNS:
 * powrot ma byc zdjeciem ukrycia (ta flaga na true), nie migracja.
 * Wyzwalacz rewizji: pierwszy partner handlowy do promocji — wtedy takze
 * "Polecane miejsca" (DiscoverSections.tsx) i odznaka na kaflu (ActivityCard.tsx).
 */
export const FEATURED_UI_ENABLED: boolean = false;

/**
 * Warunek `or=` dla filtra wieku [ageMin, ageMax] w zapytaniach PostgREST.
 *
 * Przedzialy przepuszczamy, gdy sie przecinaja (age_min <= ageMax && age_max >= ageMin).
 * Rekordy BEZ wieku (oba pola null) sa z filtra WYLACZONE — przechodza zawsze.
 * Bez tego 8 kart z nieznanym wiekiem (m.in. Energylandia) znikalo przy KAZDYM
 * ustawieniu filtra, bo null nie spelnia ani `.lte`, ani `.gte` (M-07, 04.09.2026).
 * Swiadomie nie wpisujemy im 0–99 do bazy: null znaczy „nie wiemy”, a 0–99 to
 * twierdzenie, ktorego nie mamy z czego wyprowadzic.
 *
 * Uzycie: `q.or(ageRangeOrFilter(ageMin, ageMax))` — supabase-js sam doklada nawiasy.
 * Kilka wywolan `.or()` na jednym zapytaniu PostgREST ANDuje (sprawdzone na zywo
 * 04.09: szukajka „park” 635 -> 633 ze starym filtrem, 635 z nowym).
 */
export function ageRangeOrFilter(ageMin: number, ageMax: number): string {
  return `and(age_min.lte.${ageMax},age_max.gte.${ageMin}),and(age_min.is.null,age_max.is.null)`;
}

// Wiersz z tabeli public_activities (patrz PROMPT).
export interface CatalogRow {
  place_id: string;
  slug: string;
  name: string;
  type: string;
  region: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviews_count: number | null;
  description: string | null;
  price_note: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  amenities: string[] | null;
  image_url: string | null;
  good_for_children: boolean | null;
  published: boolean | null;
  uncertain?: boolean | null;
  confidence?: "niska" | "srednia" | "wysoka" | null;
  reviews?: Array<{ author: string; rating: number; text: string; source?: "google" }> | null;
  age_min?: number | null;
  age_max?: number | null;
  is_free?: boolean | null;
  admin_hidden?: boolean | null;
  featured?: boolean | null;
  locked_fields?: string[] | null;
  /** Redakcyjny znacznik "karta sprawdzona" (ISO timestamptz). null = niesprawdzona.
   *  To NIE jest uzytkownikowe "bylem tam" — tamto liczy UserRatingsContext. */
  reviewed_at?: string | null;
  updated_at?: string | null;
  experience_points?: string[] | null;
}

import type { Activity } from "@/data/activities";

/** Fallback dla braku image_url. */
export const FALLBACK_IMAGE = "/placeholder.svg";

/**
 * Sformatuj przedział wieku do etykiety UI.
 * - null w którejkolwiek z granic → "" (brak badge)
 * - age_max === 16 → "{age_min}+" (np. "12+")
 * - inaczej → "{min}–{max} lata|lat"
 */
export function formatAgeRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null || max == null) return "";
  if (max === 16) return `${min}+`;
  const word = max >= 2 && max <= 4 ? "lata" : "lat";
  return `${min}–${max} ${word}`;
}

/** Zamień wiersz katalogu na kształt oczekiwany przez UI (Activity). */
export function mapCatalogRow(row: CatalogRow, index = 0): Activity {
  const rating = row.rating ?? 0;
  const reviewCount = row.reviews_count ?? 0;
  const ageMinRaw = row.age_min ?? null;
  const ageMaxRaw = row.age_max ?? null;
  return {
    // W UI id nadal bywa używane jako key/lookup — używamy stabilnego hasha
    // ze sluga, żeby dwa wywołania mapowały ten sam wiersz na to samo id.
    id: hashStringToInt(row.slug || row.place_id || String(index)),
    slug: row.slug,
    title: row.name,
    // location = miejscowość (miasto), city = slug województwa (nasz "region").
    // Gdy miasto jest puste, pokazujemy nazwę województwa („woj. podkarpackie”).
    location: displayLocation(row.city, row.region),
    city: row.region ?? row.city ?? "",
    rating,
    reviewCount,
    ageRange: formatAgeRange(ageMinRaw, ageMaxRaw),
    ageMin: ageMinRaw ?? 0,
    ageMax: ageMaxRaw ?? 18,
    hasAgeInfo: ageMinRaw != null && ageMaxRaw != null,
    matchPercentage: 0,
    imageUrl: row.image_url ?? FALLBACK_IMAGE,
    imageUrls: row.image_url ? [row.image_url] : [],
    tags: [],
    isIndoor: false,
    type: row.type,
    address: formatAddress(row.address, displayLocation(row.city, row.region)),
    openingHours: row.opening_hours ?? undefined,
    priceRange: row.price_note ?? undefined,
    website: row.website ?? undefined,
    latitude: row.lat ?? 0,
    longitude: row.lng ?? 0,
    amenities: row.amenities ?? [],
    description: row.description ?? undefined,
    phone: row.phone ?? undefined,
    priceNote: row.price_note ?? undefined,
    google_rating: rating,
    google_review_count: reviewCount,
    coordinates: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : undefined,
    uncertain: row.uncertain ?? false,
    confidence: row.confidence ?? null,
    place_id: row.place_id,
    isFree: row.is_free === true,
    experiencePoints: Array.isArray(row.experience_points)
      ? row.experience_points.map((p) => (typeof p === "string" ? p.trim() : "")).filter((p) => p.length > 0)
      : undefined,
    reviews: Array.isArray(row.reviews)
      ? row.reviews.map((r) => ({
          author: r.author,
          rating: r.rating,
          text: r.text,
          source: (r.source ?? "google") as "google",
        }))
      : undefined,
  };
}

// Deterministyczny hash string → 32-bit unsigned int (do stabilnego id).
function hashStringToInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}