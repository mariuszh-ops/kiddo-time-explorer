import { useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageLightbox from "./ImageLightbox";

interface ImageGalleryProps {
  images: string[];
  activityTitle: string;
}

const ImageGallery = ({ images, activityTitle }: ImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Subscribe to scroll events
  useCallback(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

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
          className="h-[50vh] md:h-auto md:aspect-[21/9] w-full overflow-hidden cursor-pointer"
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
        {/* Main carousel */}
        <div 
          className="overflow-hidden cursor-pointer" 
          ref={emblaRef}
        >
          <div className="flex">
            {images.map((image, index) => (
              <div
                key={index}
                className="flex-none w-full h-[50vh] md:h-auto md:aspect-[21/9]"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image}
                  alt={`${activityTitle} - zdjęcie ${index + 1}`}
                  className="w-full h-full object-cover object-top"
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

        {/* Image counter badge */}
        <div className="absolute bottom-4 right-4 bg-foreground/80 text-background px-3 py-1.5 rounded-full text-sm font-medium">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="container py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "flex-none w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden border-2 transition-all",
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
