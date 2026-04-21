import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";

const PolitykaPrywatnosci = () => {
  return (
    <PageTransition>
      <SEOHead title="Polityka prywatności" description="Informacje o przetwarzaniu danych osobowych w FamilyFun." path="/polityka-prywatnosci" />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 pb-20 sm:pb-8">
          <div className="max-w-2xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć do strony głównej
            </Link>

            <h1 className="text-3xl font-bold text-foreground mb-6">
              Polityka prywatności
            </h1>

            <div className="space-y-6">
              {[
                "Administrator danych",
                "Jakie dane zbieramy",
                "Cel przetwarzania danych",
                "Podstawa prawna (RODO)",
                "Cookies",
                "Twoje prawa",
                "Kontakt w sprawach RODO",
              ].map((title) => (
                <section key={title}>
                  <h2 className="text-xl font-semibold mt-8 mb-3">{title}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    [TREŚĆ DO UZUPEŁNIENIA — wymagana konsultacja prawna lub generator zgodny z RODO]
                  </p>
                </section>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default PolitykaPrywatnosci;
