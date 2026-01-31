// Placeholder images for activities by category
// These are locally generated images for MVP mock data

import zoo1 from "@/assets/placeholders/zoo-1.jpg";
import zoo2 from "@/assets/placeholders/zoo-2.jpg";
import museum1 from "@/assets/placeholders/museum-1.jpg";
import museum2 from "@/assets/placeholders/museum-2.jpg";
import playgroundIndoor1 from "@/assets/placeholders/playground-indoor-1.jpg";
import playgroundOutdoor1 from "@/assets/placeholders/playground-outdoor-1.jpg";
import park1 from "@/assets/placeholders/park-1.jpg";
import park2 from "@/assets/placeholders/park-2.jpg";
import sport1 from "@/assets/placeholders/sport-1.jpg";
import sport2 from "@/assets/placeholders/sport-2.jpg";
import sport3 from "@/assets/placeholders/sport-3.jpg";
import workshop1 from "@/assets/placeholders/workshop-1.jpg";
import workshop2 from "@/assets/placeholders/workshop-2.jpg";
import workshop3 from "@/assets/placeholders/workshop-3.jpg";
import workshopRobotics from "@/assets/placeholders/workshop-robotics.jpg";
import theater1 from "@/assets/placeholders/theater-1.jpg";
import cinema1 from "@/assets/placeholders/cinema-1.jpg";
import beach1 from "@/assets/placeholders/beach-1.jpg";
import garden1 from "@/assets/placeholders/garden-1.jpg";
import adventurePark from "@/assets/placeholders/adventure-park.jpg";
import miniGolf from "@/assets/placeholders/mini-golf.jpg";
import bowling from "@/assets/placeholders/bowling.jpg";
import library from "@/assets/placeholders/library.jpg";
import boatRide from "@/assets/placeholders/boat-ride.jpg";

// Category-based placeholder images
export const placeholderImages = {
  zoo: [zoo1, zoo2],
  muzeum: [museum1, museum2],
  "plac-zabaw": [playgroundIndoor1, playgroundOutdoor1],
  park: [park1, park2, garden1],
  sport: [sport1, sport2, sport3, adventurePark, miniGolf, bowling],
  warsztaty: [workshop1, workshop2, workshop3, workshopRobotics],
  inne: [theater1, cinema1, library, boatRide, beach1],
};

// Get a placeholder image for an activity based on its type and id
export function getPlaceholderImage(type: string, id: number): string {
  const images = placeholderImages[type as keyof typeof placeholderImages] || placeholderImages.inne;
  // Use id to deterministically pick an image to avoid same images for same type
  return images[id % images.length];
}

// Get multiple placeholder images for gallery
export function getPlaceholderGallery(type: string, id: number, count: number = 5): string[] {
  const allImages = [
    ...placeholderImages.zoo,
    ...placeholderImages.muzeum,
    ...placeholderImages["plac-zabaw"],
    ...placeholderImages.park,
    ...placeholderImages.sport,
    ...placeholderImages.warsztaty,
    ...placeholderImages.inne,
  ];
  
  // Get primary image from category
  const primaryImages = placeholderImages[type as keyof typeof placeholderImages] || placeholderImages.inne;
  const primary = primaryImages[id % primaryImages.length];
  
  // Fill remaining slots with diverse images, avoiding duplicates
  const gallery: string[] = [primary];
  let offset = id;
  
  while (gallery.length < count) {
    const candidate = allImages[offset % allImages.length];
    if (!gallery.includes(candidate)) {
      gallery.push(candidate);
    }
    offset++;
    // Prevent infinite loop
    if (offset > id + allImages.length * 2) break;
  }
  
  return gallery;
}

export {
  zoo1, zoo2,
  museum1, museum2,
  playgroundIndoor1, playgroundOutdoor1,
  park1, park2,
  sport1, sport2, sport3,
  workshop1, workshop2, workshop3, workshopRobotics,
  theater1, cinema1, beach1, garden1,
  adventurePark, miniGolf, bowling, library, boatRide,
};
