import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import { REGION_BY_SLUG } from "@/data/regions";
import { catalogClient } from "@/lib/catalogClient";

interface IndexRow {
  slug: string;
  name: string;
  city: string | null;
}

/** Pobiera KOMPLET opublikowanych atrakcji regionu (bez paginacji w UI). */
async function fetchAllInRegion(region: string): Promise<IndexRow[]> {
  const PAGE = 1000;
  const all: IndexRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await catalogClient
      .from("public_activities")
      .select("slug,name,city")
      .eq("published", true)
      .eq("region", region)
      .or("admin_hidden.is.null,admin_hidden.eq.false")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const chunk = (data ?? []) as unknown as IndexRow[];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return all;
}

const firstLetter = (name: string) => {
  const ch = name.trim().charAt(0).toLocaleUpperCase("pl-PL");
  return /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(ch) ? ch : "#";
};

const IndexRegion = () => {
  const { regionSlug = "" } = useParams();
  const region = REGION_BY_SLUG[regionSlug];
  const [rows, setRows] = useState<IndexRow[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!region) return;
    let cancelled = false;
    setLoading(true);
    fetchAllInRegion(region.slug)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [region]);

  if (!region) return <NotFound />;

  const groups = new Map<string, IndexRow[]>();
  for (const row of rows) {
    if (!row.slug || !row.name) continue;
    const letter = firstLetter(row.name);
    const list = groups.get(letter);
    if (list) list.push(row);
    else groups.set(letter, [row]);
  }
  const letters = [...groups.keys()].sort((a, b) => a.localeCompare(b, "pl-PL"));

  return (
    <>
      <SEOHead
        title={`Indeks atrakcji — ${region.label} | FamilyFun`}
        description={`Pełna lista atrakcji dla dzieci w województwie ${region.label.toLowerCase()} — ${region.subtitle} i cały region.`}
        path={`/indeks/${region.slug}`}
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="container py-8 pb-20 sm:pb-8">
          <nav aria-label="Ścieżka" className="text-sm text-muted-foreground mb-4">
            <Link to="/indeks" className="underline">
              Indeks atrakcji
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{region.label}</span>
          </nav>

          <h1 className="text-3xl font-bold text-foreground mb-6">
            Wszystkie atrakcje — {region.label}
          </h1>

          {loading && <p className="text-muted-foreground">Ładowanie listy…</p>}
          {error && <p className="text-destructive">Nie udało się pobrać listy atrakcji.</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="text-muted-foreground">Brak atrakcji w tym województwie.</p>
          )}

          {letters.map((letter) => (
            <section key={letter} className="mb-8">
              <h2 className="text-xl font-semibold mb-2">{letter}</h2>
              <ul className="space-y-1">
                {groups.get(letter)!.map((row) => (
                  <li key={row.slug}>
                    <Link to={`/atrakcje/${row.slug}`} className="text-primary underline">
                      {row.name}
                    </Link>
                    {row.city ? <span className="text-muted-foreground"> — {row.city}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default IndexRegion;
