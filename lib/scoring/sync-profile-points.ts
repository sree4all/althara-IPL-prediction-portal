import type { SupabaseClient } from "@supabase/supabase-js";

/** Rebuild profiles.current_points = legacy_points + SUM(points_ledger). */
export async function syncProfilePointsFromLedger(
  supabase: SupabaseClient,
): Promise<{ updated: number; unchanged: number }> {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, legacy_points, current_points");
  if (pErr) throw new Error(pErr.message);

  const { data: ledger, error: lErr } = await supabase
    .from("points_ledger")
    .select("user_id, points_delta");
  if (lErr) throw new Error(lErr.message);

  const sumByUser = new Map<string, number>();
  for (const row of ledger ?? []) {
    const uid = row.user_id as string;
    sumByUser.set(uid, (sumByUser.get(uid) ?? 0) + Number(row.points_delta ?? 0));
  }

  const now = new Date().toISOString();
  let updated = 0;
  let unchanged = 0;

  for (const p of profiles ?? []) {
    const uid = p.id as string;
    const expected = Number(p.legacy_points ?? 0) + (sumByUser.get(uid) ?? 0);
    const current = Number(p.current_points ?? 0);
    if (current === expected) {
      unchanged += 1;
      continue;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ current_points: expected, updated_at: now })
      .eq("id", uid);
    if (error) throw new Error(error.message);
    updated += 1;
  }

  return { updated, unchanged };
}
