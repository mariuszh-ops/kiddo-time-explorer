import ActivityCard from "@/components/ActivityCard";

// Mock data for activities
const mockActivities = [
  {
    id: 1,
    title: "Zoo Warszawa – spotkanie z egzotycznymi zwierzętami",
    location: "Warszawa, Praga-Południe",
    rating: 4.7,
    reviewCount: 328,
    ageRange: "2-12 lat",
    duration: "2-4 godz.",
    imageUrl: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&auto=format&fit=crop",
    tags: ["Zoo", "Zwierzęta"],
    isIndoor: false,
  },
  {
    id: 2,
    title: "Centrum Nauki Kopernik – interaktywne wystawy",
    location: "Warszawa, Śródmieście",
    rating: 4.9,
    reviewCount: 512,
    ageRange: "4-14 lat",
    duration: "3-5 godz.",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop",
    tags: ["Muzeum", "Edukacja"],
    isIndoor: true,
  },
  {
    id: 3,
    title: "Ogród Botaniczny – spacer wśród natury",
    location: "Kraków, Podgórze",
    rating: 4.5,
    reviewCount: 189,
    ageRange: "0-10 lat",
    duration: "1-2 godz.",
    imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop",
    tags: ["Park", "Natura"],
    isIndoor: false,
  },
  {
    id: 4,
    title: "Sala zabaw Kraina Malucha",
    location: "Wrocław, Stare Miasto",
    rating: 4.6,
    reviewCount: 245,
    ageRange: "1-6 lat",
    duration: "2-3 godz.",
    imageUrl: "https://images.unsplash.com/photo-1566454725588-b92fe3dd96f7?w=800&auto=format&fit=crop",
    tags: ["Plac zabaw", "Dla maluchów"],
    isIndoor: true,
  },
  {
    id: 5,
    title: "Warsztaty ceramiczne dla dzieci",
    location: "Gdańsk, Oliwa",
    rating: 4.8,
    reviewCount: 156,
    ageRange: "5-12 lat",
    duration: "1.5-2 godz.",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop",
    tags: ["Warsztaty", "Kreatywność"],
    isIndoor: true,
  },
  {
    id: 6,
    title: "Park linowy Adventure Park",
    location: "Poznań, Jeżyce",
    rating: 4.4,
    reviewCount: 203,
    ageRange: "6-14 lat",
    duration: "2-3 godz.",
    imageUrl: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&auto=format&fit=crop",
    tags: ["Sport", "Przygoda"],
    isIndoor: false,
  },
];

const ActivityGrid = () => {
  return (
    <section className="bg-background py-8 md:py-12">
      <div className="container">
        {/* Section header */}
        <div className="mb-6 md:mb-8">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
            Popularne w Twojej okolicy
          </h2>
          <p className="text-muted-foreground">
            Sprawdzone przez innych rodziców
          </p>
        </div>

        {/* Activity cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockActivities.map((activity) => (
            <ActivityCard key={activity.id} {...activity} />
          ))}
        </div>

        {/* Load more */}
        <div className="mt-8 text-center">
          <button className="text-primary font-medium hover:underline underline-offset-4 transition-all">
            Zobacz więcej atrakcji →
          </button>
        </div>
      </div>
    </section>
  );
};

export default ActivityGrid;
