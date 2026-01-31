import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  ageRange: string;
  matchPercentage: number;
  imageUrl: string;
  tags: string[];
}

const ActivityCard = ({
  title,
  location,
  rating,
  reviewCount,
  ageRange,
  matchPercentage,
  imageUrl,
  tags,
}: ActivityCardProps) => {
  return (
    <article className="group cursor-pointer">
      {/* Image - 16:10 aspect ratio (rectangular, not square) */}
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Match percentage badge */}
        <div className="absolute top-2 right-2">
          <Badge 
            variant="secondary" 
            className="bg-background/90 backdrop-blur-sm text-foreground text-xs font-medium"
          >
            {matchPercentage}% dopasowania
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Rating - MOST PROMINENT */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            ({reviewCount} opinii)
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Location */}
        <p className="text-sm text-muted-foreground line-clamp-1">
          {location}
        </p>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Age range - always first */}
          <Badge 
            variant="outline" 
            className="text-xs font-medium border-primary/30 text-primary"
          >
            {ageRange}
          </Badge>
          
          {/* Other tags */}
          {tags.slice(0, 2).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
};

export default ActivityCard;
