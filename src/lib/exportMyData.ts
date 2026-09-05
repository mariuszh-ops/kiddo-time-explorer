import { catalogClient as supabase } from "@/lib/catalogClient";
import { getItem, STORAGE_KEYS } from "@/lib/storage";
import type { User } from "@/contexts/AuthContext";

/**
 * N-20 / I-11 — „Pobierz moje dane": kopia danych konta w JSON (art. 15 i 20 RODO),
 * zbierana PO STRONIE PRZEGLĄDARKI z tego, co RLS oddaje właścicielowi:
 * saved_activities, user_ratings, user_reviews + dane logowania z sesji
 * + profil rodziny z localStorage.
 *
 * Czego tu NIE ma: `client_errors` (M-08, SELECT tylko dla admina) i `auth.identities`.
 * Pełną kopię z tymi źródłami robi ręcznie `7_public/eksport_uzytkownika.py`.
 */
export interface MyDataExport {
  exported_at: string;
  source: string;
  account: {
    id: string;
    email: string;
    pending_email?: string;
    display_name?: string;
    created_at?: string;
    login_providers?: string[];
  };
  saved_activities: unknown[];
  user_ratings: unknown[];
  user_reviews: unknown[];
  family_profile_local: unknown[];
  _info: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const exportFileName = (d = new Date()): string =>
  `familyfun-moje-dane-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;

export async function buildMyDataExport(user: User): Promise<MyDataExport> {
  // `.eq("user_id")` jest konieczne mimo RLS: user_reviews ma też politykę
  // „approved widoczne dla wszystkich" — bez filtra wróciłyby cudze opinie.
  const [saved, ratings, reviews] = await Promise.all([
    supabase
      .from("saved_activities")
      .select("activity_slug, kind, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_ratings")
      .select("activity_id, rating, review, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_reviews")
      .select("place_id, author_name, rating, text, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);
  const failed = [saved, ratings, reviews].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  return {
    exported_at: new Date().toISOString(),
    source: "familyfun.pl / profil / Pobierz moje dane",
    account: {
      id: user.id,
      email: user.email,
      pending_email: user.pendingEmail,
      display_name: user.name,
      created_at: user.createdAt,
      login_providers: user.providers,
    },
    saved_activities: saved.data ?? [],
    user_ratings: ratings.data ?? [],
    user_reviews: reviews.data ?? [],
    family_profile_local: getItem<unknown[]>(STORAGE_KEYS.FAMILY_PROFILE, []),
    _info:
      "activity_id w user_ratings to wewnętrzny identyfikator atrakcji (hash adresu strony). " +
      "family_profile_local pochodzi z tej przeglądarki, nie z serwera.",
  };
}

/** Zapis JSON jako plik do pobrania (Blob + tymczasowy link). */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
