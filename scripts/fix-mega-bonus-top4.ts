/**
 * Align 2026 Mega Bonus Q1–Q4 DB state and re-apply tournament scoring.
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 *
 *   npm run fix:mega-bonus-top4
 *   npm run fix:mega-bonus-top4 -- --sync-points
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { applyTournamentScoring } from "@/lib/scoring/tournament-scoring";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seasonYear = Number(process.env.SEASON_YEAR ?? 2026);
const syncPoints = process.argv.includes("--sync-points");

const TOP4_CORRECT = "RCB\nRR\nGT\nSRH";
const FINALISTS_CORRECT = "RCB\nRR";

async function syncProfilePointsFromLedger(supabase: SupabaseClient) {
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

  let updated = 0;
  for (const p of profiles ?? []) {
    const expected =
      Number(p.legacy_points ?? 0) + (sumByUser.get(p.id as string) ?? 0);
    const current = Number(p.current_points ?? 0);
    if (current === expected) continue;
    const { error } = await supabase
      .from("profiles")
      .update({ current_points: expected, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) throw new Error(error.message);
    updated += 1;
  }
  console.log(`sync:points — updated ${updated} profile(s).`);
}

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Updating Top-4 correct_answer for season", seasonYear, "...");
  const { data: updated, error: upErr } = await supabase
    .from("tournament_questions")
    .update({ correct_answer: TOP4_CORRECT, updated_at: new Date().toISOString() })
    .eq("season_year", seasonYear)
    .gte("slot_no", 1)
    .lte("slot_no", 4)
    .select("id, slot_no");
  if (upErr) {
    console.error("Update failed:", upErr.message);
    process.exit(1);
  }
  console.log(`  Updated ${updated?.length ?? 0} Top-4 question row(s).`);

  const { data: finalistsUpdated, error: finErr } = await supabase
    .from("tournament_questions")
    .update({ correct_answer: FINALISTS_CORRECT, updated_at: new Date().toISOString() })
    .eq("season_year", seasonYear)
    .gte("slot_no", 5)
    .lte("slot_no", 6)
    .select("id, slot_no");
  if (finErr) {
    console.error("Finalists update failed:", finErr.message);
    process.exit(1);
  }
  console.log(`  Updated ${finalistsUpdated?.length ?? 0} Finalists question row(s) (Q5–Q6).`);

  console.log("Applying tournament scoring...");
  const result = await applyTournamentScoring(supabase, seasonYear);
  if (!result.ok) {
    console.error("Scoring failed:", result.error);
    process.exit(1);
  }
  console.log(`  OK — ${result.ledgerRows} ledger row(s) written.`);

  if (syncPoints) {
    await syncProfilePointsFromLedger(supabase);
  } else {
    console.log("Tip: run with --sync-points if leaderboard totals look wrong.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
