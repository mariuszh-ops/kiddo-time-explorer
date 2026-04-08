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

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  // Single image
  if (images.length === 1) {
    return (
      <>
        <div className="md:container md:pt-6">
          <div className="md:rounded-xl overflow-hidden bg-muted">
            <div
              className="aspect-[16/9] max-h-[400px] w-full overflow-hidden cursor-pointer"
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
          </div>
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

  // 2-3 images — carousel
  if (images.length <= 3) {
    return (
      <CarouselGallery
        images={images}
        activityTitle={activityTitle}
        getImageSrc={getImageSrc}
        handleImageError={handleImageError}
        openLightbox={openLightbox}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        lightboxOpen={lightboxOpen}
        setLightboxOpen={setLightboxOpen}
        isMobile={isMobile}
      />
    );
  }

  // 4+ images — Airbnb grid
  return (
    <GridGallery
      images={images}
      activityTitle={activityTitle}
      getImageSrc={getImageSrc}
      handleImageError={handleImageError}
      openLightbox={openLightbox}
      selectedIndex={selectedIndex}
      lightboxOpen={lightboxOpen}
      setLightboxOpen={setLightboxOpen}
    />
  );
};

// --- Carousel for 2-3 images ---
interface CarouselGalleryProps {
  images: string[];
  activityTitle: string;
  getImageSrc: (image: string, index: number) => string;
  handleImageError: (index: number) => void;
  openLightbox: (index: number) => void;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  lightboxOpen: boolean;
  setLightboxOpen: (v: boolean) => void;
  isMobile: boolean;
}

const CarouselGallery = ({
  images, activityTitle, getImageSrc, handleImageError, openLightbox,
  selectedIndex, setSelectedIndex, lightboxOpen, setLightboxOpen, isMobile,
}: CarouselGalleryProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, setSelectedIndex]);

  const scrollTo = useCallback((index: number) => {
    emblaApi?.scrollTo(index);
    setSelectedIndex(index);
  }, [emblaApi, setSelectedIndex]);

  return (
    <>
      <div className="md:container md:pt-6">
        <div className="md:rounded-xl overflow-hidden relative bg-muted">
          <div className="overflow-hidden cursor-pointer touch-pan-y" ref={emblaRef}>
            <div className="flex">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="flex-none w-full aspect-[16/9] max-h-[400px]"
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

          {/* Desktop arrows */}
          <button
            onClick={(e) => { e.stopPropagation(); scrollPrev(); }}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full items-center justify-center shadow-md transition-colors"
            aria-label="Poprzednie zdjęcie"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); scrollNext(); }}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 hover:bg-background rounded-full items-center justify-center shadow-md transition-colors"
            aria-label="Następne zdjęcie"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          {/* Mobile dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); scrollTo(index); }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  selectedIndex === index ? "bg-background w-4" : "bg-background/50"
                )}
                aria-label={`Przejdź do zdjęcia ${index + 1}`}
              />
            ))}
          </div>

          {/* Counter badge desktop */}
          <div className="hidden md:block absolute bottom-4 right-4 bg-foreground/80 text-background px-3 py-1.5 rounded-full text-sm font-medium">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* Thumbnails desktop */}
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

// --- Airbnb-style grid for 4+ images ---
interface GridGalleryProps {
  images: string[];
  activityTitle: string;
  getImageSrc: (image: string, index: number) => string;
  handleImageError: (index: number) => void;
  openLightbox: (index: number) => void;
  selectedIndex: number;
  lightboxOpen: boolean;
  setLightboxOpen: (v: boolean) => void;
}

const GridGallery = ({
  images, activityTitle, getImageSrc, handleImageError, openLightbox,
  selectedIndex, lightboxOpen, setLightboxOpen,
}: GridGalleryProps) => {
  const gridImages = images.slice(0, 5);
  const remainingCount = images.length - 5;

  return (
    <>
      <div className="md:container md:pt-6">
        <div className="md:rounded-xl overflow-hidden bg-muted">
          {/* Mobile: show first image + counter */}
          <div className="md:hidden relative">
            <div
              className="aspect-[16/9] max-h-[400px] w-full cursor-pointer"
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
            <button
              onClick={() => openLightbox(0)}
              className="absolute bottom-3 right-3 bg-background/90 hover:bg-background text-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-md transition-colors"
            >
              Pokaż wszystkie ({images.length})
            </button>
          </div>

          {/* Desktop: Airbnb grid */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-1.5 max-h-[400px]">
            {/* Main large image — spans 2 cols, 2 rows */}
            <div
              className="col-span-2 row-span-2 cursor-pointer overflow-hidden"
              onClick={() => openLightbox(0)}
            >
              <img
                src={getImageSrc(gridImages[0], 0)}
                alt={activityTitle}
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                onError={() => handleImageError(0)}
              />
            </div>
            {/* Right side — up to 4 smaller images */}
            {gridImages.slice(1).map((image, i) => {
              const index = i + 1;
              const isLast = index === gridImages.length - 1 && remainingCount > 0;
              return (
                <div
                  key={index}
                  className="cursor-pointer overflow-hidden relative"
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={getImageSrc(image, index)}
                    alt={`${activityTitle} - zdjęcie ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    onError={() => handleImageError(index)}
                  />
                  {isLast && (
                    <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                      <span className="text-background text-lg font-semibold">
                        +{remainingCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
