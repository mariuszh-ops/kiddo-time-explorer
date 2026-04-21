import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";

const ONas = () => {
  return (
    <PageTransition>
      <SEOHead
        title="O nas"
        description="FamilyFun to portal stworzony przez rodziców dla rodziców. Pomagamy znaleźć najlepsze atrakcje dla dzieci w 7 regionach Polski."
        path="/o-nas"
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 pb-20 sm:pb-8">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć do strony głównej
            </Link>

            <h1 className="text-3xl font-bold text-foreground mb-6">
              O FamilyFun
            </h1>

            <p className="text-muted-foreground leading-relaxed mb-4">
              FamilyFun to portal stworzony przez rodziców dla rodziców. Naszą misją jest pomóc Wam
              znaleźć najlepsze atrakcje dla dzieci w 7 największych regionach Polski — bez wertowania
              dziesiątek stron, blogów i grup na Facebooku.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">Co znajdziesz na FamilyFun</h2>
            <ul className="list-disc pl-6 text-muted-foreground leading-relaxed mb-4 space-y-1">
              <li>Ponad 2500 sprawdzonych atrakcji w Warszawie, Krakowie, Wrocławiu, Trójmieście, Poznaniu, Łodzi i na Śląsku</li>
              <li>Filtry dopasowane do potrzeb rodzin: wiek dzieci, indoor/outdoor, typ atrakcji</li>
              <li>Oceny od Google i prawdziwe opinie rodziców</li>
              <li>Mapę z atrakcjami w okolicy</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-3">Dla kogo</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Dla rodziców z dziećmi w każdym wieku — od malucha w wózku po nastolatka. Pomagamy
              planować weekendy, ferie i każde popołudnie, które warto spędzić aktywnie.
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-3">Skąd pomysł</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              FamilyFun powstał z prostej frustracji — szukanie pomysłu na wyjście z dzieckiem
              zajmowało godziny. Postanowiliśmy to zmienić.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default ONas;
