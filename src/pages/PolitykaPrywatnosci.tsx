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
            <p className="text-sm text-muted-foreground italic mb-8">
              Ostatnia aktualizacja: 13 lipca 2026 r.
            </p>

            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Administrator danych</h2>
                <p className="mb-4">
                  Administratorem danych osobowych przetwarzanych w serwisie FamilyFun
                  (dalej: „Serwis") jest Softline sp. z o.o., z siedzibą w Bołtucia 2, 05-827 Grodzisk Mazowiecki,
                  NIP: 5342202117, REGON: 016450950.
                  W sprawach dotyczących ochrony danych osobowych można kontaktować się pod adresem
                  e-mail: <a className="text-primary underline" href="mailto:kontakt@familyfun.pl">kontakt@familyfun.pl</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Jakie dane zbieramy</h2>
                <p className="mb-4">Przetwarzamy wyłącznie dane niezbędne do działania Serwisu:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>dane konta użytkownika (adres e-mail, identyfikator dostarczony przez dostawcę logowania Google, imię i zdjęcie profilowe, jeśli zostały udostępnione);</li>
                  <li>treści dodawane przez użytkownika (zapisane atrakcje, opinie, oceny, zgłoszenia błędów, zgłoszenia nowych miejsc);</li>
                  <li>dane techniczne przeglądarki (adres IP, rodzaj urządzenia, ustawienia językowe) zbierane w logach serwera;</li>
                  <li>dane analityczne w formie zanonimizowanej (Plausible / Google Analytics 4, jeśli włączony).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Cel przetwarzania danych</h2>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>utrzymanie konta i umożliwienie korzystania z funkcji wymagających logowania (zapisane miejsca, wystawianie opinii);</li>
                  <li>publikacja treści dodawanych przez użytkownika po ich moderacji;</li>
                  <li>obsługa zgłoszeń błędów i propozycji nowych atrakcji;</li>
                  <li>zapewnienie bezpieczeństwa Serwisu (wykrywanie nadużyć, logi techniczne);</li>
                  <li>analiza ruchu w celu ulepszania Serwisu (dane zagregowane, bez identyfikowania osób).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Podstawa prawna (RODO)</h2>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>art. 6 ust. 1 lit. b RODO — wykonanie umowy o świadczenie usług drogą elektroniczną (konto, publikacja treści);</li>
                  <li>art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes administratora (bezpieczeństwo Serwisu, analityka zagregowana, obsługa zgłoszeń);</li>
                  <li>art. 6 ust. 1 lit. a RODO — zgoda użytkownika (dotyczy plików cookies innych niż niezbędne, jeśli zostaną włączone).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Odbiorcy danych</h2>
                <p className="mb-4">Dane mogą być powierzane następującym kategoriom odbiorców:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>dostawca hostingu i bazy danych (Supabase / Lovable Cloud);</li>
                  <li>dostawca logowania (Google — w zakresie danych profilu udostępnianych przy logowaniu OAuth);</li>
                  <li>dostawcy narzędzi analitycznych (Plausible, Google Analytics — jeśli włączone);</li>
                  <li>podmioty świadczące pomoc prawną lub księgową administratora — w zakresie niezbędnym.</li>
                </ul>
                <p className="mb-4">
                  Część dostawców może przetwarzać dane poza EOG; w takim wypadku administrator zapewnia
                  odpowiednie zabezpieczenia (standardowe klauzule umowne UE). [DO WERYFIKACJI z listą podprocesorów.]
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Okres przechowywania</h2>
                <p className="mb-4">
                  Dane konta przechowujemy do momentu jego usunięcia przez użytkownika. Treści publiczne
                  (opinie, zgłoszenia) mogą być przechowywane po usunięciu konta w formie zanonimizowanej.
                  Logi techniczne przechowywane są przez okres niezbędny dla bezpieczeństwa Serwisu,
                  nie dłużej niż 12 miesięcy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Cookies</h2>
                <p className="mb-4">
                  Serwis wykorzystuje pliki cookies niezbędne do jego działania (m.in. utrzymanie sesji
                  po zalogowaniu). Pliki cookies analityczne i marketingowe uruchamiane są wyłącznie po
                  wyrażeniu zgody w banerze cookies. Zgodę można w każdej chwili wycofać czyszcząc dane
                  przeglądarki lub zmieniając ustawienia w banerze.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Twoje prawa</h2>
                <p className="mb-4">W związku z przetwarzaniem danych osobowych przysługują Ci:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>prawo dostępu do danych oraz otrzymania ich kopii;</li>
                  <li>prawo do sprostowania danych;</li>
                  <li>prawo do usunięcia danych („prawo do bycia zapomnianym");</li>
                  <li>prawo do ograniczenia przetwarzania;</li>
                  <li>prawo do przenoszenia danych;</li>
                  <li>prawo do wniesienia sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie;</li>
                  <li>prawo do wycofania zgody w dowolnym momencie (bez wpływu na wcześniejsze przetwarzanie);</li>
                  <li>prawo do wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">Kontakt w sprawach RODO</h2>
                <p className="mb-4">
                  Wnioski dotyczące danych osobowych oraz pytania w sprawach ochrony prywatności prosimy
                  kierować na adres: <a className="text-primary underline" href="mailto:kontakt@familyfun.pl">kontakt@familyfun.pl</a>.
                  Odpowiadamy w terminie do 30 dni od otrzymania wniosku.
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
