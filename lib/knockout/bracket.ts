import type { SupabaseClient } from "@supabase/supabase-js";
import {
  KNOCKOUT_EXTERNAL_KEY,
  KNOCKOUT_PLACEHOLDER_LOSER_Q1,
  KNOCKOUT_PLACEHOLDER_WINNER_ELIM,
  KNOCKOUT_PLACEHOLDER_WINNER_Q1,
  KNOCKOUT_PLACEHOLDER_WINNER_Q2,
  KNOCKOUT_SEED_AWAY,
  KNOCKOUT_SEED_AWAY_ELIM,
  KNOCKOUT_SEED_HOME,
  KNOCKOUT_SEED_HOME_ELIM,
  type KnockoutStage,
} from "@/lib/knockout/constants";

export type KnockoutMatchRow = {
  id: string;
  external_key: string | null;
  home_team: string;
  away_team: string;
  knockout_stage: string | null;
  status: string;
  winner: string | null;
  scored_at: string | null;
};

async function fetchByKey(
  supabase: SupabaseClient,
  externalKey: string,
): Promise<{ id: string; home_team: string; away_team: string; status: string } | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, status")
    .eq("external_key", externalKey)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; home_team: string; away_team: string; status: string };
}

/**
 * After a knockout match is completed, write real team names into downstream fixtures.
 */
export async function advanceKnockoutBracket(
  supabase: SupabaseClient,
  stage: KnockoutStage,
  winner: string,
  loser: string,
): Promise<{ ok: true; updates: string[] } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const updates: string[] = [];

  const patch = async (
    externalKey: string,
    patch: { home_team?: string; away_team?: string },
  ) => {
    const row = await fetchByKey(supabase, externalKey);
    if (!row) {
      return { error: `Match ${externalKey} not found` };
    }
    if (row.status === "completed") {
      return { error: `${externalKey} is already completed; cannot change teams` };
    }
    const { error } = await supabase
      .from("matches")
      .update({ ...patch, updated_at: now })
      .eq("id", row.id);
    if (error) return { error: error.message };
    const parts: string[] = [];
    if (patch.home_team) parts.push(`home → ${patch.home_team}`);
    if (patch.away_team) parts.push(`away → ${patch.away_team}`);
    updates.push(`${externalKey}: ${parts.join(", ")}`);
    return null;
  };

  if (stage === "q1") {
    const e1 = await patch(KNOCKOUT_EXTERNAL_KEY.q2, { home_team: loser });
    if (e1?.error) return { ok: false, error: e1.error };
    const e2 = await patch(KNOCKOUT_EXTERNAL_KEY.final, { home_team: winner });
    if (e2?.error) return { ok: false, error: e2.error };
  } else if (stage === "eliminator") {
    const e = await patch(KNOCKOUT_EXTERNAL_KEY.q2, { away_team: winner });
    if (e?.error) return { ok: false, error: e.error };
  } else if (stage === "q2") {
    const e = await patch(KNOCKOUT_EXTERNAL_KEY.final, { away_team: winner });
    if (e?.error) return { ok: false, error: e.error };
  }

  return { ok: true, updates };
}

/** Initial teams for seeded knockout rows (migration / upsert). */
export function initialKnockoutTeams(stage: KnockoutStage): {
  home_team: string;
  away_team: string;
} {
  switch (stage) {
    case "q1":
      return { home_team: KNOCKOUT_SEED_HOME, away_team: KNOCKOUT_SEED_AWAY };
    case "eliminator":
      return { home_team: KNOCKOUT_SEED_HOME_ELIM, away_team: KNOCKOUT_SEED_AWAY_ELIM };
    case "q2":
      return {
        home_team: KNOCKOUT_PLACEHOLDER_LOSER_Q1,
        away_team: KNOCKOUT_PLACEHOLDER_WINNER_ELIM,
      };
    case "final":
      return {
        home_team: KNOCKOUT_PLACEHOLDER_WINNER_Q1,
        away_team: KNOCKOUT_PLACEHOLDER_WINNER_Q2,
      };
  }
}
