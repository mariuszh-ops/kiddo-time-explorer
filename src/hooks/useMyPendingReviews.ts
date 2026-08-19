import { useEffect, useState } from "react";
import { catalogClient as supabase } from "@/lib/catalogClient";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Zwraca zbiór place_id, dla których zalogowany użytkownik ma własną opinię
 * oczekującą na weryfikację. Dzięki temu „Moje miejsca" mówią to samo,
 * co sekcja opinii na karcie atrakcji.
 */
export function useMyPendingReviews(): Set<string> {
  const { user } = useAuth();
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setPending(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_reviews")
        .select("place_id,status")
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (cancelled || error || !data) return;
      setPending(new Set((data as { place_id: string }[]).map((r) => r.place_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return pending;
}