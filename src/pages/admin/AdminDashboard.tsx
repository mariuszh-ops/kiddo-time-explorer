import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Loader2, ArrowUpDown } from "lucide-react";
import { catalogClient } from "@/lib/catalogClient";
import { REGIONS } from "@/data/regions";

// Kształt zwracany przez rpc('admin_stats') — patrz specyfikacja zadania.
export interface AdminStats {
  total: number;
  widoczne: number;
  ukryte_admin: number;
  zdjete_selekcja: number;
  featured: number;
  niepewne: number;
  opinie_pending: number;
  zgloszenia_nowe: number;
  per_typ: Record<string, number>;
  per_region: Record<
    string,
    { n: number; bez_zdjecia: number; bez_opisu: number; bez_wieku: number }
  >;
}

// Ładne etykiety typów (fallback: slug)
const TYPE_LABELS: Record<string, string> = {
  "sala-zabaw": "Sale zabaw",
  "plac-zabaw": "Place zabaw",
  "park-rozrywki": "Parki rozrywki",
  "centra-rozrywki": "Centra rozrywki",
  "muzeum-teatr": "Muzea i teatry",
  sport: "Sport i ruch",
  zoo: "Zoo i zwierzęta",
  park: "Parki i natura",
  inne: "Inne",
};

type SortKey = "label" | "n" | "bez_zdjecia" | "bez_opisu" | "bez_wieku";

// Klikalna komórka „bez zdjęcia" prowadzi do Katalogu z prefiltrem.
// „bez opisu"/„bez wieku" prowadzą do zakładki Do przejrzenia (te queue'i
// istnieją tam, w Katalogu nie ma dla nich filtra UI).
function cellLink(
  kind: "img" | "desc" | "age",
  regionSlug: string,
  value: number,
) {
  if (value === 0) return <span className="text-muted-foreground/60">0</span>;
  const cls =
    "text-primary hover:underline underline-offset-2 font-medium tabular-nums";
  if (kind === "img") {
    return (
      <Link to={`/admin/katalog?region=${regionSlug}&img=no`} className={cls}>
        {value}
      </Link>
    );
  }
  const q = kind === "desc" ? "no-desc" : "no-age";
  return (
    <Link to={`/admin/do-przejrzenia?q=${q}`} className={cls}>
      {value}
    </Link>
  );
}

const AdminDashboard = () => {
  // Statystyki wstępnie załadowane przez AdminLayout — reużywamy przez outlet context,
  // żeby nie dublować zapytania.
  const outletStats = useOutletContext<{ stats: AdminStats | null }>()?.stats ?? null;
  const [stats, setStats] = useState<AdminStats | null>(outletStats);
  const [loading, setLoading] = useState(!outletStats);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("n");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (outletStats) {
      setStats(outletStats);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await catalogClient.rpc("admin_stats");
      if (cancelled) return;
      if (error || !data) {
        setError(error?.message ?? "Brak uprawnień lub błąd danych.");
      } else {
        setStats(data as AdminStats);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [outletStats]);

  const regionRows = useMemo(() => {
    if (!stats) return [];
    const rows = REGIONS.map((r) => {
      const p = stats.per_region?.[r.slug] ?? {
        n: 0,
        bez_zdjecia: 0,
        bez_opisu: 0,
        bez_wieku: 0,
      };
      return { slug: r.slug, label: r.label, ...p };
    });
    const dir = sortAsc ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "label") return a.label.localeCompare(b.label, "pl") * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
    return rows;
  }, [stats, sortKey, sortAsc]);

  const typeRows = useMemo(() => {
    if (!stats) return [];
    const entries = Object.entries(stats.per_typ ?? {});
    entries.sort((a, b) => b[1] - a[1]);
    return entries;
  }, [stats]);

  const maxType = typeRows[0]?.[1] ?? 0;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(k === "label");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Ładuję statystyki…
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
        Nie udało się pobrać statystyk. {error ?? ""}
      </div>
    );
  }

  const tiles = [
    { label: "Widoczne na froncie", value: stats.widoczne, to: undefined },
    { label: "Ukryte przez admina", value: stats.ukryte_admin, to: undefined },
    { label: "Poza selekcją", value: stats.zdjete_selekcja, to: undefined },
    { label: "Wyróżnione", value: stats.featured, to: undefined },
    { label: "Niepewne", value: stats.niepewne, to: undefined },
    {
      label: "Opinie do moderacji",
      value: stats.opinie_pending,
      to: "/admin/opinie",
    },
    {
      label: "Nowe zgłoszenia",
      value: stats.zgloszenia_nowe,
      to: "/admin/zgloszenia",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const inner = (
            <div
              className={`bg-card border border-border rounded-lg p-4 h-full transition-colors ${
                t.to ? "hover:border-primary/40 hover:bg-primary/5 cursor-pointer" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="text-2xl font-semibold mt-1 tabular-nums">
                {t.value.toLocaleString("pl-PL")}
              </div>
            </div>
          );
          return t.to ? (
            <Link key={t.label} to={t.to} className="block">
              {inner}
            </Link>
          ) : (
            <div key={t.label}>{inner}</div>
          );
        })}
      </div>

      <section className="bg-card border border-border rounded-lg overflow-hidden">
        <header className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Braki per województwo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kliknij liczbę, aby otworzyć odpowiednią listę.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {([
                  ["label", "Województwo", "text-left"],
                  ["n", "Kart", "text-right"],
                  ["bez_zdjecia", "Bez zdjęcia", "text-right"],
                  ["bez_opisu", "Bez opisu", "text-right"],
                  ["bez_wieku", "Bez wieku", "text-right"],
                ] as [SortKey, string, string][]).map(([k, l, align]) => (
                  <th key={k} className={`px-4 py-2 ${align}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(k)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {l}
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regionRows.map((r) => (
                <tr key={r.slug} className="border-t border-border">
                  <td className="px-4 py-2">{r.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.n.toLocaleString("pl-PL")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {cellLink("img", r.slug, r.bez_zdjecia)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {cellLink("desc", r.slug, r.bez_opisu)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {cellLink("age", r.slug, r.bez_wieku)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Rozkład per typ</h2>
        {typeRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych.</p>
        ) : (
          <ul className="space-y-2">
            {typeRows.map(([slug, n]) => {
              const label = TYPE_LABELS[slug] ?? slug;
              const pct = maxType > 0 ? (n / maxType) * 100 : 0;
              return (
                <li key={slug} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate">{label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums text-muted-foreground">
                    {n.toLocaleString("pl-PL")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;