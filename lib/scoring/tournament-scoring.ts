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
  return [2, 2, 2, 2, 3, 3, 5, 3, 3];
}

/**
 * Awards points for each tournament question where `correct_answer` is set,
 * comparing `tournament_answers.answer_text` (same normalization as match bonus).
 */
export type TournamentScoreOutcome =
  | { ok: true; ledgerRows: number }
  | { ok: false; error: string };

function parseAnswerSet(raw: string | null | undefined): Set<string> {
  const src = String(raw ?? "").trim();
  if (!src) return new Set();
  const parts = src
    .split(/\r?\n|,/)
    .map((s) => normAnswer(s))
    .filter(Boolean);
  return new Set(parts);
}

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

  const now = new Date().toISOString();
  const toScoreIds = new Set(toScore.map((q) => q.id as string));
  const toScoreIdList = [...toScoreIds];

  const { data: oldLedger, error: oldErr } = await supabase
    .from("points_ledger")
    .select("user_id, source_id, points_delta")
    .eq("source_type", "tournament_question")
    .in("source_id", toScoreIdList);
  if (oldErr) return { ok: false, error: oldErr.message };

  const refundByUser = new Map<string, number>();
  for (const row of oldLedger ?? []) {
    const uid = row.user_id as string;
    const d = Number(row.points_delta ?? 0);
    refundByUser.set(uid, (refundByUser.get(uid) ?? 0) + d);
  }

  if ((oldLedger ?? []).length > 0) {
    const { error: delErr } = await supabase
      .from("points_ledger")
      .delete()
      .eq("source_type", "tournament_question")
      .in("source_id", toScoreIdList);
    if (delErr) return { ok: false, error: delErr.message };
  }

  const profileDelta = new Map<string, number>();
  for (const [uid, sum] of refundByUser) profileDelta.set(uid, (profileDelta.get(uid) ?? 0) - sum);

  const { data: allAnswers, error: aErr } = await supabase
    .from("tournament_answers")
    .select("user_id, question_id, answer_text")
    .in("question_id", toScoreIdList);
  if (aErr) return { ok: false, error: aErr.message };

  const qById = new Map(
    toScore.map((q) => [
      q.id as string,
      {
        slotNo: Number(q.slot_no ?? 0),
        pts: Number(slotPts[Number(q.slot_no ?? 1) - 1] ?? 2),
        correctRaw: (q.correct_answer as string | null) ?? null,
      },
    ]),
  );

  // Group scoring rules:
  // - Slots 1..4: unique overlap vs Top-4 set (one team can score only once across these slots)
  // - Slots 5..6: unique overlap vs Finalists set (one team can score only once across these slots)
  const top4QuestionIds = toScore
    .filter((q) => {
      const s = Number(q.slot_no ?? 0);
      return s >= 1 && s <= 4;
    })
    .map((q) => q.id as string);
  const finalistsQuestionIds = toScore
    .filter((q) => {
      const s = Number(q.slot_no ?? 0);
      return s >= 5 && s <= 6;
    })
    .map((q) => q.id as string);

  const top4Correct = new Set<string>();
  for (const qid of top4QuestionIds) {
    for (const v of parseAnswerSet(qById.get(qid)?.correctRaw)) top4Correct.add(v);
  }
  const finalistsCorrect = new Set<string>();
  for (const qid of finalistsQuestionIds) {
    for (const v of parseAnswerSet(qById.get(qid)?.correctRaw)) finalistsCorrect.add(v);
  }

  const answersByUser = new Map<
    string,
    { questionId: string; slotNo: number; guess: string }[]
  >();
  for (const a of allAnswers ?? []) {
    const questionId = a.question_id as string;
    const q = qById.get(questionId);
    if (!q) continue;
    const guess = normAnswer(a.answer_text as string);
    if (!guess) continue;
    const uid = a.user_id as string;
    if (!answersByUser.has(uid)) answersByUser.set(uid, []);
    answersByUser.get(uid)!.push({ questionId, slotNo: q.slotNo, guess });
  }

  const ledgerRows: {
    user_id: string;
    source_id: string;
    points_delta: number;
    reason: string;
    awarded_at: string;
  }[] = [];

  for (const [uid, rows] of answersByUser) {
    const bySlot = [...rows].sort((a, b) => a.slotNo - b.slotNo);
    const usedTop4 = new Set<string>();
    const usedFinalists = new Set<string>();

    for (const r of bySlot) {
      const q = qById.get(r.questionId);
      if (!q) continue;
      let matched = false;
      if (r.slotNo >= 1 && r.slotNo <= 4 && top4Correct.size > 0) {
        if (top4Correct.has(r.guess) && !usedTop4.has(r.guess)) {
          matched = true;
          usedTop4.add(r.guess);
        }
      } else if (r.slotNo >= 5 && r.slotNo <= 6 && finalistsCorrect.size > 0) {
        if (finalistsCorrect.has(r.guess) && !usedFinalists.has(r.guess)) {
          matched = true;
          usedFinalists.add(r.guess);
        }
      } else {
        // Non-group slots keep direct equality behavior.
        const single = [...parseAnswerSet(q.correctRaw)][0] ?? "";
        matched = Boolean(single) && r.guess === single;
      }
      if (!matched) continue;

      ledgerRows.push({
        user_id: uid,
        source_id: r.questionId,
        points_delta: q.pts,
        reason: `tournament_slot_${r.slotNo}`,
        awarded_at: now,
      });
      profileDelta.set(uid, (profileDelta.get(uid) ?? 0) + q.pts);
    }
  }

  if (ledgerRows.length > 0) {
    const { error: insErr } = await supabase.from("points_ledger").insert(
      ledgerRows.map((r) => ({
        user_id: r.user_id,
        source_type: "tournament_question",
        source_id: r.source_id,
        points_delta: r.points_delta,
        reason: r.reason,
        awarded_at: r.awarded_at,
      })),
    );
    if (insErr) return { ok: false, error: insErr.message };
  }

  for (const [uid, delta] of profileDelta) {
    if (!delta) continue;
    const { data: prof } = await supabase
      .from("profiles")
      .select("current_points")
      .eq("id", uid)
      .maybeSingle();
    const cur = Number(prof?.current_points ?? 0);
    await supabase
      .from("profiles")
      .update({ current_points: cur + delta, updated_at: now })
      .eq("id", uid);
  }

  const { error: scoreStampErr } = await supabase
    .from("tournament_questions")
    .update({ scored_at: now, updated_at: now })
    .in("id", toScoreIdList);
  if (scoreStampErr) return { ok: false, error: scoreStampErr.message };

  return { ok: true, ledgerRows: ledgerRows.length };
}
