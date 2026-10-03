import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  useSearchParams,
  type SetURLSearchParams,
} from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, type ReactNode } from "react";
import { useActivityFilters } from "@/hooks/useActivityFilters";
import { useMapUrlState, zoomDoAdresu } from "@/hooks/useMapUrlState";
import { filterOptions } from "@/data/activities";
import { CATEGORY_ORDER } from "@/data/categoryLabels";
import { REGION_SLUGS } from "@/data/regions";

/**
 * FMN-10 krok 1: strażnik CIĄGÓW akcji na filtrach i mapie.
 *
 * Testy z poprawek FMN-B* przypinają pojedyncze przypadki. Miganie z 18.09
 * (Q-E-10b, potem 9b6674d i 4f2abac) żyło w ciągu kliknięć: filtr, ruch mapy,
 * „wstecz”, znowu filtr. Tu automat losuje 200 ciągów po 15 akcji rodzica
 * (własny PRNG mulberry32, ten sam seed = ten sam ciąg) na `useActivityFilters`
 * + `useMapUrlState` w `MemoryRouter` i po KAŻDEJ akcji porównuje stan hooków
 * z prostym modelem historii przeglądarki (lista wpisów + indeks).
 *
 * Niezmienniki po każdej akcji:
 * - S1 adres = model (push/replace/brak zapisu jak w modelu, „wstecz”/„naprzód” po wpisach),
 * - S2 filtry hooka = filtry odczytane z adresu (jedno źródło prawdy),
 * - S3 pole frazy po przycięciu = ?search=, a po wpisaniu frazy pole = to, co wpisano,
 * - S4 widok i zapisany kadr mapy = adres,
 * - S5 akcja bez zmiany adresu = ten sam wpis historii (bez navigate),
 * - S6 zapis mapy bez zmian = 0 wywołań setSearchParams, zapis ze zmianą = 1 (replace),
 * - S7 limit renderów na akcję (wykrywacz pętli zapisów),
 * - S8 akcja, która nie rusza parametrów filtrów, nie zmienia tożsamości `filters`.
 */

// --- PRNG ---------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rnd = () => number;
const wybierz = <T,>(rnd: Rnd, lista: readonly T[]): T => lista[Math.floor(rnd() * lista.length)];

// --- Wartości (tylko poprawne: walidację linków pilnuje useActivityFiltersUrl.test) ---
const REGIONY = REGION_SLUGS.slice(0, 3);
const WIEKI = filterOptions.age.map((o) => o.value).slice(0, 3);
const KATEGORIE = (["plac-zabaw", "zoo", "park-rozrywki"] as const).filter((k) =>
  (CATEGORY_ORDER as readonly string[]).includes(k),
);
const SORTY = ["rating", "most_reviewed", "name"];
const PROMIENIE = [10, 25, 50];
const FRAZY = ["zoo", "łódź", " park ", ""];
// Trzeci kadr = pierwszy po zaokrągleniu zoomu: zapis mapy bez zmiany adresu (S6).
const KADRY: [number, number, number][] = [
  [52.2297, 21.0122, 11],
  [50.0614, 19.9366, 12],
  [52.2297, 21.0122, 11.4],
];
const STARTY = [
  "",
  "view=map",
  `view=map&lat=52.22970&lng=21.01220&zoom=11&region=${REGIONY[0]}&type=${KATEGORIE[1]}`,
  `age=${WIEKI[1]}&search=zoo`,
  `region=${REGIONY[1]}&dist=25&age=${WIEKI[0]}&type=${KATEGORIE[0]},${KATEGORIE[2]}&view=map&fav=1&lat=50.06140&lng=19.93660&zoom=12`,
];
const KLUCZE_FILTROW = ["region", "age", "type", "sort", "dist"];
const LIMIT_RENDEROW = 6;
const CIAGI = 200;
const AKCJI = 15;

// --- Stanowisko ----------------------------------------------------------------
let rendery = 0;
let zapisyMapy = 0;

function useStanowisko() {
  rendery += 1;
  const filtry = useActivityFilters();
  const [params, setParams] = useSearchParams();
  // Licznik wywołań setSearchParams z useMapUrlState (S6).
  const setLiczony = useCallback<SetURLSearchParams>(
    (...args) => {
      zapisyMapy += 1;
      setParams(...args);
    },
    [setParams],
  );
  const mapa = useMapUrlState(params, setLiczony);
  const location = useLocation();
  const navigate = useNavigate();
  // handleSaveMapState czyta window.location (bezpiecznik zapisu bez zmian):
  // w MemoryRouterze przepisujemy tam adres routera po każdym commicie.
  useLayoutEffect(() => {
    window.history.replaceState(null, "", location.pathname + location.search);
  }, [location.pathname, location.search]);
  // Konsument jak ViewportFilter przed 4f2abac: zapisuje kadr przy każdej nowej
  // tożsamości callbacku zapisu. Bez bezpiecznika „zapis bez zmian = brak zapisu”
  // to pętla zapisów adresu (S7: test pada albo wisi do timeoutu).
  const { viewMode, savedMapState, handleSaveMapState } = mapa;
  useEffect(() => {
    if (viewMode === "map" && savedMapState) handleSaveMapState(savedMapState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSaveMapState]);
  return { ...filtry, ...mapa, search: params.toString(), klucz: location.key, navigate };
}
type Stanowisko = ReturnType<typeof useStanowisko>;

// --- Model historii ------------------------------------------------------------
interface Model {
  wpisy: string[];
  idx: number;
  pole: string | null; // null = pole nie było pisane w tej akcji (sprawdzamy tylko po trim)
}
type Wynik = "push" | "replace" | "brak" | "nawigacja";

const kanon = (s: string) =>
  [...new URLSearchParams(s).entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("&");

function zapisz(m: Model, mutuj: (p: URLSearchParams) => void, tryb: "push" | "replace"): Wynik {
  const teraz = m.wpisy[m.idx];
  const po = new URLSearchParams(teraz);
  mutuj(po);
  if (kanon(po.toString()) === kanon(teraz)) return "brak";
  if (tryb === "replace") {
    m.wpisy[m.idx] = po.toString();
  } else {
    m.wpisy = m.wpisy.slice(0, m.idx + 1);
    m.wpisy.push(po.toString());
    m.idx += 1;
  }
  return tryb;
}
const zlozWyniki = (a: Wynik, b: Wynik): Wynik => (a === "brak" ? b : b === "brak" ? a : "push");

function filtryZAdresu(adres: string) {
  const p = new URLSearchParams(adres);
  const f: Record<string, unknown> = {};
  const region = p.get("region");
  if (region) f.city = region;
  if (p.get("age")) f.age = p.get("age");
  const typ = (p.get("type") ?? "").split(",").filter(Boolean);
  if (typ.length) f.type = typ;
  if (p.get("sort")) f.sort = p.get("sort");
  const dist = Number(p.get("dist"));
  if (region && p.get("dist") && dist > 0 && dist <= 100) f.distance = dist;
  return f;
}

function kadrZAdresu(adres: string) {
  const p = new URLSearchParams(adres);
  if (!p.get("lat") || !p.get("lng") || !p.get("zoom")) return null;
  return {
    center: [Number(p.get("lat")), Number(p.get("lng"))],
    zoom: Number(p.get("zoom")),
    favoritesOnly: p.get("fav") === "1",
  };
}

// --- Akcje rodzica -------------------------------------------------------------
interface Akcja {
  opis: string;
  mapa?: boolean; // zapis stanu mapy (S6)
  wyczysc?: boolean; // clearAllFilters zeruje też filtry lokalne (S8 nie dotyczy)
  naHooku: (h: Stanowisko) => void;
  naModelu: (m: Model) => Wynik;
}

function ustawFiltr(nazwa: string, wartosc?: string) {
  return (p: URLSearchParams) => {
    if (wartosc) p.set(nazwa, wartosc);
    else p.delete(nazwa);
  };
}

function losujAkcje(rnd: Rnd, m: Model): Akcja {
  const adres = new URLSearchParams(m.wpisy[m.idx]);
  const naMapie = adres.get("view") === "map";
  const rodzaje = [
    "region", "wiek", "kategoria", "kategorie", "sort", "promien", "fraza", "frazaIFiltr",
    "wyczysc", "widok", "mapa", "mapa", "wstecz", "wstecz", "naprzod",
  ].filter((r) => (r === "wstecz" ? m.idx > 0 : r === "naprzod" ? m.idx < m.wpisy.length - 1 : true));
  const rodzaj = wybierz(rnd, rodzaje);

  switch (rodzaj) {
    case "region": {
      const v = wybierz(rnd, [...REGIONY, undefined]);
      return {
        opis: `region=${v ?? "-"}`,
        naHooku: (h) => h.updateFilter("city", v),
        naModelu: (mm) =>
          zapisz(mm, (p) => {
            ustawFiltr("region", v)(p);
            if (!v) p.delete("dist");
          }, "push"),
      };
    }
    case "wiek": {
      const v = wybierz(rnd, [...WIEKI, undefined]);
      return {
        opis: `wiek=${v ?? "-"}`,
        naHooku: (h) => h.updateFilter("age", v),
        naModelu: (mm) => zapisz(mm, ustawFiltr("age", v), "push"),
      };
    }
    case "kategoria": {
      const v = wybierz(rnd, KATEGORIE);
      return {
        opis: `chip ${v}`,
        naHooku: (h) => h.toggleArrayFilter("type", v),
        naModelu: (mm) =>
          zapisz(mm, (p) => {
            const teraz = (p.get("type") ?? "").split(",").filter(Boolean);
            const po = teraz.includes(v) ? teraz.filter((t) => t !== v) : [...teraz, v];
            ustawFiltr("type", po.join(","))(p);
          }, "push"),
      };
    }
    case "kategorie": {
      const v = KATEGORIE.filter(() => rnd() < 0.4);
      return {
        opis: `kategorie=[${v.join(",")}]`,
        naHooku: (h) => h.updateFilter("type", v),
        naModelu: (mm) => zapisz(mm, ustawFiltr("type", v.join(",")), "push"),
      };
    }
    case "sort": {
      const v = wybierz(rnd, [...SORTY, undefined]);
      return {
        opis: `sort=${v ?? "-"}`,
        naHooku: (h) => h.updateFilter("sort", v),
        naModelu: (mm) => zapisz(mm, ustawFiltr("sort", v), "push"),
      };
    }
    case "promien": {
      const v = wybierz(rnd, [...PROMIENIE, undefined]);
      return {
        opis: `promien=${v ?? "-"}`,
        naHooku: (h) => h.updateFilter("distance", v),
        naModelu: (mm) =>
          zapisz(mm, (p) => ustawFiltr("dist", v && p.get("region") ? String(v) : undefined)(p), "push"),
      };
    }
    case "fraza": {
      const q = wybierz(rnd, FRAZY);
      return {
        opis: `fraza "${q}" + Enter`,
        naHooku: (h) => h.setSearchQuery(q),
        naModelu: (mm) => {
          mm.pole = q;
          return zapisz(mm, ustawFiltr("search", q.trim()), "replace");
        },
      };
    }
    case "frazaIFiltr": {
      // Ten sam takt (np. „Pokaż wyniki” w arkuszu): drugi zapis nie gubi pierwszego.
      const q = wybierz(rnd, FRAZY);
      const v = wybierz(rnd, WIEKI);
      return {
        opis: `fraza "${q}" + wiek=${v} w jednym takcie`,
        naHooku: (h) => {
          h.setSearchQuery(q);
          h.updateFilter("age", v);
        },
        naModelu: (mm) => {
          mm.pole = q;
          const a = zapisz(mm, ustawFiltr("search", q.trim()), "replace");
          return zlozWyniki(a, zapisz(mm, ustawFiltr("age", v), "push"));
        },
      };
    }
    case "wyczysc":
      return {
        opis: "Wyczyść filtry",
        wyczysc: true,
        naHooku: (h) => h.clearAllFilters(),
        naModelu: (mm) => {
          mm.pole = "";
          return zapisz(mm, (p) => {
            for (const k of [...KLUCZE_FILTROW, "search"]) p.delete(k);
          }, "push");
        },
      };
    case "widok": {
      const cel = naMapie ? "grid" : "map";
      return {
        opis: cel === "map" ? "Mapa" : "Lista",
        naHooku: (h) => h.setViewMode(cel),
        naModelu: (mm) =>
          zapisz(mm, (p) => {
            if (cel === "map") p.set("view", "map");
            else for (const k of ["view", "lat", "lng", "zoom", "fav", "cats"]) p.delete(k);
          }, "push"),
      };
    }
    case "mapa": {
      const [lat, lng, zoom] = wybierz(rnd, KADRY);
      const fav = rnd() < 0.3;
      return {
        opis: `ruch mapy ${lat},${lng} z${zoom}${fav ? " fav" : ""}`,
        mapa: true,
        naHooku: (h) => h.handleSaveMapState({ center: [lat, lng], zoom, favoritesOnly: fav }),
        naModelu: (mm) => {
          if (new URLSearchParams(mm.wpisy[mm.idx]).get("view") !== "map") return "brak";
          return zapisz(mm, (p) => {
            p.set("lat", lat.toFixed(5));
            p.set("lng", lng.toFixed(5));
            p.set("zoom", zoomDoAdresu(zoom));
            ustawFiltr("fav", fav ? "1" : undefined)(p);
          }, "replace");
        },
      };
    }
    case "wstecz":
      return {
        opis: "wstecz",
        naHooku: (h) => h.navigate(-1),
        naModelu: (mm) => {
          mm.idx -= 1;
          return "nawigacja";
        },
      };
    default:
      return {
        opis: "naprzód",
        naHooku: (h) => h.navigate(1),
        naModelu: (mm) => {
          mm.idx += 1;
          return "nawigacja";
        },
      };
  }
}

// --- Bieg jednego ciągu --------------------------------------------------------
function sprawdz(
  h: Stanowisko,
  m: Model,
  akcja: Akcja,
  wynik: Wynik,
  przed: { klucz: string; filtry: object; adres: string },
  renderow: number,
  zapisowMapy: number,
): string[] {
  const bledy: string[] = [];
  const oczekiwany = m.wpisy[m.idx];
  if (kanon(h.search) !== kanon(oczekiwany)) bledy.push(`S1 adres "${h.search}" zamiast "${oczekiwany}"`);
  const f = JSON.parse(JSON.stringify(h.filters));
  const fz = filtryZAdresu(h.search);
  if (JSON.stringify(f, Object.keys(f).sort()) !== JSON.stringify(fz, Object.keys(fz).sort()))
    bledy.push(`S2 filtry ${JSON.stringify(f)} zamiast z adresu ${JSON.stringify(fz)}`);
  const fraza = new URLSearchParams(h.search).get("search") ?? "";
  if (h.searchQuery.trim() !== fraza) bledy.push(`S3 pole "${h.searchQuery}" przy ?search="${fraza}"`);
  if (m.pole !== null && h.searchQuery !== m.pole) bledy.push(`S3 pole "${h.searchQuery}" zamiast wpisanego "${m.pole}"`);
  const widok = new URLSearchParams(h.search).get("view") === "map" ? "map" : "grid";
  if (h.viewMode !== widok) bledy.push(`S4 widok ${h.viewMode} przy adresie ${widok}`);
  if (JSON.stringify(h.savedMapState) !== JSON.stringify(kadrZAdresu(h.search)))
    bledy.push(`S4 kadr ${JSON.stringify(h.savedMapState)} zamiast ${JSON.stringify(kadrZAdresu(h.search))}`);
  if (wynik === "brak" && h.klucz !== przed.klucz) bledy.push("S5 akcja bez zmiany adresu dołożyła/podmieniła wpis historii");
  if (wynik !== "brak" && h.klucz === przed.klucz) bledy.push(`S5 oczekiwany ${wynik}, a wpis historii ten sam`);
  if (akcja.mapa && zapisowMapy !== (wynik === "brak" ? 0 : 1))
    bledy.push(`S6 zapis mapy: ${zapisowMapy} wywołań setSearchParams przy wyniku ${wynik}`);
  if (renderow > LIMIT_RENDEROW) bledy.push(`S7 ${renderow} renderów na jedną akcję (limit ${LIMIT_RENDEROW})`);
  const filtryRuszone = KLUCZE_FILTROW.some(
    (k) => new URLSearchParams(przed.adres).get(k) !== new URLSearchParams(h.search).get(k),
  );
  if (!filtryRuszone && !akcja.wyczysc && h.filters !== przed.filtry)
    bledy.push("S8 nowa tożsamość `filters` bez zmiany filtrów w adresie");
  return bledy;
}

function biegCiagu(seed: number): string | null {
  const rnd = mulberry32(seed);
  const start = wybierz(rnd, STARTY);
  const m: Model = { wpisy: [start], idx: 0, pole: null };
  window.history.replaceState(null, "", "/" + (start ? `?${start}` : ""));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={["/" + (start ? `?${start}` : "")]}>{children}</MemoryRouter>
  );
  const { result, unmount } = renderHook(useStanowisko, { wrapper });
  const log: string[] = [`start /?${start}`];
  try {
    for (let i = 0; i < AKCJI; i++) {
      const akcja = losujAkcje(rnd, m);
      const h = result.current;
      const przed = { klucz: h.klucz, filtry: h.filters, adres: h.search };
      m.pole = null;
      const wynik = akcja.naModelu(m);
      rendery = 0;
      zapisyMapy = 0;
      act(() => akcja.naHooku(h));
      log.push(`${i + 1}. ${akcja.opis} -> ${wynik} -> /?${result.current.search}`);
      const bledy = sprawdz(result.current, m, akcja, wynik, przed, rendery, zapisyMapy);
      if (bledy.length) return `seed ${seed}, akcja ${i + 1}: ${bledy.join("; ")}\n  ${log.join("\n  ")}`;
    }
    return null;
  } catch (e) {
    return `seed ${seed}: wyjątek ${(e as Error).message}\n  ${log.join("\n  ")}`;
  } finally {
    unmount();
  }
}

describe("FMN-10 — ciągi akcji na filtrach i mapie (200 × 15, mulberry32)", () => {
  const PACZKA = 50;
  for (let od = 1; od <= CIAGI; od += PACZKA) {
    it(`ciągi seed ${od}-${od + PACZKA - 1}: adres, filtry, pole frazy, mapa i historia zgodne z modelem`, () => {
      const porazki: string[] = [];
      for (let seed = od; seed < od + PACZKA; seed++) {
        const blad = biegCiagu(seed);
        if (blad) porazki.push(blad);
      }
      expect(porazki.length, `${porazki.length}/${PACZKA} ciągów czerwonych; pierwszy:\n${porazki[0] ?? ""}`).toBe(0);
    });
  }

  it("ten sam seed = ten sam ciąg (powtarzalność repro)", () => {
    const opisy = (seed: number) => {
      const rnd = mulberry32(seed);
      const m: Model = { wpisy: [wybierz(rnd, STARTY)], idx: 0, pole: null };
      return Array.from({ length: AKCJI }, () => {
        const a = losujAkcje(rnd, m);
        a.naModelu(m);
        return a.opis;
      });
    };
    expect(opisy(7)).toEqual(opisy(7));
    expect(opisy(7)).not.toEqual(opisy(8));
  });
});
