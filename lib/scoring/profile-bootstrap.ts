import { parseTournamentStage } from "@/lib/fifa/stages";
import {
  aliasIdsFromRows,
  canonicalMatchIdFromRows,
  loadMatchAliasRows,
} from "@/lib/matches/canonical-match-id";
import { MATCH_BONUS_POINTS } from "@/lib/scoring/match-bonus-points";
import { normAnswer } from "@/lib/scoring/normalize";
import { loadStageScoringMap, winnerPointsDelta } from "@/lib/scoring/stage-scoring";
import { syncProfilePointsFromLedger } from "@/lib/scoring/sync-profile-points";
import { createServiceClient } from "@/lib/supabase/service";

const SEASON_YEAR = 2026;

/**
 * Backfills points for a newly created profile only once.
 * Safe to call repeatedly; it exits after `scoring_bootstrapped_at` is set.
 */
export async function ensureProfileScoringBootstrap(userId: string): Promise<void> {
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (error) {
    // Do not block app login if service-role creds are not configured in this environment.
    console.warn("Skipping profile scoring bootstrap:", error);
    return;
  }

  const now = new Date().toISOString();

  // Atomic claim: only one concurrent request may bootstrap this profile.
  const { data: claimedProfile } = await supabase
    .from("profiles")
    .update({ scoring_bootstrapped_at: now, updated_at: now })
    .eq("id", userId)
    .is("scoring_bootstrapped_at", null)
    .select("id, current_points")
    .maybeSingle();

  if (!claimedProfile) return;

  try {
    const stageMap = await loadStageScoringMap(supabase, SEASON_YEAR);
    const bonusPts = MATCH_BONUS_POINTS;

    const { data: predictions } = await supabase
      .from("predictions")
      .select("match_id, predicted_winner, bonus_pick")
      .eq("user_id", userId);

    const predictedByMatch = new Map<
      string,
      { predicted_winner: string; bonus_pick: string | null }
    >();
    for (const row of predictions ?? []) {
      const matchId = row.match_id as string;
      if (!matchId) continue;
      predictedByMatch.set(matchId, {
        predicted_winner: (row.predicted_winner as string) ?? "",
        bonus_pick: (row.bonus_pick as string | null) ?? null,
      });
    }

    const matchIds = [...predictedByMatch.keys()];
    if (matchIds.length > 0) {
      const allMatchRows = await loadMatchAliasRows(supabase);

      const { data: matches } = await supabase
        .from("matches")
        .select("id, external_key, status, winner, bonus_result, tournament_stage")
        .in("id", matchIds)
        .eq("status", "completed");

      const completedMatchIds = (matches ?? []).map((m) => m.id as string);
      const ledgerSourceIds = new Set<string>();
      for (const mid of completedMatchIds) {
        for (const id of aliasIdsFromRows(allMatchRows, mid)) {
          ledgerSourceIds.add(id);
        }
      }

      const { data: existingMatchLedger } = await supabase
        .from("points_ledger")
        .select("source_id")
        .eq("user_id", userId)
        .in("source_type", ["match", "bonus"])
        .in(
          "source_id",
          ledgerSourceIds.size > 0
            ? [...ledgerSourceIds]
            : ["00000000-0000-0000-0000-000000000000"],
        );
      const ledgeredMatchIds = new Set((existingMatchLedger ?? []).map((r) => r.source_id as string));

      const promptMatchIds = new Set<string>();
      for (const mid of completedMatchIds) {
        for (const id of aliasIdsFromRows(allMatchRows, mid)) {
          promptMatchIds.add(id);
        }
      }

      const { data: prompts } = await supabase
        .from("bonus_prompts")
        .select("id, match_id, correct_answer, display_order, correct_points")
        .eq("season_year", SEASON_YEAR)
        .eq("scope", "match")
        .in(
          "match_id",
          promptMatchIds.size > 0
            ? [...promptMatchIds]
            : ["00000000-0000-0000-0000-000000000000"],
        )
        .order("display_order", { ascending: true });

      type PromptRow = {
        id: string;
        correct_answer: string | null;
        display_order: number;
        correct_points: number | null;
      };
      const promptsByMatch = new Map<string, PromptRow[]>();
      for (const p of prompts ?? []) {
        const mid = p.match_id as string;
        if (!promptsByMatch.has(mid)) promptsByMatch.set(mid, []);
        const cp = (p as { correct_points?: number | null }).correct_points;
        promptsByMatch.get(mid)!.push({
          id: p.id as string,
          correct_answer: (p.correct_answer as string | null) ?? null,
          display_order: Number(p.display_order ?? 0),
          correct_points: cp != null && Number.isFinite(Number(cp)) ? Number(cp) : null,
        });
      }

      const bonusMatchIds = new Set<string>();
      for (const mid of completedMatchIds) {
        for (const id of aliasIdsFromRows(allMatchRows, mid)) {
          bonusMatchIds.add(id);
        }
      }

      const promptIds = [...new Set((prompts ?? []).map((p) => p.id as string))];
      const { data: bonusAnswers } = await supabase
        .from("prediction_bonus_answers")
        .select("match_id, prompt_id, answer_text")
        .eq("user_id", userId)
        .in(
          "match_id",
          bonusMatchIds.size > 0
            ? [...bonusMatchIds]
            : ["00000000-0000-0000-0000-000000000000"],
        )
        .in(
          "prompt_id",
          promptIds.length > 0 ? promptIds : ["00000000-0000-0000-0000-000000000000"],
        );

      const answerByMatchPrompt = new Map<string, string>();
      for (const row of bonusAnswers ?? []) {
        const mid = row.match_id as string;
        const pid = row.prompt_id as string;
        answerByMatchPrompt.set(`${mid}\t${pid}`, (row.answer_text as string) ?? "");
      }

      for (const m of matches ?? []) {
        const mid = m.id as string;
        const canonicalId = canonicalMatchIdFromRows(allMatchRows, mid);
        const aliasIds = aliasIdsFromRows(allMatchRows, mid);
        const alreadyLedgered = aliasIds.some((id) => ledgeredMatchIds.has(id));
        if (alreadyLedgered) continue;

        const pred = predictedByMatch.get(mid);
        if (!pred) continue;

        const actualWinner = (m.winner as string | null)?.trim();
        if (actualWinner) {
          const stageSlug = parseTournamentStage(m.tournament_stage as string | null) ?? "group";
          const stageRow = stageMap.get(stageSlug);
          if (stageRow) {
            const wDelta = winnerPointsDelta(pred.predicted_winner, actualWinner, stageRow);
            await supabase.from("points_ledger").upsert(
              {
                user_id: userId,
                source_type: "match",
                source_id: canonicalId,
                points_delta: wDelta,
                reason: `match_winner:${stageSlug}`,
                awarded_at: now,
              },
              { onConflict: "user_id,source_type,source_id" },
            );
          }
        }

        const promptsForMatch: PromptRow[] = [];
        for (const aliasId of aliasIds) {
          const list = promptsByMatch.get(aliasId) ?? [];
          promptsForMatch.push(...list);
        }
        promptsForMatch.sort((a, b) => a.display_order - b.display_order);

        if (promptsForMatch.length > 0) {
          for (const p of promptsForMatch) {
            const official = (p.correct_answer ?? "").trim();
            if (!official) continue;
            const ans = aliasIds
              .map((aliasId) => (answerByMatchPrompt.get(`${aliasId}\t${p.id}`) ?? "").trim())
              .find((value) => value.length > 0);
            if (!ans) continue;
            if (normAnswer(ans) !== normAnswer(official)) continue;
            await supabase.from("points_ledger").insert({
              user_id: userId,
              source_type: "bonus",
              source_id: canonicalId,
              // Per-prompt override (e.g. +3 AI bonuses) mirrors applyMatchScoring.
              points_delta: p.correct_points ?? bonusPts,
              reason: `match_bonus:${p.id}`,
              awarded_at: now,
            });
          }
        } else {
          const official = ((m.bonus_result as string | null) ?? "").trim();
          const guess = (pred.bonus_pick ?? "").trim();
          if (official && guess && normAnswer(guess) === normAnswer(official)) {
            await supabase.from("points_ledger").insert({
              user_id: userId,
              source_type: "bonus",
              source_id: canonicalId,
              points_delta: bonusPts,
              reason: "match_bonus",
              awarded_at: now,
            });
          }
        }
      }
    }

    await syncProfilePointsFromLedger(supabase);
    await supabase
      .from("profiles")
      .update({
        scoring_bootstrapped_at: now,
        updated_at: now,
      })
      .eq("id", userId);
  } catch (error) {
    // Release marker if bootstrap fails so user can retry on next login.
    await supabase
      .from("profiles")
      .update({ scoring_bootstrapped_at: null, updated_at: new Date().toISOString() })
      .eq("id", userId);
    throw error;
  }
}
