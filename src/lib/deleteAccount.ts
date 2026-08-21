import { catalogClient as supabase } from "@/lib/catalogClient";
import { clearAllAppStorage } from "@/lib/storage";

/**
 * RODO art. 17 — usunięcie danych konta.
 *
 * Kasujemy WSZYSTKIE dane użytkownika, do których uprawniają go polityki RLS:
 *  - zapisane miejsca (ulubione, „chcę odwiedzić"),
 *  - oceny gwiazdkowe,
 * a wystawione opinie ANONIMIZUJEMY (treść zostaje, podpis traci dane osobowe).
 * Następnie próbujemy usunąć sam wpis logowania przez Edge Function działającą
 * na service_role (z klienta nie da się tego zrobić). Gdy funkcja nie jest
 * jeszcze wdrożona, zwracamy `identityPendingManualRemoval: true` — UI mówi
 * wtedy, że konto zostanie skasowane w ciągu 30 dni.
 *
 * TODO(S-131): wdrożyć Edge Function `delete-account` w projekcie katalogowym
 * (service_role → auth.admin.deleteUser(user.id)), żeby usunięcie wpisu
 * logowania było natychmiastowe i w pełni automatyczne.
 */
export interface DeleteAccountResult {
  ok: boolean;
  /** Prawda, gdy sam wpis konta (tożsamość) wymaga jeszcze obsługi po stronie operatora. */
  identityPendingManualRemoval: boolean;
  error?: string;
}

export const ANONYMIZED_AUTHOR = "Rodzic (konto usunięte)";

async function deleteAuthIdentity(): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke("delete-account", { body: {} });
    return !error;
  } catch {
    return false;
  }
}

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

    const identityDeleted = await deleteAuthIdentity();

    clearAllAppStorage();
    await supabase.auth.signOut();

    return { ok: true, identityPendingManualRemoval: !identityDeleted };
  } catch (e) {
    return {
      ok: false,
      identityPendingManualRemoval: true,
      error: e instanceof Error ? e.message : "Nieznany błąd",
    };
  }
}
