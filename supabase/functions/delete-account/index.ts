import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Anonimizacja opinii — treść zostaje dla innych rodziców, znika powiązanie z kontem.
    const { error: reviewsError } = await admin
      .from("user_reviews")
      .update({ author_name: "Rodzic (konto usunięte)", user_id: null })
      .eq("user_id", userId);
    if (reviewsError) return json({ ok: false, error: reviewsError.message }, 500);

    const [saved, ratings] = await Promise.all([
      admin.from("saved_activities").delete().eq("user_id", userId),
      admin.from("user_ratings").delete().eq("user_id", userId),
    ]);
    const rowError = saved.error ?? ratings.error;
    if (rowError) return json({ ok: false, error: rowError.message }, 500);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) return json({ ok: false, error: deleteError.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
