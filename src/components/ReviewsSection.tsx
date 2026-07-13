import { useCallback, useEffect, useState } from "react";
import { Star, MessageSquarePlus, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  source?: "google";
}

interface UserReviewRow {
  id: string;
  place_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ReviewsSectionProps {
  placeId?: string;
  googleReviews?: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
  onAuthRequired: () => void;
}

const REVIEW_MAX = 500;

const formatReviewCount = (count: number): string => {
  const formatted = new Intl.NumberFormat("pl-PL").format(count);
  const suffix =
    count === 1
      ? "opinia"
      : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)
        ? "opinie"
        : "opinii";
  return `${formatted} ${suffix}`;
};

const anonymizeAuthor = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

const ExpandableText = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 220;
  return (
    <>
      <p
        className={cn(
          "text-sm text-foreground leading-relaxed whitespace-pre-line",
          !expanded && "line-clamp-4",
        )}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline underline-offset-2"
        >
          {expanded ? "mniej" : "więcej"}
        </button>
      )}
    </>
  );
};

const StarRow = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const cls = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5" aria-label={`Ocena ${rating} z 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i < rating ? "fill-primary text-primary" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
};

const ReviewsSection = ({
  placeId,
  googleReviews = [],
  averageRating,
  totalReviewCount,
  onAuthRequired,
}: ReviewsSectionProps) => {
  const { isLoggedIn, user } = useAuth();

  const [userReviews, setUserReviews] = useState<UserReviewRow[]>([]);
  const [myReview, setMyReview] = useState<UserReviewRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!placeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // RLS returns approved + own (any status) automatically.
    const { data, error } = await supabase
      .from("user_reviews")
      .select("*")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load user reviews", error);
      setLoading(false);
      return;
    }
    const rows = (data as UserReviewRow[] | null) ?? [];
    const mine = user ? rows.find((r) => r.user_id === user.id) ?? null : null;
    setMyReview(mine);
    setUserReviews(rows.filter((r) => r.status === "approved"));
    setLoading(false);
  }, [placeId, user]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Hydrate form when opening editor for existing review
  useEffect(() => {
    if (isEditing && myReview) {
      setRating(myReview.rating);
      setText(myReview.text ?? "");
    }
  }, [isEditing, myReview]);

  const handleStarClick = (value: number) => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    setRating(value);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn || !user) {
      onAuthRequired();
      return;
    }
    if (!placeId) return;
    if (rating < 1) {
      toast.error("Wybierz ocenę w gwiazdkach");
      return;
    }
    setSubmitting(true);
    try {
      const authorName =
        user.name || (user.email ? user.email.split("@")[0] : "Anonim");
      const payload = {
        place_id: placeId,
        user_id: user.id,
        author_name: authorName,
        rating,
        text: text.trim(),
        status: "pending" as const,
      };
      const { error } = await supabase
        .from("user_reviews")
        .upsert(payload, { onConflict: "place_id,user_id" });
      if (error) throw error;
      toast.success("Dziękujemy! Twoja opinia pojawi się po weryfikacji.", {
        duration: 3500,
      });
      setIsEditing(false);
      await loadReviews();
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się zapisać opinii. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyReview = userReviews.length > 0 || googleReviews.length > 0;
  const showForm = !myReview || isEditing;

  return (
    <section className="container mt-5 md:mt-6">
      <div className="bg-card rounded-xl p-4 md:p-5 border border-border">
        {/* Header: średnia + liczba (z karty, bez przeliczania) */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opinie
            </h2>
            {(averageRating != null || totalReviewCount != null) && (
              <div className="flex items-center gap-2 mt-1.5">
                {averageRating != null && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="text-lg font-bold text-foreground">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                )}
                {totalReviewCount != null && totalReviewCount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    · {formatReviewCount(totalReviewCount)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Moja opinia — status pending */}
        {myReview && !isEditing && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Twoja opinia
                </span>
                {myReview.status === "pending" && (
                  <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    oczekuje na weryfikację
                  </span>
                )}
                {myReview.status === "rejected" && (
                  <span className="text-[10px] uppercase tracking-wide bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                    odrzucona
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-auto py-1 px-2 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edytuj
              </Button>
            </div>
            <StarRow rating={myReview.rating} size="md" />
            {myReview.text && (
              <p className="text-sm text-foreground leading-relaxed mt-2 whitespace-pre-line">
                {myReview.text}
              </p>
            )}
          </div>
        )}

        {/* Formularz dodawania / edycji */}
        {showForm && (
          <div className="mb-4 rounded-xl border border-border bg-background/50 p-3 md:p-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {myReview ? "Edytuj swoją opinię" : "Dodaj opinię"}
            </h3>
            {!hasAnyReview && !myReview && (
              <p className="text-xs text-muted-foreground mb-3">
                Byłeś tu z dzieckiem? Podziel się opinią jako pierwszy.
              </p>
            )}

            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                const filled = v <= (hoveredStar || rating);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleStarClick(v)}
                    onMouseEnter={() => setHoveredStar(v)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                    aria-label={`Oceń ${v} z 5`}
                  >
                    <Star
                      className={cn(
                        "w-7 h-7 transition-colors",
                        filled
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/40 hover:text-muted-foreground/60",
                      )}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
              )}
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, REVIEW_MAX))}
              placeholder="Co warto wiedzieć innym rodzicom? (opcjonalnie)"
              className="resize-none min-h-[100px] text-sm"
              maxLength={REVIEW_MAX}
              onFocus={() => {
                if (!isLoggedIn) onAuthRequired();
              }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-muted-foreground">
                {text.length}/{REVIEW_MAX}
              </p>
              <div className="flex gap-2">
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setRating(0);
                      setText("");
                    }}
                  >
                    Anuluj
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={submitting || rating < 1}
                >
                  {submitting ? (
                    "Wysyłam..."
                  ) : (
                    <>
                      {myReview ? (
                        <Check className="w-4 h-4 mr-1.5" />
                      ) : (
                        <MessageSquarePlus className="w-4 h-4 mr-1.5" />
                      )}
                      {myReview ? "Zapisz zmiany" : "Opublikuj opinię"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista opinii: najpierw FamilyFun (approved), potem Google */}
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Wczytuję opinie...
          </div>
        ) : hasAnyReview ? (
          <ul className="divide-y divide-border">
            {userReviews.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-accent-foreground">
                        {r.author_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {anonymizeAuthor(r.author_name)}
                    </span>
                  </div>
                  <StarRow rating={r.rating} />
                </div>
                {r.text && <ExpandableText text={r.text} />}
              </li>
            ))}
            {[...googleReviews]
              .sort((a, b) => b.rating - a.rating)
              .map((r, idx) => (
              <li key={`g-${idx}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-accent-foreground">
                        {r.author.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {anonymizeAuthor(r.author)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      opinia z Google
                    </span>
                  </div>
                  <StarRow rating={r.rating} />
                </div>
                {r.text && <ExpandableText text={r.text} />}
              </li>
            ))}
          </ul>
        ) : (
          !showForm && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Jeszcze nikt nie dodał opinii.
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default ReviewsSection;