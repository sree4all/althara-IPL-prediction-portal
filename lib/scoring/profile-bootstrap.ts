import { parseTournamentStage } from "@/lib/fifa/stages";
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
      const { data: matches } = await supabase
        .from("matches")
        .select("id, external_key, status, winner, bonus_result, tournament_stage")
        .in("id", matchIds)
        .eq("status", "completed");

      const completedMatchIds = (matches ?? []).map((m) => m.id as string);
      const { data: existingMatchLedger } = await supabase
        .from("points_ledger")
        .select("source_id")
        .eq("user_id", userId)
        .in("source_type", ["match", "bonus"])
        .in(
          "source_id",
          completedMatchIds.length > 0
            ? completedMatchIds
            : ["00000000-0000-0000-0000-000000000000"],
        );
      const ledgeredMatchIds = new Set((existingMatchLedger ?? []).map((r) => r.source_id as string));
      const { data: prompts } = await supabase
        .from("bonus_prompts")
        .select("id, match_id, correct_answer, display_order")
        .eq("season_year", SEASON_YEAR)
        .eq("scope", "match")
        .in(
          "match_id",
          completedMatchIds.length > 0
            ? completedMatchIds
            : ["00000000-0000-0000-0000-000000000000"],
        )
        .order("display_order", { ascending: true });

      const promptsByMatch = new Map<
        string,
        { id: string; correct_answer: string | null; display_order: number }[]
      >();
      for (const p of prompts ?? []) {
        const mid = p.match_id as string;
        if (!promptsByMatch.has(mid)) promptsByMatch.set(mid, []);
        promptsByMatch.get(mid)!.push({
          id: p.id as string,
          correct_answer: (p.correct_answer as string | null) ?? null,
          display_order: Number(p.display_order ?? 0),
        });
      }

      const promptIds = [...new Set((prompts ?? []).map((p) => p.id as string))];
      const { data: bonusAnswers } = await supabase
        .from("prediction_bonus_answers")
        .select("match_id, prompt_id, answer_text")
        .eq("user_id", userId)
        .in(
          "match_id",
          completedMatchIds.length > 0
            ? completedMatchIds
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
        if (ledgeredMatchIds.has(mid)) continue;

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
                source_id: mid,
                points_delta: wDelta,
                reason: `match_winner:${stageSlug}`,
                awarded_at: now,
              },
              { onConflict: "user_id,source_type,source_id" },
            );
          }
        }

        const promptsForMatch = promptsByMatch.get(mid) ?? [];
        if (promptsForMatch.length > 0) {
          for (const p of promptsForMatch) {
            const official = (p.correct_answer ?? "").trim();
            if (!official) continue;
            const ans = (answerByMatchPrompt.get(`${mid}\t${p.id}`) ?? "").trim();
            if (!ans) continue;
            if (normAnswer(ans) !== normAnswer(official)) continue;
            await supabase.from("points_ledger").insert({
              user_id: userId,
              source_type: "bonus",
              source_id: mid,
              points_delta: bonusPts,
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
              source_id: mid,
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
