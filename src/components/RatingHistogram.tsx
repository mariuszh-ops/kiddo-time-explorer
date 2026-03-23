import { useMemo } from "react";

interface RatingHistogramProps {
  reviews: { rating: number }[];
}

const RatingHistogram = ({ reviews }: RatingHistogramProps) => {
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1★, index 4 = 5★
    reviews.forEach((r) => {
      const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4);
      counts[idx]++;
    });
    const max = Math.max(...counts, 1);
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star - 1],
      percentage: Math.round((counts[star - 1] / reviews.length) * 100),
      width: (counts[star - 1] / max) * 100,
    }));
  }, [reviews]);

  return (
    <div className="mb-4 pb-4 border-b border-border/50">
      <div className="space-y-1.5">
        {distribution.map(({ star, count, width }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
              {star}★
            </span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RatingHistogram;
