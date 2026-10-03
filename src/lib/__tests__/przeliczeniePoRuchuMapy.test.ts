import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kluczKadruMapy, zaplanujPoRuchuMapy } from "@/lib/przeliczeniePoRuchuMapy";

// Mapa z ręcznie przesuwanym środkiem (jak panel Leafleta w trakcie animacji panBy).
function mapa(lat = 52.2299, lng = 21.012, zoom = 11) {
  const stan = { lat, lng, zoom };
  return {
    stan,
    getCenter: () => ({ lat: stan.lat, lng: stan.lng }),
    getZoom: () => stan.zoom,
  };
}

describe("wiersz 35 (FMN-7-040): przeliczenie listy kadru po moveend", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("mapa stoi po moveend: przeliczenie po 200 ms, raz", () => {
    const m = mapa();
    const timer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const akcja = vi.fn();
    zaplanujPoRuchuMapy(m, timer, 200, akcja);
    vi.advanceTimersByTime(199);
    expect(akcja).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(akcja).toHaveBeenCalledTimes(1);
  });

  it("dymek przesuwa mapę 2x: timer z przerwanego panBy nie liczy kadru pośredniego, liczy koniec ruchu", () => {
    const m = mapa();
    const timer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const kadry: number[] = [];
    const akcja = () => kadry.push(m.stan.lat);
    // moveend pierwszego panBy (przerwanego przez drugi) przy +44 px
    m.stan.lat = 52.2484;
    zaplanujPoRuchuMapy(m, timer, 200, akcja);
    // druga animacja jedzie dalej: po 200 ms mapa jest w kadrze pośrednim
    vi.advanceTimersByTime(150);
    m.stan.lat = 52.2585;
    vi.advanceTimersByTime(50);
    expect(kadry).toEqual([]);
    // koniec drugiej animacji: moveend planuje przeliczenie kadru końcowego
    m.stan.lat = 52.25891;
    vi.advanceTimersByTime(60);
    zaplanujPoRuchuMapy(m, timer, 200, akcja);
    vi.advanceTimersByTime(200);
    expect(kadry).toEqual([52.25891]);
  });

  it("kolejny moveend przed upływem 200 ms kasuje poprzedni plan (jak dotąd clearTimeout)", () => {
    const m = mapa();
    const timer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const akcja = vi.fn();
    zaplanujPoRuchuMapy(m, timer, 200, akcja);
    vi.advanceTimersByTime(100);
    zaplanujPoRuchuMapy(m, timer, 200, akcja);
    vi.advanceTimersByTime(200);
    expect(akcja).toHaveBeenCalledTimes(1);
  });

  it("zmiana samego zoomu też jest ruchem", () => {
    const m = mapa();
    const k = kluczKadruMapy(m);
    m.stan.zoom = 12;
    expect(kluczKadruMapy(m)).not.toBe(k);
    const timer = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    const akcja = vi.fn();
    zaplanujPoRuchuMapy(m, timer, 200, akcja);
    m.stan.zoom = 13;
    vi.advanceTimersByTime(200);
    expect(akcja).not.toHaveBeenCalled();
  });
});
