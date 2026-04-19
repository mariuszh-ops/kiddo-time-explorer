import { useState, useEffect, useCallback } from "react";
import { LogOut, Heart, MapPin, Star, ChevronRight, PlusCircle, Shield, Mail, FileText, Lock, Users, X, Baby, CalendarIcon, LogIn, User } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { pl } from "date-fns/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";
import SubmitActivityModal from "@/components/SubmitActivityModal";
import { FEATURES } from "@/lib/featureFlags";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

const Profile = () => {
  const navigate = useNavigate();
  const { logout, isLoggedIn, login } = useAuth();
  const { favoritesCount, wantToVisitCount } = useSavedActivities();
  const { visitedCount } = useUserRatings();
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthAction = () => {
    login();
    setIsAuthModalOpen(false);
  };

  // Family profile
  interface Child { name: string; birthDate: string; }

  const loadChildren = (): Child[] =>
    getItem<Child[]>(STORAGE_KEYS.FAMILY_PROFILE, []);

  const [children, setChildren] = useState<Child[]>(loadChildren);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDate, setNewChildDate] = useState<Date | undefined>();

  const saveChildren = useCallback((list: Child[]) => {
    setChildren(list);
    setItem(STORAGE_KEYS.FAMILY_PROFILE, list);
  }, []);

  const addChild = () => {
    if (!newChildName.trim() || !newChildDate || children.length >= 6) return;
    saveChildren([...children, { name: newChildName.trim(), birthDate: newChildDate.toISOString() }]);
    setNewChildName("");
    setNewChildDate(undefined);
    setShowAddForm(false);
  };

  const removeChild = (index: number) => {
    saveChildren(children.filter((_, i) => i !== index));
  };

  const getAge = (birthDate: string) => {
    const d = new Date(birthDate);
    const years = differenceInYears(new Date(), d);
    if (years < 1) {
      const months = differenceInMonths(new Date(), d);
      return `${months} mies.`;
    }
    if (years === 1) return "1 rok";
    if (years < 5) return `${years} lata`;
    return `${years} lat`;
  };

  const user = {
    email: "anna.kowalska@email.com",
    initials: "AK",
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const infoLinks = [
    { label: "Kontakt", icon: Mail, path: "/kontakt" },
    { label: "Regulamin", icon: FileText, path: "/regulamin" },
    { label: "Polityka prywatności", icon: Lock, path: "/polityka-prywatnosci" },
  ];

  if (!isLoggedIn) {
    return (
      <PageTransition>
        <SEOHead title="Profil" description="Zaloguj się do swojego profilu FamilyFun." path="/profile" />
        <div className="min-h-screen bg-background">
          <Header />
          <div className="flex flex-col items-center justify-center py-24 md:py-32 text-center max-w-sm mx-auto px-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
              <User className="w-7 h-7 text-accent-foreground" />
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-semibold text-foreground mb-2">
              Twój profil rodzinny
            </h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Zaloguj się, żeby zapisywać ulubione miejsca i dodać dzieci do profilu.
            </p>
            <Button onClick={() => setIsAuthModalOpen(true)} className="gap-2">
              <LogIn className="w-4 h-4" />
              Zaloguj się
            </Button>
          </div>
          <Footer />
        </div>
        <AuthRequiredModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onGoogleClick={handleAuthAction}
          onEmailClick={handleAuthAction}
          onLoginClick={handleAuthAction}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SEOHead title="Profil" description="Zarządzaj swoim profilem FamilyFun." path="/profile" />
      <div className="min-h-screen bg-background">
        <Header />

        <div className="border-b border-border/50">
          <div className="container py-6 md:py-8">
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Profil
            </h1>
          </div>
        </div>

        <main className="container py-6 md:py-8 pb-20 md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto space-y-6"
          >
            {/* User identity */}
            <section className="bg-card rounded-xl p-6 border border-border text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-primary">{user.initials}</span>
              </div>
              <p className="text-foreground font-medium">{user.email}</p>
            </section>

            {/* Account summary */}
            <section className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Twoje zapisane miejsca
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <Link to="/my-places?tab=favorites" className="text-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors group cursor-pointer">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Heart className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    <p className="text-2xl font-bold text-foreground">{favoritesCount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Ulubione</p>
                </Link>
                <Link to="/my-places?tab=wantToVisit" className="text-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors group cursor-pointer">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <MapPin className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    <p className="text-2xl font-bold text-foreground">{wantToVisitCount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Chcę odwiedzić</p>
                </Link>
                <Link to="/my-places?tab=visited" className="text-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors group cursor-pointer">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Star className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                    <p className="text-2xl font-bold text-foreground">{visitedCount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Odwiedzone</p>
                </Link>
              </div>
            </section>

            {/* Family section */}
            {FEATURES.MATCH_PERCENTAGE && (
              <section className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Moja rodzina
                </h2>

                {children.length === 0 && !showAddForm ? (
                  <div className="text-center py-4">
                    <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Dodaj dzieci, żeby otrzymywać lepiej dopasowane rekomendacje
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                      <Baby className="w-4 h-4 mr-2" />
                      Dodaj dziecko
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {children.map((child, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-2 bg-accent/50 rounded-full px-3 py-1.5 text-sm"
                        >
                          <Baby className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-foreground">{child.name}</span>
                          <span className="text-muted-foreground">{getAge(child.birthDate)}</span>
                          <button
                            onClick={() => removeChild(i)}
                            className="ml-0.5 w-4 h-4 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
                            aria-label={`Usuń ${child.name}`}
                          >
                            <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {showAddForm ? (
                      <div className="space-y-3 p-3 bg-accent/30 rounded-lg">
                        <Input
                          placeholder="Imię dziecka"
                          value={newChildName}
                          onChange={(e) => setNewChildName(e.target.value)}
                          maxLength={30}
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newChildDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {newChildDate ? format(newChildDate, "d MMMM yyyy", { locale: pl }) : "Data urodzenia"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newChildDate}
                              onSelect={setNewChildDate}
                              disabled={(date) => date > new Date() || date < new Date("2005-01-01")}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={addChild} disabled={!newChildName.trim() || !newChildDate}>
                            Dodaj
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewChildName(""); setNewChildDate(undefined); }}>
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    ) : children.length < 6 ? (
                      <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                        <Baby className="w-4 h-4 mr-2" />
                        Dodaj dziecko
                      </Button>
                    ) : null}
                  </>
                )}
              </section>
            )}

            {/* Settings */}
            <section className="bg-card rounded-xl border border-border overflow-hidden">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-6 pt-5 pb-3">
                Ustawienia
              </h2>
              <button
                onClick={() => setIsSubmitOpen(true)}
                className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Zgłoś atrakcję</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              {import.meta.env.DEV && (
                <Link
                  to="/admin"
                  className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-accent/50 transition-colors border-t border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-foreground">Panel administracyjny</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              )}
            </section>

            {/* Info links */}
            <section className="bg-card rounded-xl border border-border overflow-hidden">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-6 pt-5 pb-3">
                Informacje
              </h2>
              {infoLinks.map((link, i) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-accent/50 transition-colors ${i > 0 ? "border-t border-border/50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </section>

            {/* Logout */}
            <section className="pt-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj się
              </Button>
            </section>
          </motion.div>
        </main>
        <Footer />
      </div>

      <SubmitActivityModal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} />
    </PageTransition>
  );
};

export default Profile;
