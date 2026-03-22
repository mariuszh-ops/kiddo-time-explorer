import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

const Regulamin = () => {
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
              Regulamin serwisu FamilyFun
            </h1>

            <div className="prose prose-sm max-w-none text-foreground space-y-6">
              <section>
                <h2 className="text-lg font-semibold mb-2">1. Definicje</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Serwis FamilyFun (dalej „Serwis") to platforma internetowa umożliwiająca przeglądanie, 
                  ocenianie i zapisywanie atrakcji rodzinnych w Polsce. Użytkownikiem jest każda osoba 
                  korzystająca z Serwisu, zarówno zarejestrowana, jak i niezarejestrowana. Administrator 
                  oznacza zespół zarządzający Serwisem.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">2. Warunki korzystania</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Korzystanie z Serwisu jest bezpłatne. Rejestracja konta umożliwia zapisywanie ulubionych 
                  atrakcji, dodawanie ocen i opinii oraz planowanie wizyt. Użytkownik zobowiązuje się do 
                  korzystania z Serwisu zgodnie z obowiązującym prawem i dobrymi obyczajami. Zabrania się 
                  publikowania treści obraźliwych, nieprawdziwych lub naruszających prawa osób trzecich.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">3. Zasady zgłaszania atrakcji</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Użytkownicy mogą zgłaszać nowe atrakcje za pomocą formularza „Dodaj nowe miejsce". 
                  Każde zgłoszenie jest weryfikowane przez zespół redakcyjny przed publikacją. Administrator 
                  zastrzega sobie prawo do odrzucenia zgłoszenia bez podania przyczyny. Zgłoszone atrakcje 
                  mogą być edytowane przez redakcję w celu zapewnienia spójności i jakości treści.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">4. Odpowiedzialność</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Serwis dokłada starań, aby prezentowane informacje były aktualne i rzetelne, jednak nie 
                  ponosi odpowiedzialności za ewentualne nieścisłości w opisach atrakcji, godzinach otwarcia 
                  czy cenach biletów. Przed wizytą zalecamy sprawdzenie informacji bezpośrednio u organizatora. 
                  Opinie użytkowników wyrażają ich osobiste doświadczenia i nie stanowią stanowiska Serwisu.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">5. Postanowienia końcowe</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Administrator zastrzega sobie prawo do zmiany niniejszego regulaminu. O istotnych zmianach 
                  użytkownicy zostaną poinformowani za pośrednictwem Serwisu. Regulamin wchodzi w życie 
                  z dniem publikacji. W sprawach nieuregulowanych niniejszym regulaminem zastosowanie mają 
                  przepisy prawa polskiego.
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

export default Regulamin;
