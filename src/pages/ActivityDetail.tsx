import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
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
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockActivities } from "@/data/activities";
import { useState } from "react";
import ReviewsModal from "@/components/ReviewsModal";

// Extended activity data for detail page
const activityDetails: Record<number, {
  estimatedTime: string;
  priceRange: string;
  activityTypes: string[];
  experiencePoints: string[];
  openingHours: string;
  address: string;
  ticketSources: { name: string; url: string }[];
  reviews: { author: string; rating: number; text: string; date: string }[];
}> = {
  1: {
    estimatedTime: "2–3 godziny",
    priceRange: "$$",
    activityTypes: ["Edukacyjne", "Na zewnątrz"],
    experiencePoints: [
      "Dzieci obserwują zwierzęta z różnych kontynentów w naturalnych wybiegach",
      "Rodzice mogą skorzystać z interaktywnych tablic edukacyjnych przy każdym wybiegu",
      "Dostępna jest strefa malucha z łagodnymi zwierzętami do głaskania",
      "Na terenie znajdują się place zabaw i strefy piknikowe",
    ],
    openingHours: "Pon–Nd: 9:00–18:00",
    address: "ul. Ratuszowa 1/3, 03-461 Warszawa",
    ticketSources: [
      { name: "Strona organizatora", url: "#" },
      { name: "Bilety24", url: "#" },
    ],
    reviews: [
      { author: "Anna M.", rating: 5, text: "Świetne miejsce dla całej rodziny. Dzieci były zachwycone wybiegiem słoni.", date: "2 tygodnie temu" },
      { author: "Tomek K.", rating: 5, text: "Dużo cienia, ławki do odpoczynku. Można spędzić cały dzień.", date: "1 miesiąc temu" },
      { author: "Ewa S.", rating: 4, text: "Fajnie, choć w weekendy bardzo tłoczno. Polecam przyjść w tygodniu.", date: "2 miesiące temu" },
    ],
  },
};

// Default details for activities without specific data
const defaultDetails = {
  estimatedTime: "1–2 godziny",
  priceRange: "$",
  activityTypes: ["Rodzinne"],
  experiencePoints: [
    "Aktywność dostosowana do różnych grup wiekowych",
    "Bezpieczna przestrzeń dla dzieci pod okiem rodziców",
    "Możliwość wspólnej zabawy całą rodziną",
  ],
  openingHours: "Sprawdź na stronie organizatora",
  address: "Sprawdź dokładny adres na stronie organizatora",
  ticketSources: [
    { name: "Strona organizatora", url: "#" },
  ],
  reviews: [
    { author: "Rodzic", rating: 4, text: "Polecam rodzinom z dziećmi. Spędziliśmy miło czas.", date: "Niedawno" },
  ],
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
  const { id } = useParams<{ id: string }>();
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
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
  const averageRating = details.reviews.reduce((sum, r) => sum + r.rating, 0) / details.reviews.length;

  return (
    <main className="min-h-screen bg-background pb-8">
      {/* Back navigation */}
      <nav className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-3 flex items-center gap-3">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Wróć do listy</span>
          </Link>
        </div>
      </nav>

      {/* 1. Header section */}
      <section className="relative">
        {/* Hero image */}
        <div className="aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content overlay on mobile, below on desktop */}
        <div className="container">
          <div className="relative -mt-16 md:-mt-24 bg-background rounded-t-2xl md:rounded-2xl p-6 md:p-8 shadow-soft">
            {/* Rating badge - top right */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6">
              <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Star className="w-5 h-5 fill-primary text-primary" />
                <span className="font-bold text-foreground">{activity.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Activity name & location */}
            <h1 className="text-2xl md:text-3xl font-serif text-foreground pr-20 mb-2">
              {activity.title}
            </h1>
            <p className="text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 inline-block mr-1" />
              {activity.location}
            </p>
            
            {/* Review count */}
            <p className="text-sm text-muted-foreground mb-6">
              {activity.reviewCount} opinii rodziców
            </p>

            {/* Primary action */}
            <Button 
              onClick={() => setIsFavorite(!isFavorite)}
              variant={isFavorite ? "default" : "outline"}
              className="w-full md:w-auto"
            >
              <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "W ulubionych" : "Dodaj do ulubionych"}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Key facts section */}
      <section className="container mt-6">
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Podstawowe informacje
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Age range */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wiek</p>
                <p className="text-sm font-medium text-foreground">{activity.ageRange}</p>
              </div>
            </div>

            {/* Indoor/Outdoor */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent rounded-lg">
                {activity.isIndoor ? (
                  <Home className="w-5 h-5 text-accent-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-accent-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lokalizacja</p>
                <p className="text-sm font-medium text-foreground">
                  {activity.isIndoor ? "W pomieszczeniu" : "Na zewnątrz"}
                </p>
              </div>
            </div>

            {/* Estimated time */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Clock className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Czas</p>
                <p className="text-sm font-medium text-foreground">{details.estimatedTime}</p>
              </div>
            </div>

            {/* Activity type */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent rounded-lg">
                {(() => {
                  const IconComponent = getActivityTypeIcon(details.activityTypes[0]);
                  return <IconComponent className="w-5 h-5 text-accent-foreground" />;
                })()}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Typ</p>
                <p className="text-sm font-medium text-foreground">{details.activityTypes[0]}</p>
              </div>
            </div>

            {/* Price range */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Ticket className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cena</p>
                <p className="text-sm font-medium text-foreground">{details.priceRange}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Experience overview */}
      <section className="container mt-6">
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Co Was czeka
          </h2>
          <ul className="space-y-3">
            {details.experiencePoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <p className="text-foreground text-sm leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Practical information */}
      <section className="container mt-6">
        <div className="bg-card rounded-xl p-5 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Informacje praktyczne
          </h2>
          
          <div className="space-y-4">
            {/* Opening hours */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Godziny otwarcia</p>
                <p className="text-sm text-foreground">{details.openingHours}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Adres</p>
                <p className="text-sm text-foreground">{details.address}</p>
                <a 
                  href="#" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Sprawdź trasę w Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Ticket sources */}
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Kup bilety</p>
                <div className="flex flex-wrap gap-2">
                  {details.ticketSources.map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-full hover:bg-secondary/80 transition-colors"
                    >
                      {source.name}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Reviews preview */}
      <section className="container mt-6">
        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opinie rodziców
            </h2>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({details.reviews.length})</span>
            </div>
          </div>

          {/* Review cards */}
          <div className="space-y-4 mb-4">
            {details.reviews.slice(0, 3).map((review, index) => (
              <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-sm font-medium text-accent-foreground">
                        {review.author.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{review.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
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
                <p className="text-sm text-foreground leading-relaxed">{review.text}</p>
                <p className="text-xs text-muted-foreground mt-1">{review.date}</p>
              </div>
            ))}
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setIsReviewsModalOpen(true)}
          >
            Zobacz wszystkie opinie
          </Button>
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
    </main>
  );
};

export default ActivityDetail;
