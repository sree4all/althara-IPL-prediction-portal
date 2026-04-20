import type { SupabaseClient } from "@supabase/supabase-js";
import { normAnswer } from "@/lib/scoring/normalize";
import { isLegacyLateExcluded } from "@/lib/scoring/legacy-late-exclusions";

export type ScoringConfigRow = {
  season_year: number;
  match_winner_points: number;
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
/** Profile `.in()` chunk size (PostgREST URL limits). */
const PROFILE_ID_CHUNK = 150;
/** Parallel profile point updates per batch (reduces latency vs strict sequential). */
const PROFILE_UPDATE_CONCURRENCY = 40;

function sumByUser(rows: { user_id: string; points_delta: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of rows) {
    const uid = row.user_id;
    const d = Number(row.points_delta ?? 0);
    m.set(uid, (m.get(uid) ?? 0) + d);
  }
  return m;
}

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
    .select("id, external_key, status, winner, bonus_result, home_team, away_team")
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
  const userIds = [...new Set((predictions ?? []).map((p) => p.user_id as string))];
  let excludedUsers = new Set<string>();
  try {
    const { data: excludedRows } = await supabase
      .from("legacy_prediction_exclusions")
      .select("user_id")
      .eq("match_id", matchId)
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    excludedUsers = new Set((excludedRows ?? []).map((r) => r.user_id as string));
  } catch {
    excludedUsers = new Set<string>();
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

  const refundByUser = sumByUser(oldLedger ?? []);

  const now = new Date().toISOString();
  const toInsert: LedgerInsert[] = [];

  for (const pred of predictions ?? []) {
    const userId = pred.user_id as string;
    if (excludedUsers.has(userId)) continue;
    if (isLegacyLateExcluded(userId, (match.external_key as string | null) ?? null)) continue;
    const predictedWinner = pred.predicted_winner as string;

    let wDelta = 0;
    if (actualWinner) {
      wDelta = normAnswer(predictedWinner) === normAnswer(actualWinner) ? winnerPts : 0;
    }

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

    if (wDelta > 0) {
      toInsert.push({
        user_id: userId,
        source_type: "match",
        source_id: matchId,
        points_delta: wDelta,
        reason: "match_winner",
        awarded_at: now,
      });
    }
  }

  const awardByUser = sumByUser(toInsert);

  // Replace ledger rows for this match in one shot (audit lines vary by bonus prompts).
  // Profile points use net delta (award − refund), not full strip/re-add.
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

  const userIdsForNet = new Set<string>([...refundByUser.keys(), ...awardByUser.keys()]);
  const nets = new Map<string, number>();
  for (const uid of userIdsForNet) {
    const net = (awardByUser.get(uid) ?? 0) - (refundByUser.get(uid) ?? 0);
    if (net !== 0) nets.set(uid, net);
  }

  if (nets.size > 0) {
    const ids = [...nets.keys()];
    const byId = new Map<string, number>();
    for (let i = 0; i < ids.length; i += PROFILE_ID_CHUNK) {
      const slice = ids.slice(i, i + PROFILE_ID_CHUNK);
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, current_points")
        .in("id", slice);
      if (profErr) {
        return { ok: false, error: profErr.message };
      }
      for (const p of profs ?? []) {
        byId.set(p.id as string, Number(p.current_points ?? 0));
      }
    }
    for (let i = 0; i < ids.length; i += PROFILE_UPDATE_CONCURRENCY) {
      const slice = ids.slice(i, i + PROFILE_UPDATE_CONCURRENCY);
      const results = await Promise.all(
        slice.map((uid) => {
          const net = nets.get(uid)!;
          const cur = byId.get(uid) ?? 0;
          return supabase
            .from("profiles")
            .update({
              current_points: cur + net,
              updated_at: now,
            })
            .eq("id", uid);
        }),
      );
      for (const r of results) {
        if (r.error) {
          return { ok: false, error: r.error.message };
        }
      }
    }
  }

  await supabase.from("matches").update({ scored_at: now, updated_at: now }).eq("id", matchId);

  return { ok: true, ledgerRows: toInsert.length };
}
