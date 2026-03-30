import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageLightbox from "./ImageLightbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPlaceholderImage } from "@/data/placeholders";

interface ImageGalleryProps {
  images: string[];
  activityTitle: string;
  activityType?: string;
  activityId?: number;
}

const ImageGallery = ({ images, activityTitle, activityType = "inne", activityId = 1 }: ImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const isMobile = useIsMobile();
  const fallbackImage = getPlaceholderImage(activityType, activityId);
  
  const getImageSrc = (image: string, index: number) => {
    return failedImages.has(index) ? fallbackImage : image;
  };

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    dragFree: false,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Subscribe to scroll events
  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on("select", onSelect);
    onSelect(); // Initial call
    
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
      setSelectedIndex(index);
    },
    [emblaApi]
  );

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  // If only one image, show simple view
  if (images.length === 1) {
    return (
      <>
        <div 
          className="h-[30vh] md:h-auto md:aspect-[21/9] w-full overflow-hidden cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <img
            src={getImageSrc(images[0], 0)}
            alt={activityTitle}
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover object-center"
            onError={() => handleImageError(0)}
          />
        </div>
        <ImageLightbox
          images={images}
          initialIndex={0}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          activityTitle={activityTitle}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Main carousel - swipeable on mobile */}
        <div 
          className="overflow-hidden cursor-pointer touch-pan-y" 
          ref={emblaRef}
        >
          <div className="flex">
            {images.map((image, index) => (
              <div
                key={index}
                className="flex-none w-full h-[30vh] md:h-auto md:aspect-[21/9]"
                onClick={() => !isMobile && openLightbox(index)}
              >
                <img
                  src={getImageSrc(image, index)}
                  alt={`${activityTitle} - zdjęcie ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index === 0 ? "high" : undefined}
                  className="w-full h-full object-cover object-center"
                  draggable={false}
                  onError={() => handleImageError(index)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows - desktop only */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            scrollPrev();
          }}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full items-center justify-center shadow-md transition-colors"
          aria-label="Poprzednie zdjęcie"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            scrollNext();
          }}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full items-center justify-center shadow-md transition-colors"
          aria-label="Następne zdjęcie"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>

        {/* Dot indicators for mobile */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:hidden">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                scrollTo(index);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                selectedIndex === index
                  ? "bg-background w-4"
                  : "bg-background/50"
              )}
              aria-label={`Przejdź do zdjęcia ${index + 1}`}
            />
          ))}
        </div>

        {/* Image counter badge - desktop only */}
        <div className="hidden md:block absolute bottom-4 right-4 bg-foreground/80 text-background px-3 py-1.5 rounded-full text-sm font-medium">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail strip - desktop only, positioned above content card */}
      <div className="hidden md:block relative z-20 bg-background container py-3 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "flex-none w-20 h-14 rounded-lg overflow-hidden border-2 transition-all",
                selectedIndex === index
                  ? "border-primary ring-1 ring-primary"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={getImageSrc(image, index)}
                alt={`Miniatura ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={() => handleImageError(index)}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        activityTitle={activityTitle}
      />
    </>
  );
};

export default ImageGallery;
