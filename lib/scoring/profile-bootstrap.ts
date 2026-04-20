import { normAnswer } from "@/lib/scoring/normalize";
import { createServiceClient } from "@/lib/supabase/service";
import { isLegacyLateExcluded } from "@/lib/scoring/legacy-late-exclusions";

const SEASON_YEAR = 2026;

function slotPointsArray(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((n) => Number(n ?? 2));
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.map((n) => Number(n ?? 2));
  } catch {
    /* ignore */
  }
  return [2, 2, 2, 2, 3, 3, 5, 3, 3];
}

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
    const { data: cfg } = await supabase
      .from("scoring_config")
      .select("match_winner_points, match_bonus_points, tournament_slot_points")
      .eq("season_year", SEASON_YEAR)
      .maybeSingle();

    const winnerPts = Number(cfg?.match_winner_points ?? 2);
    const bonusPts = Number(cfg?.match_bonus_points ?? 2);
    const tournamentSlotPts = slotPointsArray(cfg?.tournament_slot_points);

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

    let pointsDelta = 0;
    const matchIds = [...predictedByMatch.keys()];
    if (matchIds.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, external_key, status, winner, bonus_result")
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
      let excludedMatchIds = new Set<string>();
      try {
        const { data: excludedRows } = await supabase
          .from("legacy_prediction_exclusions")
          .select("match_id")
          .eq("user_id", userId)
          .in(
            "match_id",
            completedMatchIds.length > 0
              ? completedMatchIds
              : ["00000000-0000-0000-0000-000000000000"],
          );
        excludedMatchIds = new Set((excludedRows ?? []).map((r) => r.match_id as string));
      } catch {
        excludedMatchIds = new Set<string>();
      }

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
        if (excludedMatchIds.has(mid)) continue;
        if (isLegacyLateExcluded(userId, (m.external_key as string | null) ?? null)) continue;

        const pred = predictedByMatch.get(mid);
        if (!pred) continue;

        let matchAdd = 0;
        if (m.winner && normAnswer(pred.predicted_winner) === normAnswer(m.winner as string)) {
          matchAdd += winnerPts;
          await supabase.from("points_ledger").upsert(
            {
              user_id: userId,
              source_type: "match",
              source_id: mid,
              points_delta: winnerPts,
              reason: "match_winner",
              awarded_at: now,
            },
            { onConflict: "user_id,source_type,source_id" },
          );
        }

        const promptsForMatch = promptsByMatch.get(mid) ?? [];
        if (promptsForMatch.length > 0) {
          for (const p of promptsForMatch) {
            const official = (p.correct_answer ?? "").trim();
            if (!official) continue;
            const ans = (answerByMatchPrompt.get(`${mid}\t${p.id}`) ?? "").trim();
            if (!ans) continue;
            if (normAnswer(ans) !== normAnswer(official)) continue;
            matchAdd += bonusPts;
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
            matchAdd += bonusPts;
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

        pointsDelta += matchAdd;
      }
    }

    const { data: answers } = await supabase
      .from("tournament_answers")
      .select("question_id, answer_text")
      .eq("user_id", userId);

    const questionIds = [...new Set((answers ?? []).map((a) => a.question_id as string))];
    if (questionIds.length > 0) {
      const { data: questions } = await supabase
        .from("tournament_questions")
        .select("id, slot_no, correct_answer")
        .eq("season_year", SEASON_YEAR)
        .in("id", questionIds);

      const questionMap = new Map(
        (questions ?? []).map((q) => [
          q.id as string,
          {
            slot_no: Number(q.slot_no ?? 1),
            correct_answer: (q.correct_answer as string | null) ?? null,
          },
        ]),
      );

      const { data: existingTournamentLedger } = await supabase
        .from("points_ledger")
        .select("source_id")
        .eq("user_id", userId)
        .eq("source_type", "tournament_question")
        .in("source_id", questionIds);
      const ledgeredQuestionIds = new Set(
        (existingTournamentLedger ?? []).map((r) => r.source_id as string),
      );

      for (const a of answers ?? []) {
        const qid = a.question_id as string;
        if (!qid || ledgeredQuestionIds.has(qid)) continue;
        const q = questionMap.get(qid);
        if (!q) continue;
        const official = (q.correct_answer ?? "").trim();
        const guess = ((a.answer_text as string | null) ?? "").trim();
        if (!official || !guess) continue;
        if (normAnswer(guess) !== normAnswer(official)) continue;

        const pts = Number(tournamentSlotPts[q.slot_no - 1] ?? 2);
        await supabase.from("points_ledger").insert({
          user_id: userId,
          source_type: "tournament_question",
          source_id: qid,
          points_delta: pts,
          reason: `tournament_slot_${q.slot_no}`,
          awarded_at: now,
        });
        pointsDelta += pts;
      }
    }

    const cur = Number(claimedProfile.current_points ?? 0);
    await supabase
      .from("profiles")
      .update({
        current_points: cur + pointsDelta,
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
