/**
 * Re-score Mega Bonus Q7–Q9 for all players (and refresh Q1–Q6 ledger via same pass).
 * Uses each player's stored tournament_answers vs official correct_answer on Q7–Q9.
 *
 *   npm run rescore:mega-q789
 *   npm run rescore:mega-q789 -- --revert-vis-originals
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { applyTournamentScoring } from "@/lib/scoring/tournament-scoring";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";
import { scoreTournamentAnswers, tournamentQuestionsToScore } from "@/lib/scoring/tournament-scoring";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seasonYear = Number(process.env.SEASON_YEAR ?? 2026);
const revertVis = process.argv.includes("--revert-vis-originals");

const Q7_9_OFFICIAL: Record<number, string> = {
  7: "RCB",
  8: "Vaibhav Sooryavansi",
  9: "None of the above",
};

const VIS_ORIGINAL: Record<number, string> = {
  7: "PBKS",
  8: "Virat Kohli",
};

async function temporarilyUnlock(supabase: ReturnType<typeof createClient>) {
  const { data: cfg } = await supabase
    .from("tournament_config")
    .select("answer_lock_utc")
    .eq("season_year", seasonYear)
    .maybeSingle();
  const priorLock = (cfg?.answer_lock_utc as string | null) ?? null;
  const now = new Date().toISOString();
  await supabase
    .from("tournament_config")
    .update({ answer_lock_utc: "2099-12-31T23:59:59Z", updated_at: now })
    .eq("season_year", seasonYear);
  return priorLock;
}

async function restoreLock(
  supabase: ReturnType<typeof createClient>,
  priorLock: string | null,
) {
  if (!priorLock) return;
  await supabase
    .from("tournament_config")
    .update({ answer_lock_utc: priorLock, updated_at: new Date().toISOString() })
    .eq("season_year", seasonYear);
}

async function main() {
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: questions, error: qErr } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, correct_answer")
    .eq("season_year", seasonYear)
    .in("slot_no", [7, 8, 9]);
  if (qErr || !questions?.length) {
    console.error(qErr?.message ?? "Q7–Q9 missing");
    process.exit(1);
  }

  const now = new Date().toISOString();
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
        console.error(`Q${slot} official update failed:`, error.message);
        process.exit(1);
      }
      console.log(`Set Q${slot} official → ${official}`);
    }
  }

  if (revertVis) {
    const { data: vis } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", "Vis")
      .maybeSingle();
    if (vis) {
      const priorLock = await temporarilyUnlock(supabase);
      for (const q of questions) {
        const slot = Number(q.slot_no);
        const orig = VIS_ORIGINAL[slot];
        if (!orig) continue;
        const { error } = await supabase.from("tournament_answers").upsert(
          {
            user_id: vis.id,
            question_id: q.id,
            answer_text: orig,
            updated_at: now,
          },
          { onConflict: "user_id,question_id" },
        );
        if (error) {
          console.error(`Vis Q${slot} revert failed:`, error.message);
          process.exit(1);
        }
        console.log(`Vis Q${slot} reverted → ${orig}`);
      }
      await restoreLock(supabase, priorLock);
    }
  }

  console.log("\nApplying tournament scoring (all Mega Bonus slots)...");
  const result = await applyTournamentScoring(supabase, seasonYear);
  if (!result.ok) {
    console.error("Scoring failed:", result.error);
    process.exit(1);
  }
  console.log(`  ${result.ledgerRows} tournament ledger row(s).`);

  await syncProfilePointsFromLedger(supabase);

  // Q7–Q9 breakdown per player
  const { data: cfg } = await supabase
    .from("scoring_config")
    .select("tournament_slot_points")
    .eq("season_year", seasonYear)
    .maybeSingle();
  const slotPts = Array.isArray(cfg?.tournament_slot_points)
    ? (cfg.tournament_slot_points as number[])
    : [2, 2, 2, 2, 3, 3, 5, 3, 3];

  const { data: allQ } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, correct_answer")
    .eq("season_year", seasonYear)
    .order("slot_no");
  const toScore = tournamentQuestionsToScore(allQ ?? [], slotPts);
  const q789 = toScore.filter((q) => q.slotNo >= 7);

  const { data: profiles } = await supabase.from("profiles").select("id, display_name").order("display_name");
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));

  const { data: answerRows } = await supabase
    .from("tournament_answers")
    .select("user_id, question_id, answer_text, tournament_questions!inner(slot_no, season_year)")
    .eq("tournament_questions.season_year", seasonYear);

  const slotToId = new Map(q789.map((q) => [q.slotNo, q.id]));
  const answersForScore: { user_id: unknown; question_id: unknown; answer_text: unknown }[] = [];
  for (const row of answerRows ?? []) {
    const slotNo = Number(
      (row as { tournament_questions?: { slot_no?: unknown } }).tournament_questions?.slot_no ?? 0,
    );
    const currentId = slotToId.get(slotNo);
    if (!currentId) continue;
    answersForScore.push({
      user_id: row.user_id,
      question_id: currentId,
      answer_text: row.answer_text,
    });
  }

  const preview = scoreTournamentAnswers(q789, answersForScore, now);
  const byUser = new Map<string, { total: number; slots: number[] }>();
  for (const r of preview) {
    const uid = r.user_id;
    if (!byUser.has(uid)) byUser.set(uid, { total: 0, slots: [] });
    const u = byUser.get(uid)!;
    u.total += r.points_delta;
    const slot = Number(r.reason.replace("tournament_slot_", ""));
    u.slots.push(slot);
  }

  console.log("\n=== Q7–Q9 points per player ===\n");
  const sorted = [...byUser.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [uid, { total, slots }] of sorted) {
    const name = nameById.get(uid) ?? uid;
    console.log(
      `${name.padEnd(8)} +${total} pts  (slots: ${slots.sort((a, b) => a - b).join(", ") || "—"})`,
    );
  }

  const { data: leaderboard } = await supabase
    .from("profiles")
    .select("display_name, current_points")
    .order("current_points", { ascending: false });
  console.log("\n=== Leaderboard ===\n");
  leaderboard?.forEach((p, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${p.display_name.padEnd(8)} ${p.current_points}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
