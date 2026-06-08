import type { SupabaseClient } from "@supabase/supabase-js";
import { normAnswer } from "@/lib/scoring/normalize";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

const TOP4_SCORING_ANSWERS = ["RCB", "GT", "SRH", "RR"] as const;
const TOP4_SCORING_ANSWER_TEXT = TOP4_SCORING_ANSWERS.join("\n");
const TOP4_SCORING_ANSWER_SET = new Set(
  TOP4_SCORING_ANSWERS.map((answer) => normAnswer(answer)),
);

const FINALISTS_SCORING_ANSWERS = ["RCB", "GT"] as const;
const FINALISTS_SCORING_ANSWER_TEXT = FINALISTS_SCORING_ANSWERS.join("\n");
const FINALISTS_SCORING_ANSWER_SET = new Set(
  FINALISTS_SCORING_ANSWERS.map((answer) => normAnswer(answer)),
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

function isAnswerInSet(
  raw: string | null | undefined,
  allowed: Set<string>,
): boolean {
  const canonical = canonicalTournamentAnswer(raw);
  if (!canonical) return false;
  if (allowed.has(canonical)) return true;

  return canonical
    .split(/[^A-Z0-9]+/)
    .some((part) => allowed.has(part));
}

export function isTop4ScoringAnswer(raw: string | null | undefined): boolean {
  return isAnswerInSet(raw, TOP4_SCORING_ANSWER_SET);
}

export function isFinalistsScoringAnswer(raw: string | null | undefined): boolean {
  return isAnswerInSet(raw, FINALISTS_SCORING_ANSWER_SET);
}

export function tournamentQuestionsToScore(
  questions: TournamentQuestionForScoring[],
  slotPts: number[],
): TournamentScoringQuestion[] {
  const finalistsActive = questions.some(
    (q) => isFinalistsSlot(Number(q.slot_no ?? 0)) && hasAnswer(q.correct_answer as string),
  );

  const rows = questions
    .map((q) => {
      const slotNo = Number(q.slot_no ?? 0);
      const top4Slot = isTop4Slot(slotNo);
      const finalistsSlot = isFinalistsSlot(slotNo);
      return {
        id: q.id,
        slotNo,
        pts: top4Slot
          ? 2
          : finalistsSlot
            ? 3
            : Number(slotPts[slotNo - 1] ?? 2),
        correctRaw: top4Slot
          ? TOP4_SCORING_ANSWER_TEXT
          : finalistsSlot && finalistsActive
            ? FINALISTS_SCORING_ANSWER_TEXT
            : (q.correct_answer as string | null) ?? null,
      };
    })
    .filter((q) => q.id && q.slotNo > 0);

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
  // - Slots 1..4: fixed Top-4 set; each correct team scores at most once per user (first matching slot).
  // - Slots 5..6: fixed Finalists set (RCB, GT); 3 pts per slot; each team at most once per user.
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
    const usedTop4 = new Set<string>();
    const usedFinalists = new Set<string>();

    for (const r of bySlot) {
      const q = qById.get(r.questionId);
      if (!q) continue;
      let matched = false;
      if (isTop4Slot(r.slotNo)) {
        if (isTop4ScoringAnswer(r.guess) && !usedTop4.has(r.guess)) {
          matched = true;
          usedTop4.add(r.guess);
        }
      } else if (isFinalistsSlot(r.slotNo)) {
        if (isFinalistsScoringAnswer(r.guess) && !usedFinalists.has(r.guess)) {
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
  const toScoreIdList = toScore.map((q) => q.id);

  const slotToCurrentId = new Map(toScore.map((q) => [q.slotNo, q.id]));

  const { data: answerRows, error: aErr } = await supabase
    .from("tournament_answers")
    .select("user_id, question_id, answer_text, tournament_questions!inner(slot_no, season_year)")
    .eq("tournament_questions.season_year", seasonYear);
  if (aErr) return { ok: false, error: aErr.message };

  const allAnswers: TournamentAnswerForScoring[] = [];
  for (const row of answerRows ?? []) {
    const slotNo = Number(
      (row as { tournament_questions?: { slot_no?: unknown } }).tournament_questions?.slot_no ?? 0,
    );
    const currentId = slotToCurrentId.get(slotNo);
    if (!currentId) continue;
    allAnswers.push({
      user_id: row.user_id,
      question_id: currentId,
      answer_text: row.answer_text,
    });
  }

  const ledgerRows = scoreTournamentAnswers(toScore, allAnswers, now);

  if (toScoreIdList.length > 0) {
    const { error: delErr } = await supabase
      .from("points_ledger")
      .delete()
      .eq("source_type", "tournament_question")
      .in("source_id", toScoreIdList);
    if (delErr) return { ok: false, error: delErr.message };
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

  await syncProfilePointsFromLedger(supabase);

  const { error: scoreStampErr } = await supabase
    .from("tournament_questions")
    .update({ scored_at: now, updated_at: now })
    .in("id", toScoreIdList);
  if (scoreStampErr) return { ok: false, error: scoreStampErr.message };

  return { ok: true, ledgerRows: ledgerRows.length };
}
