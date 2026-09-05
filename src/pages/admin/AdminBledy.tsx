import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, AlertCircle } from "lucide-react";
import { catalogClient } from "@/lib/catalogClient";
import { cn } from "@/lib/utils";

type ClientErrorRow = {
  fingerprint: string;
  kind: string;
  message: string;
  page: string;
  wystapienia: number;
  klienci: number;
  uzytkownicy: number;
  pierwszy: string;
  ostatni: string;
};

const DAY_OPTIONS = [
  { value: 1, label: "1 dzień" },
  { value: 7, label: "7 dni" },
  { value: 30, label: "30 dni" },
];

function formatOstatni(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      try {
        const { data, error: rpcError } = await (catalogClient as any).rpc(
          "admin_client_errors",
          { p_days: days }
        );
        if (cancelled) return;
        if (rpcError) {
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
            <p className="text-sm text-muted-foreground mt-1">
              Wpisy znikają automatycznie 30 dni po ostatnim wystąpieniu
              (retencja o 03:15 UTC).
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
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 w-1/3">
                    Komunikat
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Typ
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Strona
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">
                    Wystąpienia
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">
                    Klienci
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">
                    Użytkownicy
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">
                    Ostatnio
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.fingerprint}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                    title={`fingerprint: ${row.fingerprint}`}
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
                      <span className="line-clamp-2 break-all">{row.page}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-right tabular-nums">
                      {Number(row.wystapienia).toLocaleString("pl-PL")}
                    </td>
                    <td className="px-4 py-3 align-top text-right tabular-nums">
                      {Number(row.klienci).toLocaleString("pl-PL")}
                    </td>
                    <td className="px-4 py-3 align-top text-right tabular-nums">
                      {Number(row.uzytkownicy).toLocaleString("pl-PL")}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {formatOstatni(row.ostatni)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
