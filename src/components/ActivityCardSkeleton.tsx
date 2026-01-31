import { Skeleton } from "@/components/ui/skeleton";

const ActivityCardSkeleton = () => {
  return (
    <article className="rounded-xl">
      {/* Image skeleton - 16:10 aspect ratio */}
      <Skeleton className="aspect-[16/10] rounded-xl mb-3" />

      {/* Content skeleton */}
      <div className="space-y-2">
        {/* Rating */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Title */}
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />

        {/* Location */}
        <Skeleton className="h-4 w-2/3" />

        {/* Tags */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </article>
  );
};

export default ActivityCardSkeleton;
