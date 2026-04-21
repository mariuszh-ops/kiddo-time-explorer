export interface Amenity {
  id: string;
  label: string;
  icon: string;
  category: "access" | "comfort" | "food" | "safety";
}

export const AMENITIES: Amenity[] = [
  // Dostępność
  { id: "stroller", label: "Wózki OK", icon: "Baby", category: "access" },
  { id: "parking", label: "Parking", icon: "Car", category: "access" },
  { id: "accessible", label: "Dla niepełnosprawnych", icon: "Accessibility", category: "access" },
  { id: "public-transport", label: "Dobry dojazd komunikacją", icon: "Bus", category: "access" },

  // Komfort
  { id: "changing-table", label: "Przewijalnia", icon: "BabyIcon", category: "comfort" },
  { id: "toilets", label: "Toalety", icon: "Bath", category: "comfort" },
  { id: "shade", label: "Cień / zadaszenie", icon: "Umbrella", category: "comfort" },
  { id: "seating", label: "Ławki / miejsca do siedzenia", icon: "Armchair", category: "comfort" },
  { id: "wifi", label: "WiFi", icon: "Wifi", category: "comfort" },

  // Jedzenie
  { id: "food-onsite", label: "Jedzenie na miejscu", icon: "UtensilsCrossed", category: "food" },
  { id: "picnic-area", label: "Miejsce na piknik", icon: "TreePine", category: "food" },
  { id: "kids-menu", label: "Menu dziecięce", icon: "CookingPot", category: "food" },

  // Bezpieczeństwo
  { id: "fenced", label: "Ogrodzone / bezpieczne", icon: "ShieldCheck", category: "safety" },
  { id: "playground", label: "Plac zabaw na miejscu", icon: "Blocks", category: "safety" },
  { id: "first-aid", label: "Punkt pierwszej pomocy", icon: "Cross", category: "safety" },
];

export const getAmenityById = (id: string): Amenity | undefined =>
  AMENITIES.find((a) => a.id === id);
