import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTournamentStage } from "@/lib/fifa/stages";
import { resolveMatchAliasIds } from "@/lib/matches/resolve-alias-ids";
import { normAnswer } from "@/lib/scoring/normalize";
import { loadStageScoringMap, winnerPointsDelta } from "@/lib/scoring/stage-scoring";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";

export type ScoringConfigRow = {
  season_year: number;
  match_bonus_points: number;
};

export type MatchScoreOutcome =
  | { ok: true; ledgerRows: number }
  | { ok: false; error: string };

type LedgerInsert = {
  user_id: string;
  source_type: "match" | "bonus";
  source_id: string;
  points_delta: number;
  reason: string | null;
  awarded_at: string;
};

const LEDGER_BATCH = 500;

export async function applyMatchScoring(
  supabase: SupabaseClient,
  matchId: string,
  seasonYear = 2026,
  options?: { syncProfiles?: boolean },
): Promise<MatchScoreOutcome> {
  const [{ data: cfg, error: cErr }, stageMap] = await Promise.all([
    supabase
      .from("scoring_config")
      .select("season_year, match_bonus_points")
      .eq("season_year", seasonYear)
      .maybeSingle(),
    loadStageScoringMap(supabase, seasonYear),
  ]);

  if (cErr || !cfg) {
    return { ok: false, error: cErr?.message ?? "missing scoring_config" };
  }

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select(
      "id, external_key, status, winner, bonus_result, home_team, away_team, tournament_stage",
    )
    .eq("id", matchId)
    .maybeSingle();
  if (mErr || !match) {
    return { ok: false, error: mErr?.message ?? "match not found" };
  }

  if (match.status !== "completed") {
    return { ok: false, error: "Match status must be completed before scoring." };
  }

  const bonusPts = Number(cfg.match_bonus_points ?? 2);
  const stageSlug = parseTournamentStage(match.tournament_stage as string | null) ?? "group";
  const stageRow = stageMap.get(stageSlug);
  if (!stageRow) {
    return { ok: false, error: `missing stage_scoring_config for ${stageSlug}` };
  }

  const actualWinner = match.winner as string | null;
  if (!actualWinner?.trim()) {
    return { ok: false, error: "Match winner (or Draw) must be set before scoring." };
  }

  const legacyBonusResult = match.bonus_result as string | null;
  const aliasMatchIds = await resolveMatchAliasIds(supabase, matchId);

  const { data: rawPredictions, error: pErr } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, predicted_winner, bonus_pick")
    .in("match_id", aliasMatchIds);
  if (pErr) {
    return { ok: false, error: pErr.message };
  }

  const predictionsByUser = new Map<
    string,
    { id: string; user_id: string; match_id: string; predicted_winner: string; bonus_pick: string | null }
  >();
  for (const pred of rawPredictions ?? []) {
    const uid = pred.user_id as string;
    const existing = predictionsByUser.get(uid);
    if (!existing || pred.match_id === matchId) {
      predictionsByUser.set(uid, {
        id: pred.id as string,
        user_id: uid,
        match_id: pred.match_id as string,
        predicted_winner: pred.predicted_winner as string,
        bonus_pick: (pred.bonus_pick as string | null) ?? null,
      });
    }
  }
  const predictions = [...predictionsByUser.values()];

  const { data: promptRows } = await supabase
    .from("bonus_prompts")
    .select("id, correct_answer, display_order")
    .eq("season_year", seasonYear)
    .eq("scope", "match")
    .in("match_id", aliasMatchIds)
    .order("display_order", { ascending: true });

  const promptsOrdered = promptRows ?? [];
  const promptIds = promptsOrdered.map((p) => p.id as string);

  let bonusAnswers: { user_id: string; prompt_id: string; answer_text: string }[] = [];
  if (promptIds.length > 0) {
    const { data: ba } = await supabase
      .from("prediction_bonus_answers")
      .select("user_id, prompt_id, answer_text")
      .in("match_id", aliasMatchIds)
      .in("prompt_id", promptIds);
    bonusAnswers = ba ?? [];
  }

  const answersByUserPrompt = new Map<string, string>();
  for (const row of bonusAnswers) {
    const key = `${row.user_id as string}\t${row.prompt_id as string}`;
    answersByUserPrompt.set(key, (row.answer_text as string) ?? "");
  }

  const usePerPromptBonus = promptsOrdered.length > 0;

  const { data: oldLedger } = await supabase
    .from("points_ledger")
    .select("user_id, points_delta")
    .eq("source_id", matchId)
    .in("source_type", ["match", "bonus"]);

  const now = new Date().toISOString();
  const toInsert: LedgerInsert[] = [];

  for (const pred of predictions ?? []) {
    const userId = pred.user_id as string;
    const predictedWinner = pred.predicted_winner as string;

    const wDelta = winnerPointsDelta(predictedWinner, actualWinner, stageRow);

    if (usePerPromptBonus) {
      for (const pr of promptsOrdered) {
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
      const legacyPick = (pred.bonus_pick as string | null)?.trim();
      let fromPrompts = "";
      if (promptIds.length > 0) {
        const sorted = bonusAnswers.filter((b) => b.user_id === userId);
        sorted.sort(
          (a, b) =>
            promptIds.indexOf(a.prompt_id as string) - promptIds.indexOf(b.prompt_id as string),
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

    toInsert.push({
      user_id: userId,
      source_type: "match",
      source_id: matchId,
      points_delta: wDelta,
      reason: `match_winner:${stageSlug}`,
      awarded_at: now,
    });
  }

  if (oldLedger?.length) {
    const { error: delErr } = await supabase
      .from("points_ledger")
      .delete()
      .eq("source_id", matchId)
      .in("source_type", ["match", "bonus"]);
    if (delErr) {
      return { ok: false, error: delErr.message };
    }
  }

  for (let i = 0; i < toInsert.length; i += LEDGER_BATCH) {
    const chunk = toInsert.slice(i, i + LEDGER_BATCH);
    const { error: insErr } = await supabase.from("points_ledger").insert(chunk);
    if (insErr) {
      return { ok: false, error: insErr.message };
    }
  }

  if (options?.syncProfiles !== false) {
    await syncProfilePointsFromLedger(supabase);
  }

  await supabase.from("matches").update({ scored_at: now, updated_at: now }).eq("id", matchId);

  return { ok: true, ledgerRows: toInsert.length };
}
