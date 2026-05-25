/**
 * Read-only Supabase health check (requires service role to bypass RLS).
 *
 *   npm run diagnose:supabase
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import {
  scoreTournamentAnswers,
  tournamentQuestionsToScore,
} from "@/lib/scoring/tournament-scoring";

for (const name of [".env", ".env.local"] as const) {
  loadEnv({ path: resolve(process.cwd(), name), override: name === ".env.local" });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seasonYear = Number(process.env.SEASON_YEAR ?? 2026);

const EXPECTED_TOP4 = "RCB\nRR\nGT\nSRH";

function normalizeTop4(raw: string | null | undefined): string {
  return String(raw ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
    .join("\n");
}

async function main() {
  if (!url || !key) {
    console.error(
      "Missing env. Set in .env.local:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL\n" +
        "  SUPABASE_SERVICE_ROLE_KEY  (Dashboard → API Keys → Secret / service_role)\n" +
        "\nPublishable key alone cannot read data (RLS).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== Supabase diagnose ===");
  console.log("URL:", url);
  console.log("Season:", seasonYear);

  const tables = [
    "profiles",
    "matches",
    "tournament_config",
    "tournament_questions",
    "tournament_answers",
    "scoring_config",
    "points_ledger",
  ] as const;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    console.log(`  ${table}: ${error ? `ERROR ${error.message}` : count ?? 0}`);
  }

  const { data: cfg, error: cfgErr } = await supabase
    .from("tournament_config")
    .select("season_year, answer_lock_utc, mega_bonus_all_answers_visible, maintenance_mode")
    .eq("season_year", seasonYear)
    .maybeSingle();
  if (cfgErr?.message?.includes("mega_bonus_all_answers_visible")) {
    console.log("\n⚠ Migration 0023 may be missing (mega_bonus_all_answers_visible column).");
  } else if (cfg) {
    console.log("\ntournament_config:", cfg);
  } else {
    console.log("\n⚠ No tournament_config for season", seasonYear);
  }

  const { data: scoreCfg } = await supabase
    .from("scoring_config")
    .select("tournament_slot_points, match_winner_points, match_bonus_points")
    .eq("season_year", seasonYear)
    .maybeSingle();
  console.log("scoring_config slot points:", scoreCfg?.tournament_slot_points ?? "(missing)");

  const { data: questions, error: qErr } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, correct_answer, scored_at, question_text")
    .eq("season_year", seasonYear)
    .order("slot_no", { ascending: true });
  if (qErr) {
    console.error("tournament_questions:", qErr.message);
    process.exit(1);
  }

  console.log(`\ntournament_questions (${questions?.length ?? 0} rows):`);
  const top4 = (questions ?? []).filter((q) => Number(q.slot_no) <= 4);
  for (const q of questions ?? []) {
    const ca = String(q.correct_answer ?? "").replace(/\n/g, "\\n").slice(0, 60);
    console.log(
      `  slot ${q.slot_no}: scored_at=${q.scored_at ?? "null"} correct="${ca || "(empty)"}"`,
    );
  }

  const expectedNorm = normalizeTop4(EXPECTED_TOP4);
  const top4Mismatch = top4.filter(
    (q) => normalizeTop4(String(q.correct_answer ?? "")) !== expectedNorm,
  );
  if (top4.length < 4) {
    console.log("\n⚠ Expected 4 Top-4 questions (slots 1–4); run seed or migration 0027.");
  } else if (top4Mismatch.length > 0) {
    console.log(
      `\n⚠ Top-4 correct_answer mismatch on slot(s): ${top4Mismatch.map((q) => q.slot_no).join(", ")}`,
    );
    console.log("  Expected (any order):", EXPECTED_TOP4.replace(/\n/g, ", "));
    console.log("  Fix: npm run fix:mega-bonus-top4");
  } else {
    console.log("\n✓ Top-4 correct_answer set matches fixed scoring list (RCB, RR, GT, SRH).");
  }

  const { count: answerCount } = await supabase
    .from("tournament_answers")
    .select("*", { count: "exact", head: true });
  console.log(`\ntournament_answers total: ${answerCount ?? 0}`);

  const slotPts = Array.isArray(scoreCfg?.tournament_slot_points)
    ? (scoreCfg.tournament_slot_points as number[])
    : [2, 2, 2, 2, 3, 3, 5, 3, 3];
  const toScore = tournamentQuestionsToScore(questions ?? [], slotPts);
  const qIds = toScore.map((q) => q.id);
  const { data: answers } = await supabase
    .from("tournament_answers")
    .select("user_id, question_id, answer_text")
    .in("question_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"]);
  const preview = scoreTournamentAnswers(toScore, answers ?? [], new Date().toISOString());
  console.log(`\nDry-run tournament scoring: ${preview.length} ledger row(s) would be written.`);

  const top4Preview = preview.filter((r) => r.reason.startsWith("tournament_slot_") && Number(r.reason.replace("tournament_slot_", "")) <= 4);
  const top4Points = top4Preview.reduce((s, r) => s + r.points_delta, 0);
  console.log(`  Top-4 slot points in preview: ${top4Points} (${top4Preview.length} rows)`);

  const { data: ledgerSample } = await supabase
    .from("points_ledger")
    .select("source_type, reason, points_delta")
    .eq("source_type", "tournament_question")
    .like("reason", "tournament_slot_%")
    .limit(5);
  console.log("\nSample tournament_question ledger:", ledgerSample?.length ? ledgerSample : "(none)");

  const { data: profiles } = await supabase.from("profiles").select("id, display_name, legacy_points, current_points");
  const { data: ledger } = await supabase.from("points_ledger").select("user_id, points_delta");
  const sumByUser = new Map<string, number>();
  for (const row of ledger ?? []) {
    const uid = row.user_id as string;
    sumByUser.set(uid, (sumByUser.get(uid) ?? 0) + Number(row.points_delta ?? 0));
  }
  let drift = 0;
  for (const p of profiles ?? []) {
    const expected = Number(p.legacy_points ?? 0) + (sumByUser.get(p.id as string) ?? 0);
    if (Number(p.current_points ?? 0) !== expected) drift += 1;
  }
  console.log(`\nProfiles with points drift: ${drift} / ${profiles?.length ?? 0}`);
  if (drift > 0) console.log("  Run: npm run sync:points");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
