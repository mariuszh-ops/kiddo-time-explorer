import { describe, it, expect, vi, afterEach } from "vitest";
import { katalogZFraza } from "@/lib/frazaKatalogu";
import { buildListingQuery, listingFilterKey, DEFAULT_LISTING_SORT } from "@/lib/listingQuery";
import { fetchFilteredSlugs } from "@/lib/mapPins";
import { tokenizeQuery } from "@/lib/searchTokens";

/**
 * FMN-B92: strona województwa liczy frazę TĄ SAMĄ regułą co „/”.
 * „/” woła rpc ff_home_counts / ff_home_list z `p_tokens = tokenizeQuery(fraza)`
 * (useHomeCatalog.zbudujArgumenty), a obie funkcje filtrują przez ff_home_match.
 * Lista i mapa strony województwa mają więc pytać ff_home_match z tymi samymi słowami.
 *
 * Testujemy zbudowane żądanie (adres, metoda, ciało), bez sieci.
 */
type Zadanie = { url: URL; method: string; body: unknown; headers: Headers };
const zadanie = (q: unknown) => q as Zadanie;

describe("katalogZFraza — skąd bierze wiersze", () => {
  it("bez frazy: zwykła tabela public_activities (GET)", () => {
    const z = zadanie(katalogZFraza("slug", { region: "mazowieckie", search: "   " }));
    expect(z.url.pathname).toMatch(/\/rest\/v1\/public_activities$/);
    expect(z.method).toBe("GET");
  });

  it("z frazą: rpc ff_home_match (POST) ze słowami jak na „/”", () => {
    const z = zadanie(
      katalogZFraza("slug", { region: "mazowieckie", type: "sala-zabaw", search: "Sala  Zabaw" }),
    );
    expect(z.url.pathname).toMatch(/\/rest\/v1\/rpc\/ff_home_match$/);
    expect(z.method).toBe("POST");
    expect(z.body).toEqual({ p_region: "mazowieckie", p_types: ["sala-zabaw"], p_tokens: ["sala", "zabaw"] });
    expect(z.url.searchParams.get("select")).toBe("slug");
  });

  it("sam licznik przy frazie: POST z count=exact i limit=1 (nie HEAD z tablicą w adresie)", () => {
    const z = zadanie(katalogZFraza("place_id", { search: "zoo,park" }, { count: "exact", head: true }));
    expect(z.method).toBe("POST");
    expect(z.headers.get("Prefer")).toContain("count=exact");
    expect(z.url.searchParams.get("limit")).toBe("1");
    // przecinek zostaje w JEDNYM słowie — tak samo jak w ciele żądania z „/”
    expect((z.body as { p_tokens: string[] }).p_tokens).toEqual(["zoo,park"]);
  });
});

describe("buildListingQuery — parytet słów ze stroną główną", () => {
  const filtry = (search: string) => ({
    region: "malopolskie",
    type: undefined,
    amenities: [] as string[],
    minRating: 0,
    sort: DEFAULT_LISTING_SORT,
    includeUncertain: true,
    ageMin: 3,
    ageMax: 5,
    onlyFree: false,
    search,
  });

  it("słowa = tokenizeQuery(fraza), czyli to samo, co dostaje ff_home_counts na „/”", () => {
    for (const fraza of ["zoo", "sala zabaw", "Kraków", "Variété", "  Teatr   im. Hübnera "]) {
      const z = zadanie(buildListingQuery(filtry(fraza), { withCount: true }));
      expect(z.url.pathname, fraza).toMatch(/\/rpc\/ff_home_match$/);
      expect((z.body as { p_tokens: string[] }).p_tokens, fraza).toEqual(tokenizeQuery(fraza));
    }
  });

  it("pozostałe filtry strony idą jak dotąd (published, wiek M-07, sortowanie, licznik)", () => {
    const z = zadanie(buildListingQuery(filtry("zoo"), { withCount: true }));
    const p = z.url.searchParams;
    expect(p.get("published")).toBe("eq.true");
    expect(p.get("region")).toBe("eq.malopolskie");
    expect(p.getAll("or").join(" ")).toContain("age_min.lte.5");
    expect(p.get("order")).toContain("reviews_count.desc");
    expect(z.headers.get("Prefer")).toContain("count=exact");
    // stara reguła strony województwa zniknęła
    expect(z.url.toString()).not.toContain("ilike");
  });

  it("bez frazy zapytanie jest takie jak przed FMN-B92 (tabela, GET)", () => {
    const z = zadanie(buildListingQuery(filtry(""), { withCount: true }));
    expect(z.url.pathname).toMatch(/\/rest\/v1\/public_activities$/);
    expect(z.method).toBe("GET");
  });

  it("klucz filtrów liczony ze słów: wielkość liter i akcenty nie tworzą nowego zapytania", () => {
    expect(listingFilterKey(filtry("Variété"))).toBe(listingFilterKey(filtry("variete")));
    expect(listingFilterKey(filtry("zoo"))).not.toBe(listingFilterKey(filtry("park")));
  });
});

describe("fetchFilteredSlugs (mapa strony województwa) — ta sama reguła frazy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fraza idzie przez rpc ff_home_match, nie przez name/city ilike", async () => {
    const wolania: Request[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        wolania.push(new Request(input, init));
        return new Response(JSON.stringify([{ slug: "a" }, { slug: "b" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    const slugi = await fetchFilteredSlugs({ region: "mazowieckie", search: "sala zabaw" });
    expect([...slugi]).toEqual(["a", "b"]);
    expect(wolania).toHaveLength(1);
    const url = new URL(wolania[0].url);
    expect(url.pathname).toMatch(/\/rpc\/ff_home_match$/);
    expect(await wolania[0].json()).toEqual({ p_region: "mazowieckie", p_types: null, p_tokens: ["sala", "zabaw"] });
    expect(url.toString()).not.toContain("ilike");
  });
});
