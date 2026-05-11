const Block = ({ className = "" }: { className?: string }) => (
  <div className={`bg-muted animate-pulse rounded-md ${className}`} />
);

/**
 * Skeleton mirroring ActivityDetail layout — same container/padding so there is
 * no layout shift when the real content swaps in. Pure Tailwind pulse, no motion.
 */
const ActivityDetailSkeleton = () => {
  return (
    <main className="min-h-screen bg-background">
      {/* Header / breadcrumbs strip */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
        <Block className="h-6 w-32" />
      </div>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-0 md:px-4">
        <Block className="aspect-video w-full md:rounded-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Title */}
        <Block className="h-8 w-2/3" />

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4">
          <Block className="h-4 w-24" />
          <Block className="h-4 w-24" />
          <Block className="h-4 w-24" />
        </div>

        {/* "Co Was czeka" */}
        <section className="space-y-3">
          <Block className="h-5 w-40" />
          <Block className="h-4 w-full" />
          <Block className="h-4 w-5/6" />
          <Block className="h-4 w-3/4" />
        </section>

        {/* "Informacje praktyczne" — 2 grids of 2 cols */}
        <section className="space-y-4">
          <Block className="h-5 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Block className="h-4 w-32" />
                <Block className="h-4 w-40" />
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="space-y-3">
          <Block className="h-5 w-32" />
          <Block className="h-24 w-full" />
          <Block className="h-24 w-full" />
        </section>
      </div>
    </main>
  );
};

export default ActivityDetailSkeleton;