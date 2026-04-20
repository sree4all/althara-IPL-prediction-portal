import type { SupabaseClient } from "@supabase/supabase-js";
import { normAnswer } from "@/lib/scoring/normalize";

function slotPointsArray(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((n) => Number(n ?? 2));
  }
  try {
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(j)) return j.map((n) => Number(n ?? 2));
  } catch {
    /* ignore */
  }
  return [2, 2, 2, 2, 2];
}

/**
 * Awards points for each tournament question where `correct_answer` is set,
 * comparing `tournament_answers.answer_text` (same normalization as match bonus).
 */
export type TournamentScoreOutcome =
  | { ok: true; ledgerRows: number }
  | { ok: false; error: string };

export async function applyTournamentScoring(
  supabase: SupabaseClient,
  seasonYear: number,
): Promise<TournamentScoreOutcome> {
  const { data: cfg, error: cErr } = await supabase
    .from("scoring_config")
    .select("tournament_slot_points")
    .eq("season_year", seasonYear)
    .maybeSingle();
  if (cErr) {
    return { ok: false, error: cErr.message };
  }
  const slotPts = slotPointsArray(cfg?.tournament_slot_points);

  const { data: questions, error: qErr } = await supabase
    .from("tournament_questions")
    .select("id, slot_no, correct_answer")
    .eq("season_year", seasonYear)
    .order("slot_no", { ascending: true });
  if (qErr) {
    return { ok: false, error: qErr.message };
  }

  const toScore = (questions ?? []).filter((q) => (q.correct_answer as string)?.trim());
  if (toScore.length === 0) {
    return { ok: false, error: "Set correct_answer on at least one tournament question." };
  }

  let ledgerInserts = 0;
  const now = new Date().toISOString();

  for (const q of toScore) {
    const qid = q.id as string;
    const slotNo = Number(q.slot_no ?? 1);
    const pts = Number(slotPts[slotNo - 1] ?? 2);
    const correct = normAnswer(q.correct_answer as string);

    const { data: oldLedger } = await supabase
      .from("points_ledger")
      .select("user_id, points_delta")
      .eq("source_type", "tournament_question")
      .eq("source_id", qid);

    const refundByUser = new Map<string, number>();
    for (const row of oldLedger ?? []) {
      const uid = row.user_id as string;
      const d = Number(row.points_delta ?? 0);
      refundByUser.set(uid, (refundByUser.get(uid) ?? 0) + d);
    }

    if (oldLedger?.length) {
      const { error: delErr } = await supabase
        .from("points_ledger")
        .delete()
        .eq("source_type", "tournament_question")
        .eq("source_id", qid);
      if (delErr) {
        return { ok: false, error: delErr.message };
      }
    }

    for (const [uid, sum] of refundByUser) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("current_points")
        .eq("id", uid)
        .maybeSingle();
      const cur = Number(prof?.current_points ?? 0);
      await supabase
        .from("profiles")
        .update({ current_points: cur - sum, updated_at: now })
        .eq("id", uid);
    }

    const { data: answers } = await supabase
      .from("tournament_answers")
      .select("user_id, answer_text")
      .eq("question_id", qid);

    for (const a of answers ?? []) {
      const uid = a.user_id as string;
      const guess = normAnswer(a.answer_text as string);
      if (!guess || guess !== correct) continue;

      const { error: insErr } = await supabase.from("points_ledger").insert({
        user_id: uid,
        source_type: "tournament_question",
        source_id: qid,
        points_delta: pts,
        reason: `tournament_slot_${slotNo}`,
        awarded_at: now,
      });
      if (insErr) {
        return { ok: false, error: insErr.message };
      }
      ledgerInserts += 1;

      const { data: prof } = await supabase
        .from("profiles")
        .select("current_points")
        .eq("id", uid)
        .maybeSingle();
      const cur = Number(prof?.current_points ?? 0);
      await supabase
        .from("profiles")
        .update({ current_points: cur + pts, updated_at: now })
        .eq("id", uid);
    }

    await supabase
      .from("tournament_questions")
      .update({ scored_at: now, updated_at: now })
      .eq("id", qid);
  }

  return { ok: true, ledgerRows: ledgerInserts };
}
