import { Star, MapPin, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ActivityCardProps {
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  ageRange: string;
  duration: string;
  imageUrl: string;
  tags: string[];
  isIndoor?: boolean;
}

const ActivityCard = ({
  title,
  location,
  rating,
  reviewCount,
  ageRange,
  duration,
  imageUrl,
  tags,
  isIndoor,
}: ActivityCardProps) => {
  return (
    <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow duration-300 border-border">
      {/* Image container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Indoor/Outdoor badge */}
        <Badge 
          variant="secondary" 
          className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-foreground"
        >
          {isIndoor ? "W pomieszczeniu" : "Na zewnątrz"}
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-lg leading-tight mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span>{location}</span>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{ageRange}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{duration}</span>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground text-sm">
            ({reviewCount} opinii rodziców)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityCard;
