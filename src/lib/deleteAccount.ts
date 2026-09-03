import { catalogClient as supabase, clearCatalogAuthStorage } from "@/lib/catalogClient";
import { clearAllAppStorage } from "@/lib/storage";

/**
 * RODO art. 17 — usunięcie danych konta.
 *
 * Kolejność jest krytyczna: najpierw Edge Function `delete-account` (service_role)
 * kasuje dane w bazie i sam wpis logowania. Dopiero po odpowiedzi {ok:true}
 * czyścimy localStorage i wylogowujemy. Gdy żądanie się nie powiedzie —
 * NIE kasujemy niczego lokalnie i zwracamy błąd do UI.
 */
export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

export const ANONYMIZED_AUTHOR = "Rodzic (konto usunięte)";

export async function deleteAccountData(_userId: string): Promise<DeleteAccountResult> {
  try {
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });

    if (error || !data || (data as { ok?: boolean }).ok !== true) {
      return {
        ok: false,
        error: error?.message ?? (data as { error?: string } | null)?.error ?? "Nie udało się usunąć konta.",
      };
    }

    // Dopiero teraz sprzątamy lokalnie. Klucz sesji kasujemy jawnie — konto
    // już nie istnieje, więc `signOut()` dostaje 403 i nie ma się o co opierać.
    clearAllAppStorage();
    await supabase.auth.signOut();
    clearCatalogAuthStorage();

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nieznany błąd" };
  }
}
