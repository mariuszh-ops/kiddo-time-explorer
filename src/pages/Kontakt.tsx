import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";

const Kontakt = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Wiadomość wysłana",
      description: "Dziękujemy za kontakt! Odpowiemy najszybciej jak to możliwe.",
    });
    setName("");
    setEmail("");
    setMessage("");
  };

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
              Kontakt
            </h1>

            <div className="grid md:grid-cols-[1fr,auto] gap-8 md:gap-12">
              {/* Contact form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Imię</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Twoje imię"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="twoj@email.pl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Wiadomość</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="W czym możemy pomóc?"
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="gap-2">
                  <Send className="w-4 h-4" />
                  Wyślij wiadomość
                </Button>
              </form>

              {/* Contact info */}
              <div className="space-y-4 md:pt-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">kontakt@familyfun.pl</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Odpowiadamy w ciągu 48h
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Kontakt;
