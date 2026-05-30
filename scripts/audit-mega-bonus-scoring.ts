/**
 * Per-player Mega Bonus breakdown: answers, expected points, ledger, profile drift.
 *
 *   npm run audit:mega-bonus
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

function slotFromReason(reason: string): number {
  const m = reason.match(/tournament_slot_(\d+)/);
  return m ? Number(m[1]) : 0;
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
    .select("id, slot_no, correct_answer, scored_at")
    .eq("season_year", seasonYear)
    .order("slot_no", { ascending: true });
  if (qErr) {
    console.error(qErr.message);
    process.exit(1);
  }

  const { data: scoreCfg } = await supabase
    .from("scoring_config")
    .select("tournament_slot_points")
    .eq("season_year", seasonYear)
    .maybeSingle();

  const slotPts = Array.isArray(scoreCfg?.tournament_slot_points)
    ? (scoreCfg.tournament_slot_points as number[])
    : [2, 2, 2, 2, 3, 3, 5, 3, 3];

  const toScore = tournamentQuestionsToScore(questions ?? [], slotPts);
  const slotToId = new Map(toScore.map((q) => [q.slotNo, q.id]));
  const idToSlot = new Map(toScore.map((q) => [q.id, q.slotNo]));

  console.log("Scorable slots:", toScore.map((q) => q.slotNo).join(", "));

  const { data: answerRows } = await supabase
    .from("tournament_answers")
    .select("user_id, question_id, answer_text, tournament_questions!inner(slot_no, season_year)")
    .eq("tournament_questions.season_year", seasonYear);

  const answersForScore: {
    user_id: unknown;
    question_id: unknown;
    answer_text: unknown;
  }[] = [];
  let orphanAnswers = 0;
  for (const row of answerRows ?? []) {
    const slotNo = Number(
      (row as { tournament_questions?: { slot_no?: unknown } }).tournament_questions?.slot_no ?? 0,
    );
    const currentId = slotToId.get(slotNo);
    if (!currentId) {
      orphanAnswers += 1;
      continue;
    }
    answersForScore.push({
      user_id: row.user_id,
      question_id: currentId,
      answer_text: row.answer_text,
    });
  }
  if (orphanAnswers > 0) {
    console.log(`\n⚠ ${orphanAnswers} answer row(s) on non-scorable slots (ignored).`);
  }

  const preview = scoreTournamentAnswers(
    toScore,
    answersForScore,
    new Date().toISOString(),
  );

  const previewByUser = new Map<string, { total: number; slots: Map<number, number> }>();
  for (const row of preview) {
    const slot = slotFromReason(row.reason);
    if (!previewByUser.has(row.user_id)) {
      previewByUser.set(row.user_id, { total: 0, slots: new Map() });
    }
    const u = previewByUser.get(row.user_id)!;
    u.total += row.points_delta;
    u.slots.set(slot, (u.slots.get(slot) ?? 0) + row.points_delta);
  }

  const qIds = toScore.map((q) => q.id);
  const { data: ledger } = await supabase
    .from("points_ledger")
    .select("user_id, source_id, points_delta, reason")
    .eq("source_type", "tournament_question")
    .in("source_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"]);

  const ledgerByUser = new Map<string, { total: number; slots: Map<number, number> }>();
  for (const row of ledger ?? []) {
    const uid = row.user_id as string;
    const slot = idToSlot.get(row.source_id as string) ?? slotFromReason(String(row.reason ?? ""));
    if (!ledgerByUser.has(uid)) ledgerByUser.set(uid, { total: 0, slots: new Map() });
    const u = ledgerByUser.get(uid)!;
    const d = Number(row.points_delta ?? 0);
    u.total += d;
    if (slot > 0) u.slots.set(slot, (u.slots.get(slot) ?? 0) + d);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, legacy_points, current_points");
  const { data: allLedger } = await supabase.from("points_ledger").select("user_id, points_delta");

  const sumAllLedger = new Map<string, number>();
  for (const row of allLedger ?? []) {
    const uid = row.user_id as string;
    sumAllLedger.set(uid, (sumAllLedger.get(uid) ?? 0) + Number(row.points_delta ?? 0));
  }

  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));

  console.log("\n=== Per player (expected vs ledger) ===\n");
  const allUserIds = new Set([...previewByUser.keys(), ...ledgerByUser.keys()]);
  const mismatches: string[] = [];

  for (const uid of allUserIds) {
    const name = names.get(uid) ?? uid.slice(0, 8);
    const exp = previewByUser.get(uid);
    const led = ledgerByUser.get(uid);
    const expTotal = exp?.total ?? 0;
    const ledTotal = led?.total ?? 0;
    const expTop4 = [1, 2, 3, 4].reduce((s, n) => s + (exp?.slots.get(n) ?? 0), 0);
    const ledTop4 = [1, 2, 3, 4].reduce((s, n) => s + (led?.slots.get(n) ?? 0), 0);
    const expFin = [5, 6].reduce((s, n) => s + (exp?.slots.get(n) ?? 0), 0);
    const ledFin = [5, 6].reduce((s, n) => s + (led?.slots.get(n) ?? 0), 0);

    if (expTotal !== ledTotal || expTop4 !== ledTop4 || expFin !== ledFin) {
      mismatches.push(
        `${name}: expected total=${expTotal} (Q1-4=${expTop4}, Q5-6=${expFin}) | ledger total=${ledTotal} (Q1-4=${ledTop4}, Q5-6=${ledFin})`,
      );
    }
  }

  if (mismatches.length === 0) {
    console.log("✓ Ledger matches expected scoring for all players with tournament rows.");
  } else {
    console.log(`⚠ ${mismatches.length} player(s) with ledger mismatch:\n`);
    for (const line of mismatches) console.log(`  ${line}`);
    console.log("\n  Run: npm run fix:mega-bonus-top4");
  }

  console.log("\n=== Leaderboard check ===\n");
  let profileDrift = 0;
  for (const p of profiles ?? []) {
    const uid = p.id as string;
    const expected = Number(p.legacy_points ?? 0) + (sumAllLedger.get(uid) ?? 0);
    const current = Number(p.current_points ?? 0);
    if (current !== expected) {
      profileDrift += 1;
      console.log(
        `  ${p.display_name}: current=${current} expected=${expected} (drift ${current - expected})`,
      );
    }
  }
  if (profileDrift === 0) console.log("✓ All profiles match legacy + ledger.");
  else console.log(`\n⚠ ${profileDrift} profile(s) drifted. Run: npm run sync:points`);

  const previewTop4Rows = preview.filter((r) => slotFromReason(r.reason) <= 4).length;
  const previewFinRows = preview.filter((r) => {
    const s = slotFromReason(r.reason);
    return s >= 5 && s <= 6;
  }).length;
  console.log(
    `\nDry-run ledger rows: ${preview.length} (Q1-4: ${previewTop4Rows}, Q5-6: ${previewFinRows})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
