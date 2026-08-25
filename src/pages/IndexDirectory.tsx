import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { REGIONS } from "@/data/regions";

/** Surowa strona nawigacyjna (HTML sitemap) — spis województw. */
const IndexDirectory = () => {
  return (
    <>
      <SEOHead
        title="Indeks atrakcji"
        description="Pełny indeks atrakcji dla rodzin z dziećmi w Polsce — lista wszystkich województw i atrakcji w serwisie FamilyFun."
        path="/indeks"
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="container py-8 pb-20 sm:pb-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">Indeks atrakcji</h1>
          <ul className="space-y-2">
            {REGIONS.map((r) => (
              <li key={r.slug}>
                <Link to={`/indeks/${r.slug}`} className="text-primary underline">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default IndexDirectory;
