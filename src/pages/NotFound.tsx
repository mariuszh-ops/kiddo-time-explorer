import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SearchX } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
      <SEOHead title="Nie znaleziono strony" description="Strona, której szukasz, nie istnieje lub została przeniesiona." path={location.pathname} />
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pb-20 md:pb-0">
          <div className="text-center max-w-sm mx-auto px-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <SearchX className="w-7 h-7 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">Nie znaleziono strony</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Strona, której szukasz, nie istnieje lub została przeniesiona.
            </p>
            <Button asChild>
              <Link to="/">Wróć na stronę główną</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default NotFound;
