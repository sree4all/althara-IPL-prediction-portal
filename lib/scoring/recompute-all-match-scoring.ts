import type { SupabaseClient } from "@supabase/supabase-js";
import { applyMatchScoring } from "@/lib/scoring/match-scoring";

export type RecomputeAllMatchResult =
  | {
      ok: true;
      processed: number;
      failures: { matchId: string; error: string }[];
    }
  | { ok: false; error: string };

/**
 * Re-run match + per-match bonus ledger for every completed match (idempotent).
 * Use after imports or if scoring was skipped for some users.
 */
export async function recomputeAllCompletedMatchScoring(
  supabase: SupabaseClient,
  seasonYear = 2026,
): Promise<RecomputeAllMatchResult> {
  const { data: rows, error } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "completed")
    .order("match_time_utc", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const failures: { matchId: string; error: string }[] = [];
  let processed = 0;

  for (const row of rows ?? []) {
    const matchId = row.id as string;
    const result = await applyMatchScoring(supabase, matchId, seasonYear);
    if (!result.ok) {
      failures.push({ matchId, error: result.error });
    } else {
      processed += 1;
    }
  }

  return { ok: true, processed, failures };
}
