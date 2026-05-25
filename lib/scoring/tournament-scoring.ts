import type { SupabaseClient } from "@supabase/supabase-js";
import { normAnswer } from "@/lib/scoring/normalize";

const TOP4_SCORING_ANSWERS = ["RCB", "GT", "SRH", "RR"] as const;
const TOP4_SCORING_ANSWER_TEXT = TOP4_SCORING_ANSWERS.join("\n");
const TOP4_SCORING_ANSWER_SET = new Set(
  TOP4_SCORING_ANSWERS.map((answer) => normAnswer(answer)),
);

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

const TEAM_ANSWER_ALIASES = new Map<string, string>([
  ["CHENNAI SUPER KINGS", "CSK"],
  ["DELHI CAPITALS", "DC"],
  ["GUJARAT TITANS", "GT"],
  ["KOLKATA KNIGHT RIDERS", "KKR"],
  ["LUCKNOW SUPER GIANTS", "LSG"],
  ["MUMBAI INDIANS", "MI"],
  ["PUNJAB KINGS", "PBKS"],
  ["ROYAL CHALLENGERS BANGALORE", "RCB"],
  ["ROYAL CHALLENGERS BENGALURU", "RCB"],
  ["RAJASTHAN ROYALS", "RR"],
  ["SUNRISERS HYDERABAD", "SRH"],
]);

function canonicalTournamentAnswer(raw: string | null | undefined): string {
  const normalized = normAnswer(raw);
  return TEAM_ANSWER_ALIASES.get(normalized) ?? normalized;
}

/**
 * Awards points for scorable tournament questions by comparing
 * `tournament_answers.answer_text` with slot-specific answer rules.
 */
export type TournamentScoreOutcome =
  | { ok: true; ledgerRows: number }
  | { ok: false; error: string };

export type TournamentQuestionForScoring = {
  id: string;
  slot_no: unknown;
  correct_answer: unknown;
};

export type TournamentAnswerForScoring = {
  user_id: unknown;
  question_id: unknown;
  answer_text: unknown;
};

export type TournamentScoringQuestion = {
  id: string;
  slotNo: number;
  pts: number;
  correctRaw: string | null;
};

export type TournamentLedgerRow = {
  user_id: string;
  source_id: string;
  points_delta: number;
  reason: string;
  awarded_at: string;
};

function parseAnswerSet(raw: string | null | undefined): Set<string> {
  const src = String(raw ?? "").trim();
  if (!src) return new Set();
  const parts = src
    .split(/\r?\n|,/)
    .map((s) => canonicalTournamentAnswer(s))
    .filter(Boolean);
  return new Set(parts);
}

function hasAnswer(raw: string | null | undefined): boolean {
  return parseAnswerSet(raw).size > 0;
}

function isTop4Slot(slotNo: number): boolean {
  return slotNo >= 1 && slotNo <= 4;
}

function isFinalistsSlot(slotNo: number): boolean {
  return slotNo >= 5 && slotNo <= 6;
}

export function isTop4ScoringAnswer(raw: string | null | undefined): boolean {
  const normalized = canonicalTournamentAnswer(raw);
  if (!normalized) return false;
  if (TOP4_SCORING_ANSWER_SET.has(normalized)) return true;

  return normalized
    .split(/[^A-Z0-9]+/)
    .some((part) => TOP4_SCORING_ANSWER_SET.has(part));
}

export function tournamentQuestionsToScore(
  questions: TournamentQuestionForScoring[],
  slotPts: number[],
): TournamentScoringQuestion[] {
  const rows = questions
    .map((q) => {
      const slotNo = Number(q.slot_no ?? 0);
      const top4Slot = isTop4Slot(slotNo);
      return {
        id: q.id,
        slotNo,
        pts: top4Slot ? 2 : Number(slotPts[slotNo - 1] ?? 2),
        correctRaw: top4Slot
          ? TOP4_SCORING_ANSWER_TEXT
          : (q.correct_answer as string | null) ?? null,
      };
    })
    .filter((q) => q.id && q.slotNo > 0);

  const finalistsActive = rows.some((q) => isFinalistsSlot(q.slotNo) && hasAnswer(q.correctRaw));

  return rows.filter((q) => {
    if (isTop4Slot(q.slotNo)) return true;
    if (isFinalistsSlot(q.slotNo)) return finalistsActive;
    return hasAnswer(q.correctRaw);
  });
}

export function scoreTournamentAnswers(
  questions: TournamentScoringQuestion[],
  answers: TournamentAnswerForScoring[],
  awardedAt: string,
): TournamentLedgerRow[] {
  const qById = new Map(questions.map((q) => [q.id, q]));

  // Group scoring rules:
  // - Slots 1..4: fixed Top-4 set; each slot scores independently.
  // - Slots 5..6: unique overlap vs Finalists set (one team can score only once across these slots)
  const finalistsCorrect = new Set<string>();
  for (const q of questions) {
    const target = isFinalistsSlot(q.slotNo) ? finalistsCorrect : null;
    if (!target) continue;
    for (const v of parseAnswerSet(q.correctRaw)) target.add(v);
  }

  const answersByUser = new Map<
    string,
    { questionId: string; slotNo: number; guess: string }[]
  >();
  for (const a of answers) {
    const questionId = a.question_id as string;
    const q = qById.get(questionId);
    if (!q) continue;
    const guess = canonicalTournamentAnswer(a.answer_text as string);
    if (!guess) continue;
    const uid = a.user_id as string;
    if (!answersByUser.has(uid)) answersByUser.set(uid, []);
    answersByUser.get(uid)!.push({ questionId, slotNo: q.slotNo, guess });
  }

  const ledgerRows: TournamentLedgerRow[] = [];
  for (const [uid, rows] of answersByUser) {
    const bySlot = [...rows].sort((a, b) => a.slotNo - b.slotNo);
    const usedFinalists = new Set<string>();

    for (const r of bySlot) {
      const q = qById.get(r.questionId);
      if (!q) continue;
      let matched = false;
      if (isTop4Slot(r.slotNo)) {
        matched = isTop4ScoringAnswer(r.guess);
      } else if (isFinalistsSlot(r.slotNo) && finalistsCorrect.size > 0) {
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
        awarded_at: awardedAt,
      });
    }
  }

  return ledgerRows;
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

  const toScore = tournamentQuestionsToScore(questions ?? [], slotPts);
  if (toScore.length === 0) {
    return { ok: false, error: "Set correct_answer on at least one tournament question." };
  }

  const now = new Date().toISOString();
  const toScoreIds = new Set(toScore.map((q) => q.id));
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

  const ledgerRows = scoreTournamentAnswers(toScore, allAnswers ?? [], now);
  for (const row of ledgerRows) {
    profileDelta.set(row.user_id, (profileDelta.get(row.user_id) ?? 0) + row.points_delta);
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
