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
            <p className="text-sm text-muted-foreground italic mb-8">
              Ostatnia aktualizacja: 13 lipca 2026 r.
            </p>

            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§1 Postanowienia ogólne</h2>
                <p className="mb-4">
                  Niniejszy regulamin określa zasady korzystania z serwisu internetowego FamilyFun
                  dostępnego pod adresem familyfun.pl (dalej: „Serwis"). Właścicielem i operatorem
                  Serwisu jest Softline sp. z o.o., z siedzibą w Bołtucia 2, 05-827 Grodzisk Mazowiecki,
                  NIP: 5342202117, REGON: 016450950
                  (dalej: „Operator").
                </p>
                <p className="mb-4">
                  Kontakt z Operatorem możliwy jest pod adresem:{" "}
                  <a className="text-primary underline" href="mailto:kontakt@familyfun.pl">kontakt@familyfun.pl</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§2 Definicje</h2>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li><strong>Serwis</strong> — strona internetowa FamilyFun wraz z jej funkcjonalnościami.</li>
                  <li><strong>Użytkownik</strong> — osoba korzystająca z Serwisu, zarówno bez logowania, jak i po utworzeniu konta.</li>
                  <li><strong>Konto</strong> — indywidualny profil Użytkownika, utworzony po zalogowaniu przez zewnętrznego dostawcę (Google).</li>
                  <li><strong>Treści Użytkownika</strong> — opinie, oceny, zgłoszenia miejsc, zgłoszenia błędów oraz inne materiały przesyłane przez Użytkownika.</li>
                  <li><strong>Katalog</strong> — zbiór informacji o atrakcjach dla rodzin prezentowanych w Serwisie.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§3 Zasady korzystania z serwisu</h2>
                <p className="mb-4">
                  Korzystanie z Serwisu jest bezpłatne. Przeglądanie Katalogu nie wymaga rejestracji.
                  Funkcje takie jak zapisywanie miejsc, wystawianie opinii oraz zgłaszanie nowych
                  atrakcji dostępne są po zalogowaniu.
                </p>
                <p className="mb-4">
                  Użytkownik zobowiązany jest do korzystania z Serwisu w sposób zgodny z prawem,
                  dobrymi obyczajami oraz niniejszym regulaminem, w szczególności do niezamieszczania
                  treści bezprawnych, naruszających prawa osób trzecich lub wprowadzających w błąd.
                </p>
                <p className="mb-4">
                  Do korzystania z Serwisu wymagane jest urządzenie z dostępem do sieci Internet
                  oraz aktualna przeglądarka internetowa z obsługą JavaScript i plików cookies.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§4 Konto użytkownika</h2>
                <p className="mb-4">
                  Konto tworzone jest automatycznie po pierwszym zalogowaniu z użyciem zewnętrznego
                  dostawcy (Google). Użytkownik może w każdej chwili usunąć konto kontaktując się
                  pod adresem <a className="text-primary underline" href="mailto:kontakt@familyfun.pl">kontakt@familyfun.pl</a>.
                </p>
                <p className="mb-4">
                  Operator może zablokować lub usunąć konto Użytkownika naruszającego regulamin,
                  po wcześniejszym powiadomieniu na adres e-mail przypisany do konta, chyba że
                  naruszenie ma charakter rażący lub wymaga natychmiastowej reakcji.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§5 Treści użytkowników</h2>
                <p className="mb-4">
                  Użytkownik ponosi wyłączną odpowiedzialność za Treści, które publikuje w Serwisie.
                  Publikując Treść, Użytkownik oświadcza, że przysługują mu do niej odpowiednie prawa
                  oraz udziela Operatorowi niewyłącznej, nieodpłatnej licencji na jej wyświetlanie
                  w Serwisie i w materiałach promocyjnych Serwisu.
                </p>
                <p className="mb-4">Zakazane jest publikowanie treści:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>naruszających prawo, dobra osobiste lub prawa autorskie osób trzecich;</li>
                  <li>wulgarnych, obraźliwych, dyskryminujących lub nawołujących do przemocy;</li>
                  <li>reklamowych, spamowych lub wprowadzających w błąd;</li>
                  <li>zawierających dane osobowe osób trzecich bez ich zgody.</li>
                </ul>
                <p className="mb-4">
                  Opinie i zgłoszenia podlegają moderacji. Operator zastrzega prawo do odmowy
                  publikacji lub usunięcia Treści naruszających regulamin, bez konieczności podania
                  szczegółowego uzasadnienia.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§6 Odpowiedzialność</h2>
                <p className="mb-4">
                  Informacje o atrakcjach prezentowane w Katalogu pochodzą z publicznie dostępnych
                  źródeł i od Użytkowników. Operator dokłada starań, aby były aktualne i poprawne,
                  jednak nie gwarantuje ich kompletności ani aktualności — w szczególności godzin
                  otwarcia, cen i dostępności atrakcji. Przed wizytą zalecamy weryfikację danych
                  bezpośrednio u organizatora.
                </p>
                <p className="mb-4">
                  Operator nie ponosi odpowiedzialności za skutki decyzji podjętych na podstawie
                  informacji z Serwisu, ani za działania osób trzecich (w tym organizatorów atrakcji).
                </p>
                <p className="mb-4">
                  Operator dokłada starań, aby Serwis działał w sposób ciągły, jednak zastrzega
                  prawo do przerw technicznych oraz do wprowadzania zmian w funkcjonalności Serwisu.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§7 Reklamacje</h2>
                <p className="mb-4">
                  Reklamacje dotyczące działania Serwisu można zgłaszać na adres:{" "}
                  <a className="text-primary underline" href="mailto:kontakt@familyfun.pl">kontakt@familyfun.pl</a>.
                  Reklamacja powinna zawierać opis problemu oraz dane kontaktowe zgłaszającego.
                  Operator rozpatruje reklamacje w terminie 14 dni od ich otrzymania.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">§8 Postanowienia końcowe</h2>
                <p className="mb-4">
                  Operator zastrzega prawo do zmiany regulaminu. O zmianach Użytkownicy posiadający
                  konto zostaną poinformowani na adres e-mail przypisany do konta z co najmniej
                  14-dniowym wyprzedzeniem. Dalsze korzystanie z Serwisu po wejściu w życie zmian
                  oznacza ich akceptację.
                </p>
                <p className="mb-4">
                  W sprawach nieuregulowanych regulaminem zastosowanie mają przepisy prawa polskiego,
                  w szczególności Kodeksu cywilnego, ustawy o świadczeniu usług drogą elektroniczną
                  oraz RODO. Zasady przetwarzania danych osobowych określa{" "}
                  <Link to="/polityka-prywatnosci" className="text-primary underline">Polityka prywatności</Link>.
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
