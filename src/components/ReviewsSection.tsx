import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Star, MessageSquarePlus, Edit2, Check, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { useUserRatings } from "@/contexts/UserRatingsContext";
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

/** Publiczny widok opinii — wyłącznie zatwierdzone, bez danych autora. */
interface PublicReviewRow {
  id: string;
  place_id: string;
  rating: number;
  text: string | null;
  created_at: string;
}

interface ReviewsSectionProps {
  placeId?: string;
  /** ID atrakcji — służy do podstawienia oceny wystawionej wyżej na karcie. */
  activityId?: number;
  googleReviews?: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
  onAuthRequired: () => void;
  latitude?: number | null;
  longitude?: number | null;
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

const isTruncatedAtSource = (text: string): boolean =>
  /(…|\.\.\.)\s*$/.test(text.trim());

const ExpandableText = ({
  text,
  mapsUrl,
}: {
  text: string;
  mapsUrl?: string | null;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const truncatedAtSource = isTruncatedAtSource(text);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setIsClamped(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded]);

  const showToggle = !truncatedAtSource && (isClamped || expanded);

  return (
    <>
      <p
        ref={ref}
        className={cn(
          "text-sm text-foreground leading-relaxed whitespace-pre-line",
          !expanded && "line-clamp-4",
        )}
      >
        {text}
      </p>
      {truncatedAtSource ? (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-xs text-muted-foreground">Fragment opinii z Google</p>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-[40px] md:min-h-0 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              Zobacz wszystkie opinie w Google Maps
            </a>
          )}
        </div>
      ) : (
        showToggle && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-primary hover:underline underline-offset-2 inline-flex items-center min-h-[40px] md:min-h-0"
          >
            {expanded ? "mniej" : "więcej"}
          </button>
        )
      )}
    </>
  );
};

const StarRow = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const cls = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`Ocena ${rating} na 5`}>
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
  activityId,
  googleReviews = [],
  averageRating,
  totalReviewCount,
  onAuthRequired,
  latitude,
  longitude,
}: ReviewsSectionProps) => {
  const { isLoggedIn, user } = useAuth();
  const { getUserRating } = useUserRatings();
  const cardRating = activityId != null ? getUserRating(activityId)?.rating ?? 0 : 0;

  /** Podpis autora — NIGDY nie pochodzi z adresu e-mail. */
  const defaultAuthorName = user?.name?.trim() || "Rodzic";

  const mapsUrl =
    latitude != null && longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : null;

  const [userReviews, setUserReviews] = useState<PublicReviewRow[]>([]);
  const [myReview, setMyReview] = useState<UserReviewRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [text, setText] = useState("");
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!placeId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Publiczne opinie: JEDYNE źródło to widok public_reviews (tylko zatwierdzone,
    // czytany kluczem anon). Rola anon nie ma dostępu do user_reviews.
    const publicQuery = supabase
      .from("public_reviews")
      .select("id,place_id,rating,text,created_at")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false });

    // Własna opinia (również „pending") — na tokenie zalogowanego użytkownika.
    const mineQuery = user
      ? supabase
          .from("user_reviews")
          .select("*")
          .eq("place_id", placeId)
          .eq("user_id", user.id)
          .maybeSingle()
      : null;

    const [publicRes, mineRes] = await Promise.all([publicQuery, mineQuery]);

    if (publicRes.error) {
      console.error("Failed to load public reviews", publicRes.error);
    }
    const mine = (mineRes && !mineRes.error ? (mineRes.data as UserReviewRow | null) : null) ?? null;
    setMyReview(mine);

    const rows = ((publicRes.data as PublicReviewRow[] | null) ?? []).filter(
      (r) => !mine || r.id !== mine.id,
    );
    setUserReviews(rows);
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
      setAuthorName(myReview.author_name || defaultAuthorName);
    }
  }, [isEditing, myReview, defaultAuthorName]);

  // Podstaw ocenę wystawioną wyżej na karcie jako wartość początkową.
  useEffect(() => {
    if (!isEditing && rating === 0 && cardRating > 0) setRating(cardRating);
  }, [cardRating, isEditing, rating]);

  // Domyślny podpis po zalogowaniu (imię z Google, inaczej „Rodzic").
  useEffect(() => {
    setAuthorName((prev) => (prev && prev !== "Rodzic" ? prev : defaultAuthorName));
  }, [defaultAuthorName]);

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
      const signature = authorName.trim() || defaultAuthorName;
      const payload = {
        place_id: placeId,
        user_id: user.id,
        author_name: signature,
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

  const handleDelete = async () => {
    if (!myReview || !user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from("user_reviews")
        .delete()
        .eq("id", myReview.id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Nie udało się usunąć opinii. Odśwież stronę i spróbuj ponownie.");
        return;
      }
      setDeleteOpen(false);
      setMyReview(null);
      setIsEditing(false);
      setRating(0);
      setHoveredStar(0);
      setText("");
      setAuthorName(defaultAuthorName);
      toast.success("Twoja opinia została usunięta.");
      await loadReviews();
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się usunąć opinii. Odśwież stronę i spróbuj ponownie.");
    } finally {
      setDeleting(false);
    }
  };



  const hasAnyReview =
    userReviews.length > 0 || googleReviews.length > 0 || myReview !== null;
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
              <div className="flex items-center gap-1">
                {myReview.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="min-h-[44px] min-w-[44px] px-2 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edytuj
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  disabled={deleting}
                  aria-label="Usuń Twoją opinię"
                  className="min-h-[44px] min-w-[44px] px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Usuń
                </Button>
              </div>
            </div>
            <StarRow rating={myReview.rating} size="md" />
            {myReview.text && (
              <p className="text-sm text-foreground leading-relaxed mt-2 whitespace-pre-line">
                {myReview.text}
              </p>
            )}
          </div>
        )}

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć Twoją opinię?</AlertDialogTitle>
              <AlertDialogDescription>
                Opinia zniknie z karty atrakcji. Tej operacji nie można cofnąć — możesz później
                dodać nową.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Usuwanie…" : "Usuń opinię"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



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

            <p className="text-xs font-medium text-foreground mb-1">
              Wybierz ocenę (wymagane)
            </p>
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
                    className="min-h-11 min-w-11 h-11 w-11 p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    aria-label={`Oceń ${v} z 5 gwiazdek — formularz opinii`}
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
            {rating < 1 && (
              <p className="text-xs text-destructive mb-3">
                Zaznacz ocenę w gwiazdkach, aby opublikować opinię
              </p>
            )}

            <div className="mb-3">
              <Label htmlFor="review-author" className="text-xs font-medium">
                Jak Cię podpisać?
              </Label>
              <Input
                id="review-author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value.slice(0, 60))}
                placeholder="Rodzic"
                maxLength={60}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Widoczne publicznie</p>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, REVIEW_MAX))}
              placeholder="Co warto wiedzieć innym rodzicom? (opcjonalnie)"
              className="resize-none min-h-[100px]"
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
                  className="min-h-[40px] md:min-h-0"
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
            {rating < 1 && (
              <p className="text-xs text-muted-foreground mt-1.5 text-right">
                Aby opublikować opinię, wybierz najpierw liczbę gwiazdek
              </p>
            )}
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
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0" aria-hidden="true">
                      <span className="text-xs font-medium text-accent-foreground">R</span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">Rodzic</span>
                  </div>
                  <StarRow rating={r.rating} />
                </div>
                {r.text && <ExpandableText text={r.text} mapsUrl={mapsUrl} />}
              </li>
            ))}
            {[...googleReviews]
              .sort((a, b) => b.rating - a.rating)
              .map((r, idx) => (
              <li key={`g-${idx}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0" aria-hidden="true">
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
                {r.text && <ExpandableText text={r.text} mapsUrl={mapsUrl} />}
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