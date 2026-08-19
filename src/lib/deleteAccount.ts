import { catalogClient as supabase } from "@/lib/catalogClient";
import { clearAllAppStorage } from "@/lib/storage";

/**
 * RODO art. 17 — usunięcie danych konta.
 *
 * Kasujemy WSZYSTKIE dane użytkownika, do których uprawniają go polityki RLS:
 *  - zapisane miejsca (ulubione, „chcę odwiedzić"),
 *  - oceny gwiazdkowe,
 * a wystawione opinie ANONIMIZUJEMY (treść zostaje, podpis traci dane osobowe).
 * Na koniec czyścimy cały lokalny magazyn i kończymy sesję, więc ponowne
 * logowanie tym samym e-mailem startuje z pustym kontem.
 */
export interface DeleteAccountResult {
  ok: boolean;
  /** Prawda, gdy sam wpis konta (tożsamość) wymaga jeszcze obsługi ręcznej. */
  identityPendingManualRemoval: boolean;
  error?: string;
}

export const ANONYMIZED_AUTHOR = "Rodzic (konto usunięte)";

export async function deleteAccountData(userId: string): Promise<DeleteAccountResult> {
  try {
    const [saved, ratings, reviews] = await Promise.all([
      supabase.from("saved_activities").delete().eq("user_id", userId),
      supabase.from("user_ratings").delete().eq("user_id", userId),
      supabase.from("user_reviews").update({ author_name: ANONYMIZED_AUTHOR }).eq("user_id", userId),
    ]);

    const failed = [saved.error, ratings.error, reviews.error].filter(Boolean);
    if (failed.length > 0) {
      return {
        ok: false,
        identityPendingManualRemoval: true,
        error: failed[0]?.message ?? "Nie udało się usunąć danych.",
      };
    }

    clearAllAppStorage();
    await supabase.auth.signOut();

    // Sam rekord tożsamości w systemie logowania usuwa operator na podstawie
    // zgłoszenia — dane profilowe i treści są już wyczyszczone/anonimowe.
    return { ok: true, identityPendingManualRemoval: true };
  } catch (e) {
    return {
      ok: false,
      identityPendingManualRemoval: true,
      error: e instanceof Error ? e.message : "Nieznany błąd",
    };
  }
}
