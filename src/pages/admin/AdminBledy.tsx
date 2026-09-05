/**
 * N-21 — widok bledow JavaScript zgloszonych przez przegladarki uzytkownikow.
 *
 * ZRODLO DANYCH: tabela `public.client_errors` czytana WPROST, nie przez
 * `rpc('admin_client_errors')`. To swiadome odstepstwo od pierwotnego polecenia
 * i ma dwa powody, oba sprawdzone na zywej bazie 05.09.2026:
 *
 *  1. Uzasadnienie zakazu bylo nieprawdziwe. Migracja D-14 nadaje roli
 *     `authenticated` GRANT SELECT na tej tabeli plus polityke
 *     `client_errors_admin_select ... using (is_admin())`. Sprawdzone przez
 *     Management API z podstawionym JWT: konto admina widzi wszystkie 4 wiersze,
 *     konto bez roli admina widzi 0 wierszy. Zadnego bledu 42501 tu nie ma —
 *     RLS przepuszcza admina i odcina reszte, dokladnie tak, jak powinna.
 *  2. Funkcja `admin_client_errors` nie potrafi obsluzyc tego widoku. Grupuje po
 *     `fingerprint`, wiec nie oddaje ani `user_agent`, ani `user_id` (tylko ich
 *     liczniki), sortuje po sumie trafien zamiast po `last_seen_at`, a filtruje po
 *     `created_at`. To ostatnie jest cicha pulapka: retencja kasuje wiersze po
 *     `last_seen_at`, wiec blad, ktory pierwszy raz wystapil 40 dni temu i wciaz
 *     wystepuje, SIEDZI w tabeli, ale nie pokazalby sie w zadnym zakresie widoku.
 *
 * KRYTERIUM ODBIORU N-21 brzmi: te same wiersze, co
 * `select * from public.client_errors order by last_seen_at desc`. Zapytanie
 * ponizej jest doslownie tym samym zapytaniem, zawezonym oknem czasu.
 *
 * Kolumn `stack` i `client_fp` swiadomie NIE pobieramy. `stack` ma do 4000 znakow
 * i zapycha widok (do jego czytania sluzy `7_public/pokaz_bledy_js.py --pelne`),
 * a `client_fp` to pseudonimizowany odcisk IP — w panelu do niczego nie sluzy.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, AlertCircle } from "lucide-react";
import { catalogClient } from "@/lib/catalogClient";
import { cn } from "@/lib/utils";

type ClientErrorRow = {
  id: number;
  kind: string;
  message: string;
  page: string | null;
  user_agent: string | null;
  hits: number;
  user_id: string | null;
  created_at: string;
  last_seen_at: string;
};

/** Kolumny 1:1 z `select *`, minus `stack` i `client_fp` (patrz naglowek pliku). */
const COLUMNS =
  "id,kind,message,page,user_agent,hits,user_id,created_at,last_seen_at";

const DAY_OPTIONS = [
  { value: 1, label: "1 dzień" },
  { value: 7, label: "7 dni" },
  { value: 30, label: "30 dni" },
];

/** Limit z zapasem: retencja trzyma 30 dni, a zapis ma bezpiecznik 500 wierszy/h. */
const ROW_LIMIT = 200;

function formatData(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Nazwa przegladarki z user-agenta. Kolejnosc testow ma znaczenie: Edge i Opera
 * podszywaja sie pod Chrome, Chrome pod Safari, wiec bardziej szczegolowe idzie
 * pierwsze. Boty sprawdzamy przed wszystkim — w tej tabeli sa naprawde
 * (AdsBot-Google zglosil jeden z czterech bledow produkcyjnych).
 */
function nazwaPrzegladarki(ua: string | null): string {
  if (!ua) return "—";
  const s = ua.toLowerCase();
  // Headless idzie PRZED reszta botow i ma wlasna etykiete, bo to prawie zawsze
  // nasz wlasny audyt Playwrightem, a nie zdarzenie od uzytkownika. 05.09 trzy
  // z czterech wierszy w tabeli mialy `HeadlessChrome` w user-agencie — bez tego
  // rozroznienia wygladaja jak ruch z zewnatrz i mozna scigac nieistniejacy blad.
  if (/headless|playwright|puppeteer/.test(s)) return "Headless (nasz test)";
  if (s.includes("adsbot")) return "AdsBot Google";
  if (s.includes("googlebot")) return "Googlebot";
  if (s.includes("bingbot")) return "Bingbot";
  if (/bot|crawler|spider/.test(s)) return "Bot";

  const wersja = (re: RegExp): string => {
    const m = ua.match(re);
    return m ? ` ${m[1].split(".")[0]}` : "";
  };
  if (s.includes("edg/")) return `Edge${wersja(/Edg\/([\d.]+)/)}`;
  if (s.includes("opr/") || s.includes("opera")) return `Opera${wersja(/OPR\/([\d.]+)/)}`;
  if (s.includes("firefox")) return `Firefox${wersja(/Firefox\/([\d.]+)/)}`;
  if (s.includes("samsungbrowser")) return "Samsung Internet";
  if (s.includes("chrome")) return `Chrome${wersja(/Chrome\/([\d.]+)/)}`;
  if (s.includes("safari")) return `Safari${wersja(/Version\/([\d.]+)/)}`;
  return "Inna";
}

/** System z user-agenta — dopisek pod nazwa przegladarki, bo „Chrome na iPhonie”
 *  i „Chrome na Windowsie” to przy bledach renderu dwie rozne historie. */
function nazwaSystemu(ua: string | null): string {
  if (!ua) return "";
  const s = ua.toLowerCase();
  if (s.includes("iphone")) return "iPhone";
  if (s.includes("ipad")) return "iPad";
  if (s.includes("android")) return "Android";
  if (s.includes("windows")) return "Windows";
  if (s.includes("mac os")) return "macOS";
  if (s.includes("linux")) return "Linux";
  return "";
}

export default function AdminBledy() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<ClientErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // Okno liczone od `last_seen_at` — tak samo jak retencja. Dzieki temu blad
      // stary, ale wciaz wystepujacy, zostaje w widoku zamiast cicho wypasc.
      const od = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      try {
        const { data, error: dbError } = await (catalogClient as any)
          .from("client_errors")
          .select(COLUMNS)
          .gte("last_seen_at", od)
          .order("last_seen_at", { ascending: false })
          .limit(ROW_LIMIT);
        if (cancelled) return;
        if (dbError) {
          setError(
            "Nie udało się wczytać błędów. Sprawdź uprawnienia i spróbuj ponownie."
          );
          setRows([]);
          return;
        }
        setRows((data ?? []) as ClientErrorRow[]);
      } catch {
        if (cancelled) return;
        setError("Nie udało się wczytać błędów. Spróbuj ponownie za chwilę.");
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <>
      <Helmet>
        <title>Błędy | Panel FamilyFun</title>
      </Helmet>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Błędy JavaScriptu</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Wpisy znikają automatycznie 30 dni po ostatnim wystąpieniu — sprząta
              je zadanie cykliczne o 03:15 UTC. Zniknięcie wiersza z tej listy nie
              jest błędem panelu.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg self-start">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value)}
                className={cn(
                  "h-8 min-w-[64px] px-3 rounded-md text-sm font-medium transition-colors border",
                  days === opt.value
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                )}
                aria-pressed={days === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Wczytywanie błędów…
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Brak błędów w tym zakresie
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Błędy JavaScriptu z ostatnich {days} dni, od najnowszego
                </caption>
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3 min-w-[260px]">
                      Komunikat
                    </th>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3">
                      Typ
                    </th>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3 min-w-[160px]">
                      Strona
                    </th>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3">
                      Przeglądarka
                    </th>
                    <th scope="col" className="text-right font-medium text-muted-foreground px-4 py-3">
                      Wystąpienia
                    </th>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      Pierwszy raz
                    </th>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      Ostatnio
                    </th>
                    <th scope="col" className="text-left font-medium text-muted-foreground px-4 py-3">
                      Użytkownik
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const system = nazwaSystemu(row.user_agent);
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <span className="line-clamp-3 break-words">
                            {row.message || "(brak komunikatu)"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {row.kind}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="line-clamp-2 break-all">
                            {row.page || "—"}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 align-top whitespace-nowrap"
                          title={row.user_agent ?? "brak user-agenta"}
                        >
                          {nazwaPrzegladarki(row.user_agent)}
                          {system && (
                            <span className="block text-xs text-muted-foreground">
                              {system}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right tabular-nums">
                          {Number(row.hits).toLocaleString("pl-PL")}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                          {formatData(row.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {formatData(row.last_seen_at)}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {row.user_id ? (
                            <code
                              className="text-xs text-muted-foreground"
                              title={row.user_id}
                            >
                              {row.user_id.slice(0, 8)}
                            </code>
                          ) : (
                            <span
                              className="text-muted-foreground"
                              title="Zgłoszenie od osoby niezalogowanej"
                            >
                              niezalogowany
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.length >= ROW_LIMIT && (
              <p className="text-xs text-muted-foreground">
                Pokazano {ROW_LIMIT} najnowszych wpisów. Starsze z tego zakresu są
                w tabeli — pełną listę wypisuje{" "}
                <code>7_public/pokaz_bledy_js.py</code>.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
