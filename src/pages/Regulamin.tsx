import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";

const Regulamin = () => {
  return (
    <PageTransition>
      <SEOHead title="Regulamin serwisu" description="Regulamin korzystania z serwisu FamilyFun." path="/regulamin" />
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
              Regulamin serwisu FamilyFun
            </h1>

            <p className="text-sm text-muted-foreground italic mb-8">Ostatnia aktualizacja: [data do uzupełnienia]</p>

            <div className="space-y-6">
              {[
                "§1 Postanowienia ogólne",
                "§2 Definicje",
                "§3 Zasady korzystania z serwisu",
                "§4 Konto użytkownika",
                "§5 Treści użytkowników",
                "§6 Odpowiedzialność",
                "§7 Reklamacje",
                "§8 Postanowienia końcowe",
              ].map((title) => (
                <section key={title}>
                  <h2 className="text-xl font-semibold mt-8 mb-3">{title}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    [TREŚĆ DO UZUPEŁNIENIA — wymagana konsultacja prawna]
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

export default Regulamin;
