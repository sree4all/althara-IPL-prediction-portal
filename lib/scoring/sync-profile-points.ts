import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLedgerTotalsByUser } from "@/lib/scoring/ledger-totals";

/** Rebuild profiles.current_points = SUM(points_ledger). */
export async function syncProfilePointsFromLedger(
  supabase: SupabaseClient,
): Promise<{ updated: number; unchanged: number }> {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, current_points");
  if (pErr) throw new Error(pErr.message);

  const sumByUser = await loadLedgerTotalsByUser(supabase);

  const now = new Date().toISOString();
  let updated = 0;
  let unchanged = 0;

  for (const p of profiles ?? []) {
    const uid = p.id as string;
    const expected = sumByUser.get(uid) ?? 0;
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
