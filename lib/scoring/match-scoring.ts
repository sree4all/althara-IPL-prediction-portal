import type { SupabaseClient } from "@supabase/supabase-js";
import { normAnswer } from "@/lib/scoring/normalize";

export type ScoringConfigRow = {
  season_year: number;
  match_winner_points: number;
  match_bonus_points: number;
};

export type MatchScoreOutcome =
  | { ok: true; ledgerRows: number }
  | { ok: false; error: string };

export async function applyMatchScoring(
  supabase: SupabaseClient,
  matchId: string,
  seasonYear = 2026,
): Promise<MatchScoreOutcome> {
  const { data: cfg, error: cErr } = await supabase
    .from("scoring_config")
    .select("season_year, match_winner_points, match_bonus_points")
    .eq("season_year", seasonYear)
    .maybeSingle();
  if (cErr || !cfg) {
    return { ok: false, error: cErr?.message ?? "missing scoring_config" };
  }

  const { data: match, error: mErr } = await supabase
    .from("matches")
    .select("id, status, winner, bonus_result, home_team, away_team")
    .eq("id", matchId)
    .maybeSingle();
  if (mErr || !match) {
    return { ok: false, error: mErr?.message ?? "match not found" };
  }

  if (match.status !== "completed") {
    return { ok: false, error: "Match status must be completed before scoring." };
  }

  const winnerPts = Number(cfg.match_winner_points ?? 0);
  const bonusPts = Number(cfg.match_bonus_points ?? 0);

  const actualWinner = match.winner as string | null;
  const legacyBonusResult = match.bonus_result as string | null;

  const { data: predictions, error: pErr } = await supabase
    .from("predictions")
    .select("id, user_id, match_id, predicted_winner, bonus_pick")
    .eq("match_id", matchId);
  if (pErr) {
    return { ok: false, error: pErr.message };
  }

  const { data: promptRows } = await supabase
    .from("bonus_prompts")
    .select("id, correct_answer, display_order")
    .eq("season_year", seasonYear)
    .eq("scope", "match")
    .eq("match_id", matchId)
    .order("display_order", { ascending: true });

  const promptsOrdered = promptRows ?? [];
  const promptIds = promptsOrdered.map((p) => p.id as string);

  let bonusAnswers: { user_id: string; prompt_id: string; answer_text: string }[] = [];
  if (promptIds.length > 0) {
    const { data: ba } = await supabase
      .from("prediction_bonus_answers")
      .select("user_id, prompt_id, answer_text")
      .eq("match_id", matchId)
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
      .eq("source_id", matchId)
      .in("source_type", ["match", "bonus"]);
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
      .update({
        current_points: cur - sum,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);
  }

  const now = new Date().toISOString();
  let insertCount = 0;

  for (const pred of predictions ?? []) {
    const userId = pred.user_id as string;
    const predictedWinner = pred.predicted_winner as string;

    let wDelta = 0;
    if (actualWinner) {
      wDelta = normAnswer(predictedWinner) === normAnswer(actualWinner) ? winnerPts : 0;
    }

    let bonusTotalDelta = 0;

    if (usePerPromptBonus) {
      for (const pr of promptsOrdered) {
        const pid = pr.id as string;
        const official = (pr.correct_answer as string | null)?.trim();
        if (!official) continue;
        const userAns = answersByUserPrompt.get(`${userId}\t${pid}`)?.trim() ?? "";
        if (userAns && normAnswer(userAns) === normAnswer(official)) {
          bonusTotalDelta += bonusPts;
          const { error: bErr } = await supabase.from("points_ledger").insert({
            user_id: userId,
            source_type: "bonus",
            source_id: matchId,
            points_delta: bonusPts,
            reason: `match_bonus:${pid}`,
            awarded_at: now,
          });
          if (bErr) {
            return { ok: false, error: bErr.message };
          }
          insertCount += 1;
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
        bonusTotalDelta = bonusPts;
        const { error: bErr } = await supabase.from("points_ledger").insert({
          user_id: userId,
          source_type: "bonus",
          source_id: matchId,
          points_delta: bonusPts,
          reason: "match_bonus",
          awarded_at: now,
        });
        if (bErr) {
          return { ok: false, error: bErr.message };
        }
        insertCount += 1;
      }
    }

    if (wDelta > 0) {
      const { error: iErr } = await supabase.from("points_ledger").insert({
        user_id: userId,
        source_type: "match",
        source_id: matchId,
        points_delta: wDelta,
        reason: "match_winner",
        awarded_at: now,
      });
      if (iErr) {
        return { ok: false, error: iErr.message };
      }
      insertCount += 1;
    }

    const add = wDelta + bonusTotalDelta;
    if (add !== 0) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("current_points")
        .eq("id", userId)
        .maybeSingle();
      const cur = Number(prof?.current_points ?? 0);
      await supabase
        .from("profiles")
        .update({
          current_points: cur + add,
          updated_at: now,
        })
        .eq("id", userId);
    }
  }

  await supabase.from("matches").update({ scored_at: now, updated_at: now }).eq("id", matchId);

  return { ok: true, ledgerRows: insertCount };
}
