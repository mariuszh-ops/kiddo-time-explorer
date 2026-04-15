import { useState, useCallback, memo } from "react";
import { cn } from "@/lib/utils";

const CATEGORY_PLACEHOLDER_COLORS: Record<string, string> = {
  "sala-zabaw": "#E91E63",
  "plac-zabaw": "#F59E0B",
  sport: "#10B981",
  zoo: "#22C55E",
  muzeum: "#8B5CF6",
  warsztaty: "#EC4899",
  park: "#14B8A6",
  "park-rozrywki": "#F44336",
  inne: "#6B7280",
};

const DEFAULT_COLOR = "#94A3B8";

export function getCategoryPlaceholderColor(type: string): string {
  return CATEGORY_PLACEHOLDER_COLORS[type] || DEFAULT_COLOR;
}

// Global cache of loaded image URLs to skip placeholder on remount
const loadedImages = new Set<string>();

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  categoryColor?: string;
  onError?: () => void;
}

const LazyImage = memo(({
  src,
  alt,
  className,
  categoryColor = DEFAULT_COLOR,
  onError,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(() => loadedImages.has(src));

  const handleLoad = useCallback(() => {
    loadedImages.add(src);
    setIsLoaded(true);
  }, [src]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Gradient placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${categoryColor}33 0%, ${categoryColor}66 50%, ${categoryColor}33 100%)`,
          }}
        />
      )}
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={onError}
      />
    </div>
  );
});

LazyImage.displayName = "LazyImage";

export default LazyImage;
