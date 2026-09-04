import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

/**
 * RODO art. 17 — usunięcie konta.
 *
 * N-15 (04.09): opinie NIE znikają razem z kontem. Decyzja właściciela —
 * anonimizować, nie kasować: treść zostaje dla innych rodziców, znika
 * powiązanie z osobą. Podstawa: art. 17 dopuszcza pozostawienie treści
 * nieidentyfikującej po anonimizacji.
 *
 * Kolejność ma znaczenie: anonimizacja opinii MUSI pójść przed deleteUser().
 * Do 04.09 `user_reviews.user_id` był NOT NULL z FK ON DELETE CASCADE, więc
 * skasowanie konta kasowało opinie kaskadą. Migracja N-15 zmieniła to na
 * NULL-owalne + ON DELETE SET NULL i dołożyła trigger
 * `trg_user_reviews_anonimizuj`, który nadpisuje podpis przy osieroceniu
 * wiersza — ta funkcja jest drugą warstwą, nie jedyną.
 *
 * `saved_activities` i `user_ratings` zostają na kaskadzie i mają zniknąć
 * (BD-A-09) — kasujemy je tu jawnie, żeby błąd był widoczny w odpowiedzi,
 * a nie milczący.
 *
 * CORS: origin jest zamknięty na produkcyjną domenę — tak stała wersja
 * wdrożona od 22.08 i tego nie luzujemy przy okazji N-15.
 */

const cors = {
  "Access-Control-Allow-Origin": "https://familyfun.pl",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Podpis po anonimizacji. Ten sam string trzyma front (ANONYMIZED_AUTHOR
// w src/lib/deleteAccount.ts), obiecuje go Regulamin, i wymusza go trigger
// bazodanowy — zmiana w jednym miejscu wymaga zmiany we wszystkich trzech.
const ANONYMIZED_AUTHOR = "Rodzic (konto usunięte)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ ok: false, error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ ok: false, error: "unauthorized" }, 401);

    const userId = userData.user.id;

    // 1. Anonimizacja opinii — PRZED skasowaniem użytkownika.
    const { error: reviewsError } = await admin
      .from("user_reviews")
      .update({ author_name: ANONYMIZED_AUTHOR, user_id: null })
      .eq("user_id", userId);
    if (reviewsError) return json({ ok: false, error: reviewsError.message }, 500);

    // 2. Oceny i ulubione znikają bez śladu (BD-A-09).
    const [saved, ratings] = await Promise.all([
      admin.from("saved_activities").delete().eq("user_id", userId),
      admin.from("user_ratings").delete().eq("user_id", userId),
    ]);
    const rowError = saved.error ?? ratings.error;
    if (rowError) return json({ ok: false, error: rowError.message }, 500);

    // 3. Dopiero teraz samo konto.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) return json({ ok: false, error: deleteError.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
