import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";

const PolitykaPrywatnosci = () => {
  return (
    <PageTransition>
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

            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-8">
              Polityka prywatności
            </h1>

            <div className="prose prose-sm max-w-none text-foreground space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-2">Jakie dane zbieramy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Podczas rejestracji i korzystania z Serwisu możemy zbierać następujące dane: adres e-mail, 
                  imię (opcjonalnie), oceny i opinie dodane do atrakcji oraz informacje o zapisanych miejscach. 
                  Nie zbieramy danych wrażliwych ani danych dotyczących dzieci — konto zakłada wyłącznie rodzic 
                  lub opiekun.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">Cel przetwarzania</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Dane przetwarzamy w celu świadczenia usług Serwisu: umożliwienia logowania, zapisywania 
                  ulubionych atrakcji, wyświetlania spersonalizowanych rekomendacji oraz publikowania opinii. 
                  Dane mogą być również wykorzystywane do celów analitycznych w formie zanonimizowanej, 
                  aby poprawiać jakość Serwisu.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">Pliki cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Serwis wykorzystuje pliki cookies w celu zapewnienia prawidłowego działania strony, 
                  zapamiętania preferencji użytkownika oraz analizy ruchu na stronie. Użytkownik może 
                  zarządzać ustawieniami cookies w swojej przeglądarce. Wyłączenie cookies może ograniczyć 
                  część funkcji Serwisu.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">Prawa użytkownika</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Każdy użytkownik ma prawo do wglądu w swoje dane, ich poprawiania, usunięcia oraz 
                  ograniczenia przetwarzania. Użytkownik może w dowolnym momencie zażądać usunięcia konta 
                  i powiązanych danych. Wszelkie wnioski dotyczące danych osobowych można kierować na adres 
                  e-mail podany w sekcji kontaktowej.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">Kontakt w sprawie danych</h2>
                <p className="text-muted-foreground leading-relaxed">
                  W sprawach związanych z ochroną danych osobowych prosimy o kontakt pod adresem: 
                  kontakt@familyfun.pl. Dokładamy wszelkich starań, aby odpowiadać na zapytania w ciągu 
                  14 dni roboczych.
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

export default PolitykaPrywatnosci;
