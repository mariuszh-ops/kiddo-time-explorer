import { User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Mock user data - in real app this would come from auth context
  const user = {
    email: "anna.kowalska@email.com",
    initials: "AK",
  };

  // Mock stats - in real app this would come from backend
  const stats = {
    favorites: 4,
    wantToVisit: 3,
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
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
      <main className="container py-6 md:py-8">
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

          {/* Account summary */}
          <section className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Twoje zapisane miejsca
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Favorites stat */}
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground mb-1">
                  {stats.favorites}
                </p>
                <p className="text-sm text-muted-foreground">Ulubione</p>
              </div>

              {/* Want to visit stat */}
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <p className="text-3xl font-bold text-foreground mb-1">
                  {stats.wantToVisit}
                </p>
                <p className="text-sm text-muted-foreground">Chcę odwiedzić</p>
              </div>
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
  );
};

export default Profile;
