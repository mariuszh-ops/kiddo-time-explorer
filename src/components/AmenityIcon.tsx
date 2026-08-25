import {
  Baby,
  Car,
  Accessibility,
  Bus,
  Bath,
  Umbrella,
  Armchair,
  Wifi,
  UtensilsCrossed,
  TreePine,
  CookingPot,
  ShieldCheck,
  Blocks,
  Cross,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Baby,
  BabyIcon: Baby,
  Car,
  Accessibility,
  Bus,
  Bath,
  Umbrella,
  Armchair,
  Wifi,
  UtensilsCrossed,
  TreePine,
  CookingPot,
  ShieldCheck,
  Blocks,
  Cross,
};

interface AmenityIconProps extends LucideProps {
  name: string;
}

const AmenityIcon = ({ name, ...props }: AmenityIconProps) => {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon aria-hidden="true" focusable="false" {...props} />;
};

export default AmenityIcon;
