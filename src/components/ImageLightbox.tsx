import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
}

const ImageLightbox = ({
  images,
  initialIndex,
  isOpen,
  onClose,
  activityTitle,
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    startIndex: initialIndex 
  });

  // Update carousel when opening with different index
  useEffect(() => {
    if (isOpen && emblaApi) {
      emblaApi.scrollTo(initialIndex, true);
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex, emblaApi]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        scrollNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-foreground/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-background">
        <div className="text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background/10 transition-colors"
          aria-label="Zamknij galerię"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main image area */}
      <div 
        className="flex-1 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((image, index) => (
              <div
                key={index}
                className="flex-none w-full h-full flex items-center justify-center p-4"
              >
                <img
                  src={image}
                  alt={`${activityTitle} - zdjęcie ${index + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollPrev();
              }}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-background/20 hover:bg-background/30 transition-colors",
                currentIndex === 0 && "opacity-50 cursor-not-allowed"
              )}
              disabled={currentIndex === 0}
              aria-label="Poprzednie zdjęcie"
            >
              <ChevronLeft className="w-6 h-6 text-background" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollNext();
              }}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-background/20 hover:bg-background/30 transition-colors",
                currentIndex === images.length - 1 && "opacity-50 cursor-not-allowed"
              )}
              disabled={currentIndex === images.length - 1}
              aria-label="Następne zdjęcie"
            >
              <ChevronRight className="w-6 h-6 text-background" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div 
          className="p-4 flex justify-center gap-2 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                "flex-none w-14 h-10 md:w-16 md:h-12 rounded overflow-hidden border-2 transition-all",
                currentIndex === index
                  ? "border-background ring-1 ring-background"
                  : "border-transparent opacity-50 hover:opacity-80"
              )}
            >
              <img
                src={image}
                alt={`Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
