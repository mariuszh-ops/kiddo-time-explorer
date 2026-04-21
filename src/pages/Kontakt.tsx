import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";

const Kontakt = () => {
  return (
    <PageTransition>
      <SEOHead title="Kontakt" description="Skontaktuj się z zespołem FamilyFun." path="/kontakt" />
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
              Kontakt
            </h1>

            <p className="text-muted-foreground leading-relaxed mb-8">
              Masz pytanie, sugestię lub chcesz dodać swoją atrakcję? Napisz do nas.
            </p>

            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3">Email</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  <a href="mailto:kontakt@familyfun.pl" className="text-primary hover:underline">kontakt@familyfun.pl</a>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3">Współpraca biznesowa</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Reprezentujesz organizatora wydarzeń lub atrakcję? Skontaktuj się:{" "}
                  <a href="mailto:partner@familyfun.pl" className="text-primary hover:underline">partner@familyfun.pl</a>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3">Zgłoś problem</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Znalazłeś błąd lub nieaktualną informację? Napisz na:{" "}
                  <a href="mailto:bugs@familyfun.pl" className="text-primary hover:underline">bugs@familyfun.pl</a>
                </p>
              </section>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Kontakt;
