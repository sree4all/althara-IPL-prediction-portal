/**
 * Update Vis Mega Bonus Q7–Q9 answers, ensure Q7–Q9 official keys, re-apply tournament scoring.
 *
 *   npx tsx scripts/fix-vis-q789-and-rescore.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { applyTournamentScoring } from "@/lib/scoring/tournament-scoring";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seasonYear = Number(process.env.SEASON_YEAR ?? 2026);

const Q7_9_OFFICIAL: Record<number, string> = {
  7: "RCB",
  8: "Vaibhav Sooryavansi",
  9: "None of the above",
};

const VIS_ANSWERS: Record<number, string> = {
  7: "RCB",
  8: "Vaibhav Sooryavansi",
  9: "None of the above",
};

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: vis, error: visErr } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("display_name", "Vis")
    .maybeSingle();
  if (visErr || !vis) {
    console.error(visErr?.message ?? "Vis profile not found");
    process.exit(1);
  }

  const { data: questions, error: qErr } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, correct_answer")
    .eq("season_year", seasonYear)
    .in("slot_no", [7, 8, 9]);
  if (qErr || !questions?.length) {
    console.error(qErr?.message ?? "Q7–Q9 questions missing");
    process.exit(1);
  }

  const now = new Date().toISOString();

  const { data: cfg } = await supabase
    .from("tournament_config")
    .select("answer_lock_utc")
    .eq("season_year", seasonYear)
    .maybeSingle();
  const priorLock = (cfg?.answer_lock_utc as string | null) ?? null;
  const unlockUntil = "2099-12-31T23:59:59Z";
  const { error: unlockErr } = await supabase
    .from("tournament_config")
    .update({ answer_lock_utc: unlockUntil, updated_at: now })
    .eq("season_year", seasonYear);
  if (unlockErr) {
    console.error("Could not temporarily unlock tournament answers:", unlockErr.message);
    process.exit(1);
  }

  for (const q of questions) {
    const slot = Number(q.slot_no);
    const official = Q7_9_OFFICIAL[slot];
    if (!official) continue;
    if ((q.correct_answer as string | null)?.trim() !== official) {
      const { error } = await supabase
        .from("tournament_questions")
        .update({ correct_answer: official, updated_at: now })
        .eq("id", q.id);
      if (error) {
        console.error(`Failed to set Q${slot} official answer:`, error.message);
        process.exit(1);
      }
      console.log(`Set Q${slot} correct_answer → ${official}`);
    }
  }

  for (const q of questions) {
    const slot = Number(q.slot_no);
    const answer = VIS_ANSWERS[slot];
    if (!answer) continue;
    const { error } = await supabase.from("tournament_answers").upsert(
      {
        user_id: vis.id,
        question_id: q.id,
        answer_text: answer,
        updated_at: now,
      },
      { onConflict: "user_id,question_id" },
    );
    if (error) {
      console.error(`Failed to update Vis Q${slot}:`, error.message);
      process.exit(1);
    }
    console.log(`Vis Q${slot} → ${answer}`);
  }

  if (priorLock) {
    const { error: relockErr } = await supabase
      .from("tournament_config")
      .update({ answer_lock_utc: priorLock, updated_at: new Date().toISOString() })
      .eq("season_year", seasonYear);
    if (relockErr) {
      console.warn("Warning: could not restore answer_lock_utc:", relockErr.message);
    } else {
      console.log("Restored tournament answer lock.");
    }
  }

  console.log("\nApplying tournament scoring (all slots)...");
  const result = await applyTournamentScoring(supabase, seasonYear);
  if (!result.ok) {
    console.error("Scoring failed:", result.error);
    process.exit(1);
  }
  console.log(`  ${result.ledgerRows} tournament ledger row(s).`);

  const sync = await syncProfilePointsFromLedger(supabase);
  console.log(`  Profiles synced: ${sync.updated} updated, ${sync.unchanged} unchanged.`);

  const { data: visLedger } = await supabase
    .from("points_ledger")
    .select("points_delta, reason")
    .eq("user_id", vis.id)
    .eq("source_type", "tournament_question");
  const tSum = (visLedger ?? []).reduce((a, r) => a + Number(r.points_delta), 0);
  const { data: visProf } = await supabase
    .from("profiles")
    .select("current_points, legacy_points")
    .eq("id", vis.id)
    .single();
  const { data: allLed } = await supabase
    .from("points_ledger")
    .select("points_delta")
    .eq("user_id", vis.id);
  const totalLed = (allLed ?? []).reduce((a, r) => a + Number(r.points_delta), 0);
  console.log("\nVis tournament ledger:", visLedger);
  console.log(
    `Vis total: profile=${visProf?.current_points} legacy=${visProf?.legacy_points} ledger_sum=${totalLed} (tournament +${tSum})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
