const Block = ({ className }: { className?: string }) => (
  <div className={`bg-[#e5e7eb] animate-pulse rounded-lg ${className || ''}`} />
);

const HomeSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header */}
    <div className="h-14 border-b border-border flex items-center px-4 gap-4">
      <Block className="h-8 w-32" />
      <div className="flex-1" />
      <Block className="h-8 w-8 rounded-full" />
    </div>

    {/* Hero */}
    <div className="md:container md:px-4 md:pt-4">
      <Block className="w-full h-[280px] md:h-[50vh] md:max-h-[55vh] md:rounded-2xl rounded-none" />
    </div>

    {/* Filter bar */}
    <div className="container px-4 py-4 flex items-center gap-3 overflow-hidden">
      <Block className="h-10 w-48 rounded-lg flex-shrink-0" />
      {[1, 2, 3, 4].map(i => (
        <Block key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
      ))}
    </div>

    {/* City cards section */}
    <div className="container px-4 py-6 space-y-4">
      <Block className="h-7 w-56" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <Block key={i} className="h-36 w-44 rounded-xl flex-shrink-0" />
        ))}
      </div>
    </div>

    {/* Activity cards grid */}
    <div className="container px-4 py-6 space-y-4">
      <Block className="h-7 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <Block className="aspect-[3/2] w-full rounded-xl" />
            <Block className="h-4 w-full" />
            <Block className="h-4 w-3/4" />
            <div className="flex gap-1.5">
              <Block className="h-5 w-14 rounded-full" />
              <Block className="h-5 w-18 rounded-full" />
              <Block className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default HomeSkeleton;
