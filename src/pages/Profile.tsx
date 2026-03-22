import { LogOut, Heart, MapPin, Star } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import PageTransition from "@/components/PageTransition";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useUserRatings } from "@/contexts/UserRatingsContext";

const Profile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { favoritesCount, wantToVisitCount } = useSavedActivities();
  const { visitedCount } = useUserRatings();

  // Mock user data - in real app this would come from auth context
  const user = {
    email: "anna.kowalska@email.com",
    initials: "AK",
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
      {/* Global header */}
      <Header />

      {/* Page title */}
      <div className="border-b border-border/50">
        <div className="container py-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            Profil
          </h1>
        </div>
      </div>

      {/* Main content */}
      <main className="container py-6 md:py-8 pb-20 sm:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-md mx-auto space-y-6"
        >
          {/* User identity section */}
          <section className="bg-card rounded-xl p-6 border border-border text-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-semibold text-primary">
                {user.initials}
              </span>
            </div>

            {/* Email */}
            <p className="text-foreground font-medium">{user.email}</p>
          </section>

          {/* Account summary - clickable stats */}
          <section className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Twoje zapisane miejsca
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {/* Favorites stat - clickable */}
              <Link 
                to="/my-places?tab=favorites"
                className="text-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Heart className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                  <p className="text-2xl font-bold text-foreground">
                    {favoritesCount}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Ulubione
                </p>
              </Link>

              {/* Want to visit stat - clickable */}
              <Link 
                to="/my-places?tab=wantToVisit"
                className="text-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                  <p className="text-2xl font-bold text-foreground">
                    {wantToVisitCount}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Chcę odwiedzić
                </p>
              </Link>

              {/* Visited stat - clickable */}
              <Link 
                to="/my-places?tab=visited"
                className="text-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                  <p className="text-2xl font-bold text-foreground">
                    {visitedCount}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Odwiedzone
                </p>
              </Link>
            </div>
          </section>

          {/* Actions */}
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
    </div>
    </PageTransition>
  );
};

export default Profile;
