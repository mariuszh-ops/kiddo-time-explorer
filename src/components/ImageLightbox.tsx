import { useState, useCallback, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { getReturnFocusTarget, restoreFocus } from "@/lib/returnFocus";


interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  activityTitle: string;
  activityCity?: string;
}

const makeAlt = (title: string, index: number, total: number) => {
  return `${title} — zdjęcie ${index + 1} z ${total}`;
};

const ImageLightbox = ({
  images,
  initialIndex,
  isOpen,
  onClose,
  activityTitle,
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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

  // Strzalki przegladaja galerie. Escape, pulapke fokusu i blokade scrolla
  // obsluguje juz Radix Dialog (K-01).
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/95" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col focus:outline-none"
          aria-modal="true"
          onKeyDown={handleKeyDown}
          onClick={onClose}
          onOpenAutoFocus={(event) => {
            // Fokus ma wejsc do dialogu na przycisk zamykania, nie zostac na <body>.
            event.preventDefault();
            closeButtonRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            // Powrot na element, ktory galerie otworzyl (zdjecie / miniatura).
            if (restoreFocus(getReturnFocusTarget())) event.preventDefault();
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {`Galeria zdjęć: ${activityTitle}`}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Zdjęcia atrakcji. Klawisz Escape zamyka galerię.
          </DialogPrimitive.Description>

          {/* Header — klik w tlo (poza zdjeciem i miniaturami) zamyka galerie, jak przed zmiana. */}
          <div className="flex items-center justify-between p-4 text-background">
            <div className="text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-background/10 transition-colors"
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
                    {failedImages.has(index) ? (
                      <div className="flex flex-col items-center justify-center text-background/70">
                        <Camera className="w-12 h-12 mb-2" aria-hidden="true" />
                        <span className="text-sm">Brak zdjęcia</span>
                      </div>
                    ) : (
                      <img
                        src={image}
                        alt={makeAlt(activityTitle, index, images.length)}
                        className="max-w-full max-h-full object-contain"
                        onError={() => setFailedImages(prev => new Set(prev).add(index))}
                      />
                    )}
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
                  aria-label={`Pokaż zdjęcie ${index + 1} z ${images.length}`}
                  aria-current={currentIndex === index ? "true" : undefined}
                >
                  <img
                    src={image}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ImageLightbox;
