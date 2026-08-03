import { Skeleton } from "@/components/ui/skeleton";

// Wymiary 1:1 z ActivityCard (aspect-[16/10] + mb-3 + space-y-2),
// dzięki czemu wymiana skeletonu na prawdziwe karty nie przesuwa layoutu (CLS).
const ActivityCardSkeleton = () => {
  return (
    <article className="rounded-xl" aria-hidden="true">
      {/* Obraz — ta sama proporcja i margines co w karcie */}
      <Skeleton className="aspect-[16/10] rounded-xl mb-3" />

      <div className="space-y-2">
        {/* Ocena (badge h-7 + liczba opinii) */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Tytuł — 2 wiersze leading-snug */}
        <Skeleton className="h-[22px] w-full" />
        <Skeleton className="h-[22px] w-3/4" />

        {/* Kategoria */}
        <Skeleton className="h-5 w-24" />

        {/* Lokalizacja */}
        <Skeleton className="h-5 w-2/3" />

        {/* Badge'y */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-[22px] w-20 rounded-md" />
          <Skeleton className="h-[22px] w-16 rounded-md" />
        </div>
      </div>
    </article>
  );
};

export const ActivityGridSkeleton = ({ count = 12 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ActivityCardSkeleton key={i} />
    ))}
  </div>
);

export default ActivityCardSkeleton;
