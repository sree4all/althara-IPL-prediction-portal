import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTournamentStage } from "@/lib/fifa/stages";
import {
  dedupeMatchesByFixtureNumber,
  fixtureNumber,
  idsByFixtureNumber,
} from "@/lib/matches/dedupe-by-match-number";
import { MATCH_BONUS_POINTS } from "@/lib/scoring/match-bonus-points";
import { normAnswer } from "@/lib/scoring/normalize";
import { loadStageScoringMap, winnerPointsDelta } from "@/lib/scoring/stage-scoring";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

export type RecomputeAllMatchResult =
  | {
      ok: true;
      processed: number;
      failures: { matchId: string; error: string }[];
    }
  | { ok: false; error: string };

type LedgerInsert = {
  user_id: string;
  source_type: "match" | "bonus";
  source_id: string;
  points_delta: number;
  reason: string | null;
  awarded_at: string;
};

type ScorableMatch = {
  id: string;
  external_key: string | null;
  match_number: number | null;
  status: string;
  winner: string | null;
  bonus_result: string | null;
  tournament_stage: string | null;
};

const LEDGER_BATCH = 500;

function aliasIdsForMatch(
  match: ScorableMatch,
  aliasByFixture: Map<number, string[]>,
): string[] {
  const n = fixtureNumber(match);
  return n != null ? (aliasByFixture.get(n) ?? [match.id]) : [match.id];
}

/**
 * Re-run match + per-match bonus ledger for every completed match (idempotent).
 * Bulk-loads data once instead of N round-trips per match.
 */
export async function recomputeAllCompletedMatchScoring(
  supabase: SupabaseClient,
  seasonYear = 2026,
): Promise<RecomputeAllMatchResult> {
  const [stageMap, { data: allMatches, error: mErr }] = await Promise.all([
    loadStageScoringMap(supabase, seasonYear),
    supabase
      .from("matches")
      .select(
        "id, external_key, match_number, status, winner, bonus_result, tournament_stage",
      ),
  ]);

  if (mErr) {
    return { ok: false, error: mErr.message };
  }

  const bonusPts = MATCH_BONUS_POINTS;
  const aliasByFixture = idsByFixtureNumber((allMatches ?? []) as ScorableMatch[]);
  const completedRaw = (allMatches ?? []).filter((m) => m.status === "completed");
  const canonicalMatches = dedupeMatchesByFixtureNumber(
    completedRaw as ScorableMatch[],
  ) as ScorableMatch[];

  const failures: { matchId: string; error: string }[] = [];
  const scorable: ScorableMatch[] = [];

  for (const match of canonicalMatches) {
    const actualWinner = (match.winner as string | null)?.trim();
    if (!actualWinner) {
      failures.push({
        matchId: match.id,
        error: "Match winner (or Draw) must be set before scoring.",
      });
      continue;
    }
    const stageSlug = parseTournamentStage(match.tournament_stage as string | null) ?? "group";
    if (!stageMap.get(stageSlug)) {
      failures.push({
        matchId: match.id,
        error: `missing stage_scoring_config for ${stageSlug}`,
      });
      continue;
    }
    scorable.push(match);
  }

  if (scorable.length === 0) {
    await syncProfilePointsFromLedger(supabase);
    return { ok: true, processed: 0, failures };
  }

  const allAliasIds = new Set<string>();
  for (const match of scorable) {
    for (const id of aliasIdsForMatch(match, aliasByFixture)) {
      allAliasIds.add(id);
    }
  }
  const aliasIdList = [...allAliasIds];
  const canonicalIds = scorable.map((m) => m.id);

  const [{ data: rawPredictions, error: pErr }, { data: promptRows, error: prErr }] =
    await Promise.all([
      supabase
        .from("predictions")
        .select("id, user_id, match_id, predicted_winner, bonus_pick")
        .in("match_id", aliasIdList),
      supabase
        .from("bonus_prompts")
        .select("id, match_id, correct_answer, display_order")
        .eq("season_year", seasonYear)
        .eq("scope", "match")
        .in("match_id", aliasIdList)
        .order("display_order", { ascending: true }),
    ]);

  if (pErr) return { ok: false, error: pErr.message };
  if (prErr) return { ok: false, error: prErr.message };

  const promptsOrdered = promptRows ?? [];
  const promptIds = promptsOrdered.map((p) => p.id as string);

  let bonusAnswers: { user_id: string; prompt_id: string; answer_text: string; match_id: string }[] =
    [];
  if (promptIds.length > 0) {
    const { data: ba, error: baErr } = await supabase
      .from("prediction_bonus_answers")
      .select("user_id, prompt_id, answer_text, match_id")
      .in("match_id", aliasIdList)
      .in("prompt_id", promptIds);
    if (baErr) return { ok: false, error: baErr.message };
    bonusAnswers = ba ?? [];
  }

  const promptsByMatch = new Map<string, typeof promptsOrdered>();
  for (const pr of promptsOrdered) {
    const mid = pr.match_id as string;
    if (!promptsByMatch.has(mid)) promptsByMatch.set(mid, []);
    promptsByMatch.get(mid)!.push(pr);
  }

  const now = new Date().toISOString();
  const toInsert: LedgerInsert[] = [];

  for (const match of scorable) {
    const matchId = match.id;
    const aliasIds = aliasIdsForMatch(match, aliasByFixture);
    const aliasSet = new Set(aliasIds);
    const actualWinner = (match.winner as string)!;
    const legacyBonusResult = match.bonus_result as string | null;
    const stageSlug = parseTournamentStage(match.tournament_stage as string | null) ?? "group";
    const stageRow = stageMap.get(stageSlug)!;

    const predictionsByUser = new Map<
      string,
      { predicted_winner: string; bonus_pick: string | null }
    >();
    for (const pred of rawPredictions ?? []) {
      if (!aliasSet.has(pred.match_id as string)) continue;
      const uid = pred.user_id as string;
      const existing = predictionsByUser.get(uid);
      if (!existing || pred.match_id === matchId) {
        predictionsByUser.set(uid, {
          predicted_winner: pred.predicted_winner as string,
          bonus_pick: (pred.bonus_pick as string | null) ?? null,
        });
      }
    }

    const promptsForAliases: typeof promptsOrdered = [];
    for (const aid of aliasIds) {
      const list = promptsByMatch.get(aid) ?? [];
      promptsForAliases.push(...list);
    }
    promptsForAliases.sort(
      (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0),
    );
    const matchPromptIds = promptsForAliases.map((p) => p.id as string);
    const usePerPromptBonus = promptsForAliases.length > 0;

    const answersByUserPrompt = new Map<string, string>();
    for (const row of bonusAnswers) {
      if (!aliasSet.has(row.match_id)) continue;
      const key = `${row.user_id}\t${row.prompt_id}`;
      answersByUserPrompt.set(key, row.answer_text ?? "");
    }

    for (const [userId, pred] of predictionsByUser) {
      const wDelta = winnerPointsDelta(pred.predicted_winner, actualWinner, stageRow);
      toInsert.push({
        user_id: userId,
        source_type: "match",
        source_id: matchId,
        points_delta: wDelta,
        reason: `match_winner:${stageSlug}`,
        awarded_at: now,
      });

      if (usePerPromptBonus) {
        for (const pr of promptsForAliases) {
          const pid = pr.id as string;
          const official = (pr.correct_answer as string | null)?.trim();
          if (!official) continue;
          const userAns = answersByUserPrompt.get(`${userId}\t${pid}`)?.trim() ?? "";
          if (userAns && normAnswer(userAns) === normAnswer(official)) {
            toInsert.push({
              user_id: userId,
              source_type: "bonus",
              source_id: matchId,
              points_delta: bonusPts,
              reason: `match_bonus:${pid}`,
              awarded_at: now,
            });
          }
        }
      } else if (legacyBonusResult) {
        const legacyPick = pred.bonus_pick?.trim();
        let fromPrompts = "";
        if (matchPromptIds.length > 0) {
          const sorted = bonusAnswers.filter(
            (b) => b.user_id === userId && aliasSet.has(b.match_id),
          );
          sorted.sort(
            (a, b) =>
              matchPromptIds.indexOf(a.prompt_id as string) -
              matchPromptIds.indexOf(b.prompt_id as string),
          );
          fromPrompts = sorted[0]?.answer_text?.trim() ?? "";
        }
        const userBonus = legacyPick || fromPrompts;
        if (userBonus && normAnswer(userBonus) === normAnswer(legacyBonusResult)) {
          toInsert.push({
            user_id: userId,
            source_type: "bonus",
            source_id: matchId,
            points_delta: bonusPts,
            reason: "match_bonus",
            awarded_at: now,
          });
        }
      }
    }
  }

  const ledgerSourceIds = new Set<string>();
  for (const match of scorable) {
    for (const id of aliasIdsForMatch(match, aliasByFixture)) {
      ledgerSourceIds.add(id);
    }
  }

  const { error: delErr } = await supabase
    .from("points_ledger")
    .delete()
    .in("source_id", [...ledgerSourceIds])
    .in("source_type", ["match", "bonus"]);
  if (delErr) return { ok: false, error: delErr.message };

  for (let i = 0; i < toInsert.length; i += LEDGER_BATCH) {
    const chunk = toInsert.slice(i, i + LEDGER_BATCH);
    const { error: insErr } = await supabase.from("points_ledger").insert(chunk);
    if (insErr) return { ok: false, error: insErr.message };
  }

  const { error: stampErr } = await supabase
    .from("matches")
    .update({ scored_at: now, updated_at: now })
    .in("id", canonicalIds);
  if (stampErr) return { ok: false, error: stampErr.message };

  await syncProfilePointsFromLedger(supabase);

  return { ok: true, processed: scorable.length, failures };
}
