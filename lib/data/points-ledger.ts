import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPointsLedgerForUser(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("points_ledger")
    .select("id, source_type, source_id, points_delta, reason, awarded_at")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false });
  return data ?? [];
}

