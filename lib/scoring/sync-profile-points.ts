import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLedgerTotalsByUser } from "@/lib/scoring/ledger-totals";

const PROFILE_UPDATE_CONCURRENCY = 40;

/** Rebuild profiles.current_points = SUM(points_ledger). */
export async function syncProfilePointsFromLedger(
  supabase: SupabaseClient,
): Promise<{ updated: number; unchanged: number }> {
  const [{ data: profiles, error: pErr }, sumByUser] = await Promise.all([
    supabase.from("profiles").select("id, current_points"),
    loadLedgerTotalsByUser(supabase),
  ]);
  if (pErr) throw new Error(pErr.message);

  const now = new Date().toISOString();
  const toUpdate: { id: string; expected: number }[] = [];
  let unchanged = 0;

  for (const p of profiles ?? []) {
    const uid = p.id as string;
    const expected = sumByUser.get(uid) ?? 0;
    const current = Number(p.current_points ?? 0);
    if (current === expected) {
      unchanged += 1;
    } else {
      toUpdate.push({ id: uid, expected });
    }
  }

  for (let i = 0; i < toUpdate.length; i += PROFILE_UPDATE_CONCURRENCY) {
    const slice = toUpdate.slice(i, i + PROFILE_UPDATE_CONCURRENCY);
    const results = await Promise.all(
      slice.map(({ id, expected }) =>
        supabase
          .from("profiles")
          .update({ current_points: expected, updated_at: now })
          .eq("id", id),
      ),
    );
    for (const r of results) {
      if (r.error) throw new Error(r.error.message);
    }
  }

  return { updated: toUpdate.length, unchanged };
}
