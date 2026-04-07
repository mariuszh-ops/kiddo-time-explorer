import { useState, useEffect, useCallback } from "react";
import { LogOut, Heart, MapPin, Star, ChevronRight, PlusCircle, Shield, Mail, FileText, Lock, Users, X, Baby, CalendarIcon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { favoritesCount, wantToVisitCount } = useSavedActivities();
  const { visitedCount } = useUserRatings();
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

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

        <main className="container py-6 md:py-8 pb-20 sm:pb-8">
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
