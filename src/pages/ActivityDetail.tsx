import { trackEvent } from "@/lib/analytics";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { cityLabels } from "@/data/categoryPages";
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
  ChevronRight,
  Check,
  MessageSquarePlus,
  Calendar,
  Camera,
  MapPinned,
  Info,
  Share2,
  Wallet,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getActivities, PRICE_LEVELS } from "@/data/activities";
import type { Activity } from "@/data/activities";
import { fetchActivityBySlug } from "@/hooks/useActivities";
import SimilarAttractions from "@/components/SimilarAttractions";
import CommunityNotice from "@/components/CommunityNotice";
import { getAmenityById } from "@/data/amenities";
import AmenityIcon from "@/components/AmenityIcon";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import ReviewsModal from "@/components/ReviewsModal";
import ReviewsSection from "@/components/ReviewsSection";
import ActivityCard from "@/components/ActivityCard";
import RatingHistogram from "@/components/RatingHistogram";
import ImageGallery from "@/components/ImageGallery";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import InlineRatingAction from "@/components/InlineRatingAction";
import OpeningHoursDisplay from "@/components/OpeningHoursDisplay";
import ActivityDetailSkeleton from "@/components/ActivityDetailSkeleton";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedActivities } from "@/contexts/SavedActivitiesContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useShare } from "@/hooks/useShare";
import { FEATURES } from "@/lib/featureFlags";
import { motion, AnimatePresence } from "framer-motion";

// Default fallback values for activities without specific data
const defaultExperiencePoints = [
  "Aktywność dostosowana do różnych grup wiekowych",
  "Bezpieczna przestrzeń dla dzieci pod okiem rodziców",
  "Możliwość wspólnej zabawy całą rodziną",
];

const anonymizeAuthor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

const TYPE_LABELS: Record<string, string> = {
  "sala-zabaw": "Sala zabaw",
  "plac-zabaw": "Plac zabaw",
  "park-rozrywki": "Park rozrywki",
  "centra-rozrywki": "Centrum rozrywki",
  "muzeum-teatr": "Muzeum / teatr",
  "sport": "Sport",
  "zoo": "Zoo",
  "inne": "Atrakcja",
};

const formatReviewCount = (count: number): string => {
  const formatted = new Intl.NumberFormat("pl-PL").format(count);
  const suffix = count === 1
    ? "opinia"
    : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)
      ? "opinie"
      : "opinii";
  return `${formatted} ${suffix}`;
};

const getActivityTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "edukacyjne": return Brain;
    case "aktywne": return Zap;
    case "kreatywne": return Sparkles;
    default: return Star;
  }
};

const ActivityDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<'favorite' | 'visit' | null>(null);
  const [saveError, setSaveError] = useState<'favorite' | 'visit' | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const isMobile = useIsMobile();
  const galleryRef = useRef<HTMLElement>(null);
  
  // Use auth context
  const { isLoggedIn, login } = useAuth();
  
  // Use saved activities context
  const { 
    isFavorite: checkIsFavorite, 
    isWantToVisit: checkIsWantToVisit,
    toggleFavorite,
    toggleWantToVisit 
  } = useSavedActivities();
  
  const { share } = useShare();

  // Pobieramy pojedynczy rekord po slug bezpośrednio z Supabase — bez lookupu
  // w globalnej liście. Lista może być pusta na pierwszym wejściu.
  const [activity, setActivity] = useState<Activity | null>(null);
  const [detailStatus, setDetailStatus] = useState<"loading" | "success" | "not-found" | "error">("loading");

  useEffect(() => {
    if (!slug) { setDetailStatus("not-found"); return; }
    let cancelled = false;
    setDetailStatus("loading");
    setActivity(null);
    (async () => {
      // Najpierw sprawdź cache in-memory, żeby uniknąć zbędnego round-tripu
      const cached = getActivities().find((a) => a.slug === slug);
      if (cached) {
        if (!cancelled) { setActivity(cached); setDetailStatus("success"); }
        return;
      }
      try {
        const row = await fetchActivityBySlug(slug);
        if (cancelled) return;
        if (!row) { setDetailStatus("not-found"); return; }
        setActivity(row);
        setDetailStatus("success");
      } catch (e) {
        if (!cancelled) setDetailStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const activitiesLoaded = detailStatus !== "loading";
  const activityId = activity?.id ?? 0;
  const isFavorite = checkIsFavorite(activityId);
  const wantToVisit = checkIsWantToVisit(activityId);

  // Scroll to top on mount; on mobile, position title card nicely
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Sticky header on scroll past gallery
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [slug]);

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
      
      trackEvent("favorite_toggle", { activityId, state: newState ? "add" : "remove" });
      
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

  const handleShare = async () => {
    if (!activity) return;
    const result = await share({
      title: activity.title,
      text: `Sprawdź "${activity.title}" na FamilyFun — ${activity.location}`,
      url: window.location.href,
    });
    if (result) {
      trackEvent("share", { activityId: activity.id, channel: result });
    }
    if (result === 'clipboard') {
      toast.success("Link skopiowany do schowka", { duration: 2000 });
    }
  };


  // activity lookup moved above
  
  // Activities still loading → mirror final layout with a skeleton (no white screen, no jump).
  if (!activitiesLoaded) {
    return <ActivityDetailSkeleton />;
  }

  // Activities loaded but slug doesn't match → real 404, do not loop on the skeleton.
  if (!activity) {
    return <NotFound />;
  }

  const details = {
    estimatedTime: activity.estimatedTime || "1–2 godziny",
    priceRange: activity.priceRange || "$",
    activityTypes: activity.tags.length > 0 ? activity.tags : ["Rodzinne"],
    experiencePoints: activity.experiencePoints || defaultExperiencePoints,
    openingHours: activity.openingHours,
    address: activity.address,
    website: activity.website,
    reviews: activity.reviews || [],
  };
  const hasReviews = activity.reviewCount > 0;
  const averageRating = details.reviews.length > 0 
    ? details.reviews.reduce((sum, r) => sum + r.rating, 0) / details.reviews.length
    : 0;

  // Ujednolicony format oceny — spójny z ActivityCard.
  const displayRating = activity.google_rating ?? (activity.rating > 0 ? activity.rating : null);
  const displayReviewCount = activity.google_review_count ?? (activity.reviewCount > 0 ? activity.reviewCount : null);

  const typeLabel = TYPE_LABELS[activity.type] || "Atrakcja";
  const cityLabel = cityLabels[activity.city]?.nominative || activity.city;
  const cityLocative = cityLabels[activity.city]?.locative || `w ${cityLabel}`;
  const seoTitle = `${activity.title} — ${typeLabel} ${cityLocative}`;
  const fallbackDescription = `${typeLabel} ${cityLocative} — sprawdź godziny otwarcia i opinie rodziców.`;
  const activityDescription = activity.description?.trim() || fallbackDescription;
  const seoDescription = displayRating != null && displayReviewCount != null
    ? `${typeLabel} ${cityLocative}. Ocena ${displayRating.toFixed(1)}/5 (${formatReviewCount(displayReviewCount)}).`
    : `${typeLabel} ${cityLocative}. Sprawdź godziny otwarcia, adres i opinie rodziców.`;
  
  // Number of reviews to show initially (1-2 on mobile)
  const initialReviewCount = isMobile ? 2 : 3;

  return (
    <PageTransition>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        path={`/atrakcje/${activity.city}/${activity.slug}`}
        image={activity.imageUrl}
        type="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            "name": activity.title,
            "description": activity.experiencePoints?.join(". ") || activity.title,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": activity.address || "",
              "addressLocality": activity.city,
              "addressCountry": "PL",
            },
            ...(activity.reviewCount > 0 ? {
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": activity.rating,
                "reviewCount": activity.reviewCount,
                "bestRating": "5",
              },
            } : {}),
            "audience": {
              "@type": "PeopleAudience",
              "suggestedMinAge": activity.ageMin,
              "suggestedMaxAge": activity.ageMax,
            },
            ...(activity.openingHours ? { "openingHours": activity.openingHours } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Strona główna", "item": "https://familyfun.pl/" },
              { "@type": "ListItem", "position": 2, "name": cityLabels[activity.city]?.nominative || activity.city, "item": `https://familyfun.pl/atrakcje/${activity.city}` },
              { "@type": "ListItem", "position": 3, "name": activity.title },
            ],
          },
        ] as unknown as Record<string, unknown>}
      />
      <main className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Global header — same on mobile and desktop */}
      <Header />

      {/* Sticky header on scroll past gallery */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-background border-b border-border/60 transition-opacity duration-300",
          showStickyHeader ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="container flex items-center justify-between h-12 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="shrink-0 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              aria-label="Wróć"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <div className="min-w-0 flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate max-w-[40ch]">
                {activity.title}
              </p>
              {displayRating != null && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="text-xs text-muted-foreground">{displayRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              onClick={handleWantToVisitClick}
              size="sm"
              variant={wantToVisit ? "default" : "default"}
              className="h-9 px-3 text-xs sm:text-sm"
              disabled={isProcessing !== null}
            >
              {wantToVisit ? (
                <><Check className="w-3.5 h-3.5 mr-1" />Na liście</>
              ) : (
                "Chcę odwiedzić"
              )}
            </Button>
            <button
              onClick={handleFavoriteClick}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              aria-label={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
            >
              <Heart className={cn(
                "w-5 h-5 transition-colors",
                isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
              )} />
            </button>
            <button
              onClick={handleShare}
              className="hidden sm:flex w-9 h-9 rounded-full hover:bg-muted items-center justify-center transition-colors"
              aria-label="Udostępnij"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: Back & Share button overlay on gallery */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-20 p-4 flex justify-between">
        <button
          onClick={handleBack}
          className="w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="Wróć"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={handleShare}
          className="w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="Udostępnij"
        >
          <Share2 className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* 1. Header section with gallery */}
      <section ref={galleryRef} className="relative">
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
            {/* Desktop: Breadcrumbs */}
            <nav className="hidden md:flex items-center gap-1.5 text-sm mb-4" aria-label="breadcrumb">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Strona główna</Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <Link to={`/atrakcje/${activity.city}`} className="text-muted-foreground hover:text-foreground transition-colors">
                {cityLabels[activity.city]?.nominative || activity.city}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium truncate max-w-[300px]">{activity.title}</span>
            </nav>
            
            {/* Activity title + Google rating inline */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-1 md:mb-2">
              <h1 className="text-xl md:text-3xl font-serif text-foreground leading-tight">
                {activity.title}
              </h1>
              {displayRating != null && (
                <div className="shrink-0 flex items-center gap-1.5 sm:flex-col sm:items-end sm:gap-0.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-primary text-primary" />
                    <span className="text-sm sm:text-lg font-bold text-foreground">{displayRating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground sm:text-foreground">
                    ·{" "}
                    {displayReviewCount != null ? formatReviewCount(displayReviewCount) : "brak opinii"}
                  </span>
                  <span className="text-xs text-muted-foreground">· Google</span>
                </div>
              )}
            </div>

            {FEATURES.RECOMMENDED_BADGE && activity.isRecommended && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg mb-3">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                <span className="text-xs font-medium text-primary">Polecane przez FamilyFun</span>
              </div>
            )}
            
            {/* Location */}
            <p className="text-sm md:text-base text-muted-foreground mb-3 flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="line-clamp-1">{activity.location}</span>
            </p>

            {/* Description (fallback z typu + miasta gdy null) */}
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed mb-3">
              {activityDescription}
            </p>

            {activity.uncertain && (
              <div
                role="note"
                className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2 mb-3"
              >
                <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Ta atrakcja została zaklasyfikowana automatycznie — daj znać, jeśli coś się nie zgadza.
                </span>
              </div>
            )}

            {/* Rating action — directly under address */}
            <InlineRatingAction 
              activityId={activityId} 
              onAuthRequired={() => setIsAuthModalOpen(true)}
            />

            {/* Separator between rating and action buttons */}
            <div className="border-t border-border/40 my-1" />

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
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size={isMobile ? "lg" : "default"}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Udostępnij
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

              {/* Rating action moved to dual-column section above */}
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


            {/* Inline amenities for 1-2 items */}
            {activity.amenities && activity.amenities.length > 0 && activity.amenities.length <= 2 && (
              activity.amenities.map((amenityId) => {
                const amenity = getAmenityById(amenityId);
                if (!amenity) return null;
                return (
                  <div key={amenityId} className="flex items-center gap-2.5">
                    <div className="p-2 bg-accent rounded-lg shrink-0">
                      <AmenityIcon name={amenity.icon} className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-xs text-muted-foreground">Udogodnienie</p>
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">{amenity.label}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Amenities section — only for 3+ amenities */}
      {activity.amenities && activity.amenities.length >= 3 && (
        <section className="container mt-5 md:mt-6">
          <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 md:mb-4">
              Udogodnienia dla rodzin
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
              {activity.amenities.map((amenityId) => {
                const amenity = getAmenityById(amenityId);
                if (!amenity) return null;
                return (
                  <div key={amenityId} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-accent/50 min-w-0">
                    <AmenityIcon name={amenity.icon} className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground truncate">{amenity.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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
            {activity.openingHours && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Godziny otwarcia</p>
                  <OpeningHoursDisplay hours={details.openingHours} />
                </div>
              </div>
            )}

            {/* Address */}
            {activity.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Adres</p>
                  <p className="text-sm text-foreground">{details.address}</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary active:opacity-70 inline-flex items-center gap-1 mt-1"
                  >
                    Otwórz w Mapach
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Ticket / Website sources */}
            {details.website && (
              <div className="flex items-start gap-3">
                <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-1.5">Strona organizatora</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded-full active:opacity-70 transition-opacity"
                    >
                      Otwórz stronę
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Phone */}
            {activity.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Telefon</p>
                  <a
                    href={`tel:${activity.phone.replace(/\s+/g, "")}`}
                    className="text-sm text-primary active:opacity-70"
                  >
                    {activity.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Price details */}
            {activity.priceNote && (
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Cennik orientacyjny</p>
                  <p className="text-sm text-foreground">{activity.priceNote}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ceny mogą ulec zmianie — sprawdź aktualny cennik na stronie organizatora</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Reviews section — FamilyFun user reviews + Google */}
      <ReviewsSection
        placeId={activity.place_id}
        googleReviews={details.reviews}
        averageRating={displayRating}
        totalReviewCount={displayReviewCount}
        onAuthRequired={() => setIsAuthModalOpen(true)}
      />

      {/* 7. User photos section — only when feature enabled */}
      {FEATURES.UGC_PHOTOS && (
        <section className="container mt-5 md:mt-6">
          <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 md:mb-4">
              Zdjęcia rodziców
            </h2>
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-accent rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-accent-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">
                Byłeś tu z dzieckiem?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Podziel się zdjęciem z wizyty — pomóż innym rodzicom!
              </p>
              <Button variant="outline" disabled className="gap-2">
                <Camera className="w-4 h-4" />
                Dodaj zdjęcie (wkrótce)
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 7.5 Community notice */}
      <section className="container mt-5 md:mt-6">
        <CommunityNotice activityTitle={activity.title} />
      </section>

      {/* 8. Similar activities */}
      <SimilarAttractions activity={activity} />

      <ReviewsModal 
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        reviews={details.reviews}
        activityName={activity.title}
        averageRating={averageRating}
      />

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
