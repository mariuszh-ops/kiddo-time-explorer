import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Heart, 
  Star, 
  Clock, 
  MapPin, 
  Users, 
  Ticket,
  ExternalLink,
  Home,
  Sun,
  Sparkles,
  Brain,
  Zap,
  ArrowLeft,
  Check,
  MessageSquarePlus,
  Calendar,
  MapPinned,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockActivities } from "@/data/activities";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import Footer from "@/components/Footer";
import ReviewsModal from "@/components/ReviewsModal";
import ImageGallery from "@/components/ImageGallery";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import InlineRatingAction from "@/components/InlineRatingAction";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Default fallback values for activities without specific data
const defaultExperiencePoints = [
  "Aktywność dostosowana do różnych grup wiekowych",
  "Bezpieczna przestrzeń dla dzieci pod okiem rodziców",
  "Możliwość wspólnej zabawy całą rodziną",
];


const getActivityTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "edukacyjne": return Brain;
    case "aktywne": return Zap;
    case "kreatywne": return Sparkles;
    default: return Star;
  }
};

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<'favorite' | 'visit' | null>(null);
  const [saveError, setSaveError] = useState<'favorite' | 'visit' | null>(null);
  const isMobile = useIsMobile();
  
  // Use auth context
  const { isLoggedIn, login } = useAuth();
  
  // Use saved activities context
  const { 
    isFavorite: checkIsFavorite, 
    isWantToVisit: checkIsWantToVisit,
    toggleFavorite,
    toggleWantToVisit 
  } = useSavedActivities();

  const activityId = Number(id);
  const isFavorite = checkIsFavorite(activityId);
  const wantToVisit = checkIsWantToVisit(activityId);

  // Scroll to position title at ~1/3 from top of viewport
  useEffect(() => {
    // Small delay to ensure layout is complete
    const timer = setTimeout(() => {
      const titleCard = document.getElementById('activity-title-card');
      if (titleCard) {
        const cardTop = titleCard.getBoundingClientRect().top + window.scrollY;
        // Position title card at roughly 1/3 from top of viewport
        const targetScroll = Math.max(0, cardTop - (window.innerHeight * 0.15));
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
      } else {
        window.scrollTo(0, 0);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [id]);

  // Auto-dismiss error after 4 seconds
  useEffect(() => {
    if (saveError) {
      const timer = setTimeout(() => {
        setSaveError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [saveError]);

  const handleFavoriteClick = async () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setSaveError(null);
    setIsProcessing('favorite');
    try {
      const newState = await toggleFavorite(activityId);
      
      // Subtle toast feedback
      if (newState) {
        toast.success("Dodano do ulubionych", {
          duration: 2000,
          icon: <Heart className="w-4 h-4 fill-current" />,
        });
      }
    } catch (error) {
      setSaveError('favorite');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleWantToVisitClick = async () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setSaveError(null);
    setIsProcessing('visit');
    try {
      const newState = await toggleWantToVisit(activityId);
      
      // Subtle toast feedback
      if (newState) {
        toast.success("Dodano do listy", {
          duration: 2000,
          icon: <Check className="w-4 h-4" />,
        });
      }
    } catch (error) {
      setSaveError('visit');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAuthAction = () => {
    // Simulate successful login for design purposes
    login();
    setIsAuthModalOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };
  
  const activity = mockActivities.find((a) => a.id === Number(id));
  
  if (!activity) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-foreground mb-4">Nie znaleziono aktywności</h1>
          <Link to="/">
            <Button variant="outline">Wróć do listy</Button>
          </Link>
        </div>
      </main>
    );
  }

  const details = activityDetails[activity.id] || defaultDetails;
  const hasReviews = activity.reviewCount > 0;
  const averageRating = details.reviews.length > 0 
    ? details.reviews.reduce((sum, r) => sum + r.rating, 0) / details.reviews.length
    : 0;
  
  // Number of reviews to show initially (1-2 on mobile)
  const initialReviewCount = isMobile ? 2 : 3;

  return (
    <PageTransition>
      <main className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Desktop: Global header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile: Back button overlay on gallery */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-20 p-4">
        <button
          onClick={handleBack}
          className="w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="Wróć"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* 1. Header section with gallery */}
      <section className="relative">
        {/* Image gallery - swipeable carousel on mobile */}
        <ImageGallery 
          images={activity.imageUrls || [activity.imageUrl]} 
          activityTitle={activity.title}
          activityType={activity.type}
          activityId={activity.id}
        />
        
        {/* Content overlay */}
        <div className="container relative z-10">
          <div id="activity-title-card" className="relative bg-background rounded-t-2xl md:rounded-2xl p-5 md:p-8 shadow-soft">
            {/* Desktop: Contextual back navigation - above title */}
            <button
              onClick={handleBack}
              className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group mb-4"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm">Wróć do listy wydarzeń</span>
            </button>
            
            {/* Activity title */}
            <div className="flex items-center gap-2 mb-1 md:mb-2">
              <h1 className="text-xl md:text-3xl font-serif text-foreground leading-tight">
                {activity.title}
              </h1>
            </div>
            
            {/* Type indicator - hidden in MVP, structure preserved */}
            {/* 
            <div className="flex items-center gap-2 mb-3">
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${
                  activity.isEvent 
                    ? "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30" 
                    : "border-primary/30 text-primary"
                }`}
              >
                {activity.isEvent ? (
                  <><Calendar className="w-3 h-3 mr-1" />Wydarzenie</>
                ) : (
                  <><MapPinned className="w-3 h-3 mr-1" />Miejsce</>
                )}
              </Badge>
              
              {activity.isEvent && (
                <span className="text-sm text-muted-foreground">
                  {activity.eventDate || "Wydarzenie czasowe"}
                </span>
              )}
            </div>
            */}
            
            {/* Location */}
            <p className="text-sm md:text-base text-muted-foreground mb-3 flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="line-clamp-1">{activity.location}</span>
            </p>
            
            {/* Rating display or New badge */}
            <div className="flex items-center gap-2 mb-5">
              {hasReviews ? (
                <>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-bold text-foreground">{activity.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({activity.reviewCount} opinii)
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 bg-accent px-3 py-1.5 rounded-lg">
                    <Sparkles className="w-4 h-4 text-accent-foreground" />
                    <span className="font-medium text-accent-foreground">Nowa atrakcja</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Brak opinii rodziców
                  </span>
                </>
              )}
            </div>

            {/* Action buttons - prominent placement */}
            <div className="flex flex-col gap-3">
              {/* Stack vertically on mobile, side-by-side on desktop */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleFavoriteClick}
                  variant={isFavorite ? "default" : "default"}
                  size={isMobile ? "lg" : "default"}
                  className={`flex-1 transition-all duration-200 ${isFavorite ? "bg-primary" : ""}`}
                  disabled={isProcessing !== null}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isFavorite ? "saved" : "unsaved"}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center"
                    >
                      {isProcessing === 'favorite' ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full"
                          />
                          Zapisuję...
                        </>
                      ) : (
                        <>
                          <Heart className={`w-4 h-4 mr-2 transition-all duration-200 ${isFavorite ? "fill-current scale-110" : ""}`} />
                          {isFavorite ? "W ulubionych" : "Ulubione"}
                        </>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                <Button 
                  onClick={handleWantToVisitClick}
                  variant={wantToVisit ? "secondary" : "outline"}
                  size={isMobile ? "lg" : "default"}
                  className="flex-1 transition-all duration-200"
                  disabled={isProcessing !== null}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={wantToVisit ? "listed" : "unlisted"}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center"
                    >
                      {isProcessing === 'visit' ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full"
                          />
                          Zapisuję...
                        </>
                      ) : (
                        <>
                          {wantToVisit ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <MapPin className="w-4 h-4 mr-2" />
                          )}
                          {wantToVisit ? "Na liście" : "Chcę odwiedzić"}
                        </>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </Button>
              </div>
              
              {/* Inline error message */}
              <AnimatePresence>
                {saveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg"
                  >
                    <p className="text-sm text-destructive">
                      Nie udało się zapisać. Spróbuj ponownie.
                    </p>
                    <button
                      onClick={() => setSaveError(null)}
                      className="text-xs text-destructive/70 hover:text-destructive underline underline-offset-2"
                    >
                      Zamknij
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!saveError && (
                <div className="text-center md:text-left">
                  {isFavorite ? (
                    <Link 
                      to="/my-places?tab=favorites"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors"
                    >
                      <span>Zobacz moje miejsca</span>
                      <Heart className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Zapisz, żeby wrócić do tego miejsca później
                    </p>
                  )}
                </div>
              )}

              {/* Rating action - directly below CTA buttons */}
              <InlineRatingAction 
                activityId={activityId} 
                onAuthRequired={() => setIsAuthModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key facts section - compact grid on mobile */}
      <section className="container mt-5 md:mt-6">
        <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
          <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 md:mb-4">
            Podstawowe informacje
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {/* Age range */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent rounded-lg shrink-0">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground">Wiek</p>
                <p className="text-xs md:text-sm font-medium text-foreground truncate">{activity.ageRange}</p>
              </div>
            </div>

            {/* Indoor/Outdoor */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent rounded-lg shrink-0">
                {activity.isIndoor ? (
                  <Home className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
                ) : (
                  <Sun className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground">Lokalizacja</p>
                <p className="text-xs md:text-sm font-medium text-foreground truncate">
                  {activity.isIndoor ? "Wewnątrz" : "Na zewnątrz"}
                </p>
              </div>
            </div>

            {/* Estimated time */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent rounded-lg shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground">Czas</p>
                <p className="text-xs md:text-sm font-medium text-foreground truncate">{details.estimatedTime}</p>
              </div>
            </div>

            {/* Activity type */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-accent rounded-lg shrink-0">
                {(() => {
                  const IconComponent = getActivityTypeIcon(details.activityTypes[0]);
                  return <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />;
                })()}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground">Typ</p>
                <p className="text-xs md:text-sm font-medium text-foreground truncate">{details.activityTypes[0]}</p>
              </div>
            </div>

            {/* Price range - hidden on mobile, shown in full grid on tablet+ */}
            <div className="hidden md:flex items-center gap-2.5">
              <div className="p-2 bg-accent rounded-lg shrink-0">
                <Ticket className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Cena</p>
                <p className="text-sm font-medium text-foreground">{details.priceRange}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Experience overview - scannable list */}
      <section className="container mt-5 md:mt-6">
        <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
          <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 md:mb-4">
            Co Was czeka
          </h2>
          <ul className="space-y-2.5 md:space-y-3">
            {details.experiencePoints.map((point, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-foreground text-sm leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Practical information */}
      <section className="container mt-5 md:mt-6">
        <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
          <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 md:mb-4">
            Informacje praktyczne
          </h2>
          
          <div className="space-y-4">
            {/* Opening hours */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Godziny otwarcia</p>
                <p className="text-sm text-foreground">{details.openingHours}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Adres</p>
                <p className="text-sm text-foreground">{details.address}</p>
                {details.address !== "Sprawdź dokładny adres na stronie organizatora" && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary active:opacity-70 inline-flex items-center gap-1 mt-1"
                  >
                    Otwórz w Mapach
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Ticket sources */}
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1.5">Kup bilety</p>
                {details.ticketSources.some(s => s.url && s.url !== "#") ? (
                  <div className="flex flex-wrap gap-2">
                    {details.ticketSources.map((source, index) => (
                      source.url && source.url !== "#" ? (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded-full active:opacity-70 transition-opacity"
                        >
                          {source.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground text-sm rounded-full cursor-default"
                          title="Link w przygotowaniu"
                        >
                          {source.name}
                        </span>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Info className="w-4 h-4" />
                    Informacje o biletach wkrótce
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 6. Reviews section */}
      <section className="container mt-5 md:mt-6">
        <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opinie rodziców
            </h2>
            {hasReviews && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-sm font-medium text-foreground">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {hasReviews ? (
            <>
              {/* Review cards - limited on mobile */}
              <div className="space-y-3 md:space-y-4 mb-4">
                {details.reviews.slice(0, initialReviewCount).map((review, index) => (
                  <div key={index} className="pb-3 md:pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-xs md:text-sm font-medium text-accent-foreground">
                            {review.author.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{review.author}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">{review.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
                  </div>
                ))}
              </div>

              {details.reviews.length > initialReviewCount && (
                <Button 
                  variant="outline" 
                  size={isMobile ? "lg" : "default"}
                  className="w-full"
                  onClick={() => setIsReviewsModalOpen(true)}
                >
                  Zobacz wszystkie opinie ({details.reviews.length})
                </Button>
              )}
            </>
          ) : (
            /* Empty state for no reviews */
            <div className="text-center py-6 md:py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-accent rounded-full flex items-center justify-center">
                <MessageSquarePlus className="w-6 h-6 text-accent-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">
                Brak opinii
              </p>
              <p className="text-sm text-muted-foreground">
                {isLoggedIn 
                  ? "Bądź pierwszy, który oceni tę atrakcję — użyj formularza powyżej"
                  : "Bądź pierwszy, który oceni tę atrakcję"
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Reviews Modal */}
      <ReviewsModal 
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        reviews={details.reviews}
        activityName={activity.title}
        averageRating={averageRating}
      />

      {/* Auth Required Modal - for logged out users */}
      <AuthRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGoogleClick={handleAuthAction}
        onEmailClick={handleAuthAction}
        onLoginClick={handleAuthAction}
      />
      <Footer />
    </main>
    </PageTransition>
  );
};

export default ActivityDetail;
