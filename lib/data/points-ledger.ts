import type { SupabaseClient } from "@supabase/supabase-js";

export type PointsLedgerRow = {
  id: string;
  source_type: string;
  source_id: string;
  points_delta: number | null;
  reason: string | null;
  awarded_at: string;
};

export async function getPointsLedgerForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ rows: PointsLedgerRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("points_ledger")
    .select("id, source_type, source_id, points_delta, reason, awarded_at")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: true });
  if (error) {
    return { rows: [], error: error.message };
  }
  return { rows: data ?? [], error: null };
}

