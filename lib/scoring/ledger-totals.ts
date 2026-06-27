import type { SupabaseClient } from "@supabase/supabase-js";

export function sumLedgerRowsByUser(
  rows: { user_id: string; points_delta: number | null }[],
): Map<string, number> {
  const sumByUser = new Map<string, number>();
  for (const row of rows) {
    const uid = row.user_id;
    sumByUser.set(uid, (sumByUser.get(uid) ?? 0) + Number(row.points_delta ?? 0));
  }
  return sumByUser;
}

export async function loadLedgerTotalsByUser(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("points_ledger").select("user_id, points_delta");
  if (error) throw new Error(error.message);
  return sumLedgerRowsByUser(data ?? []);
}
