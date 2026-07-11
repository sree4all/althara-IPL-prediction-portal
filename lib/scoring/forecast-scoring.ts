import type { SupabaseClient } from "@supabase/supabase-js";
import { normAnswer } from "@/lib/scoring/normalize";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

export const FORECAST_POINTS = {
  semi: 10,
  finalist: 15,
  winner: 20,
} as const;

/**
 * The semi-finalist question has been discarded (see forecast-lock.ts): users
 * were able to edit it after the quarter-finals, so it no longer counts. Only
 * finalists (2 × 15) and the winner (20) are scored — max 50 points.
 */
export const FORECAST_MAX_POINTS =
  FORECAST_POINTS.finalist * 2 + FORECAST_POINTS.winner;

export const FORECAST_QF_MATCH_NUMBERS = [97, 98, 99, 100] as const;
export const FORECAST_SF_MATCH_NUMBERS = [101, 102] as const;
export const FORECAST_FINAL_MATCH_NUMBER = 104;

const FORECAST_SCORING_MATCH_NUMBERS = [
  ...FORECAST_QF_MATCH_NUMBERS,
  ...FORECAST_SF_MATCH_NUMBERS,
  FORECAST_FINAL_MATCH_NUMBER,
] as const;

export type ForecastActuals = {
  semiFinalists: string[] | null;
  finalists: string[] | null;
  winner: string | null;
};

export type ForecastAnswerForScoring = {
  id: string;
  user_id: string;
  semi_finalist_teams: string[];
  finalist_teams: string[];
  winner_team: string | null;
};

export type ForecastLedgerRow = {
  user_id: string;
  source_id: string;
  points_delta: number;
  reason: string;
  awarded_at: string;
};

export type ForecastSlotScoring = {
  earned: number;
  max: number;
  correct_teams: string[];
  scored: boolean;
};

export type ForecastScoringBreakdown = {
  points_config: typeof FORECAST_POINTS;
  actuals: {
    semi_finalists: string[];
    finalists: string[];
    winner: string | null;
  };
  scoring: {
    semi: ForecastSlotScoring;
    finalist: ForecastSlotScoring;
    winner: ForecastSlotScoring & { correct: boolean };
    total_earned: number;
    total_max: typeof FORECAST_MAX_POINTS;
  };
};

export type ForecastScoreOutcome =
  | { ok: true; ledgerRows: number }
  | { ok: false; error: string };

function normSet(teams: string[]): Set<string> {
  return new Set(teams.map((t) => normAnswer(t)).filter(Boolean));
}

function teamsInSet(picks: string[], actualSet: Set<string>): string[] {
  return picks.filter((t) => actualSet.has(normAnswer(t)));
}

export function isForecastScoringMatch(matchNumber: number | null | undefined): boolean {
  if (matchNumber == null) return false;
  return (FORECAST_SCORING_MATCH_NUMBERS as readonly number[]).includes(matchNumber);
}

export async function loadForecastActuals(
  supabase: SupabaseClient,
  seasonYear: number,
): Promise<ForecastActuals> {
  const { data: rows, error } = await supabase
    .from("matches")
    .select("match_number, winner, status")
    .eq("season_year", seasonYear)
    .in("match_number", [...FORECAST_SCORING_MATCH_NUMBERS]);

  if (error) throw new Error(error.message);

  const byNum = new Map<number, { winner: string | null; status: string }>();
  for (const row of rows ?? []) {
    const num = Number(row.match_number);
    if (!Number.isFinite(num)) continue;
    byNum.set(num, {
      winner: (row.winner as string | null) ?? null,
      status: String(row.status ?? ""),
    });
  }

  const completedWinner = (matchNumber: number): string | null => {
    const row = byNum.get(matchNumber);
    if (!row || row.status !== "completed" || !row.winner?.trim()) return null;
    return row.winner.trim();
  };

  const semiWinners = FORECAST_QF_MATCH_NUMBERS.map((n) => completedWinner(n));
  const semiFinalists =
    semiWinners.every((w) => w != null) ? (semiWinners as string[]) : null;

  const finalistWinners = FORECAST_SF_MATCH_NUMBERS.map((n) => completedWinner(n));
  const finalists =
    finalistWinners.every((w) => w != null) ? (finalistWinners as string[]) : null;

  const winner = completedWinner(FORECAST_FINAL_MATCH_NUMBER);

  return { semiFinalists, finalists, winner };
}

export function computeForecastScoringBreakdown(
  answer: Pick<
    ForecastAnswerForScoring,
    "semi_finalist_teams" | "finalist_teams" | "winner_team"
  >,
  actuals: ForecastActuals,
): ForecastScoringBreakdown {
  const finalistCorrect =
    actuals.finalists != null
      ? teamsInSet(answer.finalist_teams, normSet(actuals.finalists))
      : [];
  const winnerCorrect =
    actuals.winner != null &&
    answer.winner_team != null &&
    normAnswer(answer.winner_team) === normAnswer(actuals.winner);

  const finalistEarned = finalistCorrect.length * FORECAST_POINTS.finalist;
  const winnerEarned = winnerCorrect ? FORECAST_POINTS.winner : 0;

  return {
    points_config: FORECAST_POINTS,
    actuals: {
      // Semi-finalists are discarded from scoring; keep the field empty so the
      // UI never renders semi-finalist results.
      semi_finalists: [],
      finalists: actuals.finalists ?? [],
      winner: actuals.winner,
    },
    scoring: {
      semi: {
        earned: 0,
        max: 0,
        correct_teams: [],
        scored: false,
      },
      finalist: {
        earned: finalistEarned,
        max: FORECAST_POINTS.finalist * 2,
        correct_teams: finalistCorrect,
        scored: actuals.finalists != null,
      },
      winner: {
        earned: winnerEarned,
        max: FORECAST_POINTS.winner,
        correct_teams: winnerCorrect && answer.winner_team ? [answer.winner_team] : [],
        correct: winnerCorrect,
        scored: actuals.winner != null,
      },
      total_earned: finalistEarned + winnerEarned,
      total_max: FORECAST_MAX_POINTS,
    },
  };
}

function reasonKey(kind: "semi" | "finalist" | "winner", team: string): string {
  return `forecast_${kind}:${normAnswer(team)}`;
}

export function scoreForecastAnswer(
  answer: ForecastAnswerForScoring,
  actuals: ForecastActuals,
  awardedAt: string,
): ForecastLedgerRow[] {
  const breakdown = computeForecastScoringBreakdown(answer, actuals);
  const rows: ForecastLedgerRow[] = [];

  // Semi-finalists are discarded and never award points.
  if (breakdown.scoring.finalist.scored) {
    for (const team of breakdown.scoring.finalist.correct_teams) {
      rows.push({
        user_id: answer.user_id,
        source_id: answer.id,
        points_delta: FORECAST_POINTS.finalist,
        reason: reasonKey("finalist", team),
        awarded_at: awardedAt,
      });
    }
  }

  if (breakdown.scoring.winner.scored && breakdown.scoring.winner.correct && answer.winner_team) {
    rows.push({
      user_id: answer.user_id,
      source_id: answer.id,
      points_delta: FORECAST_POINTS.winner,
      reason: reasonKey("winner", answer.winner_team),
      awarded_at: awardedAt,
    });
  }

  return rows;
}

export async function applyForecastScoring(
  supabase: SupabaseClient,
  seasonYear: number,
): Promise<ForecastScoreOutcome> {
  const [actuals, answersRes] = await Promise.all([
    loadForecastActuals(supabase, seasonYear),
    supabase
      .from("tournament_forecast_answers")
      .select("id, user_id, semi_finalist_teams, finalist_teams, winner_team")
      .eq("season_year", seasonYear),
  ]);

  if (answersRes.error) {
    if (answersRes.error.message.includes("tournament_forecast_answers")) {
      return { ok: true, ledgerRows: 0 };
    }
    return { ok: false, error: answersRes.error.message };
  }

  const answers = (answersRes.data ?? []) as ForecastAnswerForScoring[];
  if (answers.length === 0) {
    return { ok: true, ledgerRows: 0 };
  }

  const now = new Date().toISOString();
  const ledgerRows = answers.flatMap((a) => scoreForecastAnswer(a, actuals, now));
  const answerIds = answers.map((a) => a.id);

  const { error: delErr } = await supabase
    .from("points_ledger")
    .delete()
    .eq("source_type", "forecast")
    .in("source_id", answerIds);
  if (delErr) return { ok: false, error: delErr.message };

  if (ledgerRows.length > 0) {
    const { error: insErr } = await supabase.from("points_ledger").insert(
      ledgerRows.map((r) => ({
        user_id: r.user_id,
        source_type: "forecast",
        source_id: r.source_id,
        points_delta: r.points_delta,
        reason: r.reason,
        awarded_at: r.awarded_at,
      })),
    );
    if (insErr) return { ok: false, error: insErr.message };
  }

  await syncProfilePointsFromLedger(supabase);

  return { ok: true, ledgerRows: ledgerRows.length };
}
