const MapViewSkeleton = () => {
  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 56px)" }}>
      {/* Map area skeleton */}
      <div className="absolute inset-0 bg-muted animate-pulse">
        {/* Fake map grid lines */}
        <div className="absolute inset-0 opacity-[0.08]">
          {[...Array(6)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute w-full border-t border-foreground/20"
              style={{ top: `${(i + 1) * 14}%` }}
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute h-full border-l border-foreground/20"
              style={{ left: `${(i + 1) * 16}%` }}
            />
          ))}
        </div>

        {/* Fake cluster circles */}
        {[
          { top: "22%", left: "30%", size: 44 },
          { top: "45%", left: "60%", size: 52 },
          { top: "35%", left: "15%", size: 38 },
          { top: "60%", left: "45%", size: 46 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              top: c.top,
              left: c.left,
              width: c.size,
              height: c.size,
              background: "hsl(var(--foreground) / 0.08)",
              border: "2px solid hsl(var(--foreground) / 0.12)",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}

        {/* Fake single pins */}
        {[
          { top: "28%", left: "55%" },
          { top: "50%", left: "25%" },
          { top: "40%", left: "72%" },
        ].map((p, i) => (
          <div
            key={`pin-${i}`}
            className="absolute w-8 h-8 rounded-lg animate-pulse"
            style={{
              top: p.top,
              left: p.left,
              background: "hsl(var(--foreground) / 0.06)",
              border: "2px solid hsl(var(--foreground) / 0.1)",
              animationDelay: `${300 + i * 150}ms`,
            }}
          />
        ))}
      </div>

      {/* Bottom sheet skeleton */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border"
        style={{ height: 140 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Search bar placeholder */}
        <div className="mx-4 mb-3">
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
        </div>

        {/* Category chips placeholder */}
        <div className="flex gap-2 px-4">
          {[72, 88, 64, 80, 56].map((w, i) => (
            <div
              key={i}
              className="h-8 rounded-full bg-muted animate-pulse flex-shrink-0"
              style={{ width: w, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* List button skeleton (top-left) */}
      <div className="absolute top-3 left-3">
        <div className="h-9 w-24 rounded-full bg-background/90 border border-border animate-pulse" />
      </div>

      {/* Geolocation button skeleton (bottom-right, above sheet) */}
      <div className="absolute right-3" style={{ bottom: 152 }}>
        <div className="w-10 h-10 rounded-full bg-background/90 border border-border animate-pulse" />
      </div>
    </div>
  );
};

export default MapViewSkeleton;
