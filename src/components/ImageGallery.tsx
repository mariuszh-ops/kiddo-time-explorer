import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageLightbox from "./ImageLightbox";
import { useIsMobile } from "@/hooks/use-mobile";

interface ImageGalleryProps {
  images: string[];
  activityTitle: string;
}

const ImageGallery = ({ images, activityTitle }: ImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isMobile = useIsMobile();
  
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
          className="h-[40vh] md:h-auto md:aspect-[21/9] w-full overflow-hidden cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0]}
            alt={activityTitle}
            className="w-full h-full object-cover object-top"
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
                className="flex-none w-full h-[40vh] md:h-auto md:aspect-[21/9]"
                onClick={() => !isMobile && openLightbox(index)}
              >
                <img
                  src={image}
                  alt={`${activityTitle} - zdjęcie ${index + 1}`}
                  className="w-full h-full object-cover object-top"
                  draggable={false}
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

      {/* Thumbnail strip - desktop only */}
      <div className="hidden md:block container py-3">
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
                src={image}
                alt={`Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
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
