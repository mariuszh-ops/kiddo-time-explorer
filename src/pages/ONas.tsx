import { Compass, Star, Heart, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Compass,
    title: "Odkrywaj",
    description: "Przeglądaj atrakcje w Twoim mieście, filtruj po wieku dziecka, typie i cenie.",
  },
  {
    icon: Star,
    title: "Sprawdzaj",
    description: "Czytaj opinie innych rodziców, sprawdź udogodnienia i ceny.",
  },
  {
    icon: Heart,
    title: "Dziel się",
    description: "Oceń odwiedzone miejsca i pomóż innym rodzinom.",
  },
];

const faqItems = [
  {
    question: "Czym jest FamilyFun?",
    answer: "FamilyFun to katalog atrakcji dla rodzin z dziećmi, ocenianych przez rodziców. Znajdziesz tu sprawdzone miejsca na wspólny czas z dzieckiem.",
  },
  {
    question: "Czy korzystanie z FamilyFun jest bezpłatne?",
    answer: "Tak, przeglądanie atrakcji i czytanie opinii jest całkowicie bezpłatne.",
  },
  {
    question: "Jak mogę dodać nową atrakcję?",
    answer: 'Kliknij "Zgłoś atrakcję" w profilu lub na stronie głównej i wypełnij formularz.',
  },
  {
    question: "W jakich miastach działa FamilyFun?",
    answer: "Obecnie FamilyFun obejmuje Warszawę. Planujemy rozszerzenie na Kraków, Wrocław, Gdańsk i Poznań.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const ONas = () => {
  return (
    <PageTransition>
      <SEOHead
        title="O nas"
        description="FamilyFun to platforma dla rodziców szukających sprawdzonych atrakcji dla dzieci. Odkryj naszą misję i dołącz do społeczności."
        path="/o-nas"
        jsonLd={faqJsonLd as unknown as Record<string, unknown>}
      />
      <div className="min-h-screen bg-background">
        <Header />

        <div className="border-b border-border/50">
          <div className="container py-6 md:py-8">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4"
            >
              ← Wróć do strony głównej
            </Link>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              O FamilyFun
            </h1>
          </div>
        </div>

        <main className="container py-8 md:py-12 pb-20 sm:pb-12">
          <div className="max-w-2xl mx-auto space-y-12">
            {/* Mission */}
            <section>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-3">Nasza misja</h2>
              <p className="text-muted-foreground leading-relaxed">
                FamilyFun to platforma dla rodziców, którzy szukają sprawdzonych miejsc na wspólny czas
                z dziećmi. Wierzymy, że najlepsze rekomendacje pochodzą od innych rodziców — dlatego
                budujemy społeczność, która dzieli się swoimi doświadczeniami.
              </p>
            </section>

            {/* How it works */}
            <section>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-6">Jak to działa</h2>
              <div className="grid gap-6 sm:grid-cols-3">
                {steps.map((step) => (
                  <div key={step.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-6">Najczęściej zadawane pytania</h2>
              <div className="space-y-4">
                {faqItems.map((item) => (
                  <div key={item.question} className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">{item.question}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* For organizers */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-start gap-3 mb-3">
                <Users className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <h2 className="text-lg font-serif font-semibold text-foreground">Dla organizatorów</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Prowadzisz atrakcję dla rodzin? Dołącz do FamilyFun i dotrzyj do tysięcy aktywnych
                rodziców w Twoim mieście.
              </p>
              <Button asChild variant="outline">
                <Link to="/kontakt" className="gap-2">
                  Skontaktuj się z nami
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-3">Kontakt</h2>
              <p className="text-muted-foreground leading-relaxed">
                Masz pytania lub sugestie? Napisz do nas —{" "}
                <a href="mailto:kontakt@familyfun.pl" className="text-primary hover:underline">
                  kontakt@familyfun.pl
                </a>
              </p>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default ONas;
