import type { SupabaseClient } from "@supabase/supabase-js";
import {
  feedsFromSource,
  loserFeedsFromSource,
  type BracketFeed,
} from "@/lib/fifa/bracket-map";

export type PropagationUpdate = {
  match_number: number;
  slot: "home" | "away";
  team: string;
};

export type PropagationConflict = {
  match_number: number;
  slot: "home" | "away";
  existing_team: string;
  attempted_team: string;
};

export type PropagationResult = {
  updated: PropagationUpdate[];
  conflicts: PropagationConflict[];
};

const PLACEHOLDER = /^(TBD|W\d+|RU\d+)$/i;

export function isBracketPlaceholder(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (PLACEHOLDER.test(t)) return true;
  return t.startsWith("Winner ") || t.startsWith("Loser ");
}

type TargetRow = {
  id: string;
  home_team: string;
  away_team: string;
  home_team_display?: string | null;
  away_team_display?: string | null;
};

/** Canonical WC26-M{n} row; tolerates null season_year (legacy imports). */
export async function resolveBracketTargetMatch(
  supabase: SupabaseClient,
  targetMatchNumber: number,
  seasonYear = 2026,
): Promise<TargetRow | null> {
  const externalKey = `WC26-M${targetMatchNumber}`;

  const { data: byKey, error: keyErr } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_team_display, away_team_display, external_key")
    .eq("external_key", externalKey)
    .or(`season_year.eq.${seasonYear},season_year.is.null`)
    .limit(1)
    .maybeSingle();

  if (!keyErr && byKey) return byKey as TargetRow;

  const { data: byNumber, error: numErr } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_team_display, away_team_display, external_key")
    .eq("match_number", targetMatchNumber)
    .or(`season_year.eq.${seasonYear},season_year.is.null`);

  if (!numErr && byNumber?.length) {
    const preferred =
      byNumber.find((r) => /^WC26-M\d+$/i.test(String((r as { external_key?: string }).external_key))) ??
      byNumber[0];
    return preferred as TargetRow;
  }
  return null;
}

export async function propagateKnockoutWinner(
  supabase: SupabaseClient,
  sourceMatchNumber: number,
  winnerTeamName: string,
  seasonYear = 2026,
): Promise<PropagationResult> {
  const result: PropagationResult = { updated: [], conflicts: [] };
  const feeds = feedsFromSource(sourceMatchNumber);
  if (feeds.length === 0) return result;

  const winner = winnerTeamName.trim();
  if (!winner) return result;

  for (const feed of feeds) {
    await applyFeed(supabase, feed, winner, seasonYear, result);
  }

  return result;
}

/** Semi-final losers fill the third-place playoff (M103). */
export async function propagateKnockoutLoser(
  supabase: SupabaseClient,
  sourceMatchNumber: number,
  loserTeamName: string,
  seasonYear = 2026,
): Promise<PropagationResult> {
  const result: PropagationResult = { updated: [], conflicts: [] };
  const feeds = loserFeedsFromSource(sourceMatchNumber);
  if (feeds.length === 0) return result;

  const loser = loserTeamName.trim();
  if (!loser || isBracketPlaceholder(loser)) return result;

  for (const feed of feeds) {
    await applyFeed(supabase, feed, loser, seasonYear, result);
  }

  return result;
}

async function applyFeed(
  supabase: SupabaseClient,
  feed: BracketFeed,
  winner: string,
  seasonYear: number,
  result: PropagationResult,
) {
  const target = await resolveBracketTargetMatch(supabase, feed.targetMatchNumber, seasonYear);
  if (!target) return;

  const slotTeam =
    feed.targetSlot === "home"
      ? (target.home_team as string)
      : (target.away_team as string);

  if (!isBracketPlaceholder(slotTeam) && slotTeam.trim() !== winner) {
    result.conflicts.push({
      match_number: feed.targetMatchNumber,
      slot: feed.targetSlot,
      existing_team: slotTeam,
      attempted_team: winner,
    });
    return;
  }

  if (!isBracketPlaceholder(slotTeam) && slotTeam.trim() === winner) {
    result.updated.push({
      match_number: feed.targetMatchNumber,
      slot: feed.targetSlot,
      team: winner,
    });
    return;
  }

  const patch: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (feed.targetSlot === "home") {
    patch.home_team = winner;
    if ("home_team_display" in target) patch.home_team_display = winner;
  } else {
    patch.away_team = winner;
    if ("away_team_display" in target) patch.away_team_display = winner;
  }

  const { error: uErr } = await supabase.from("matches").update(patch).eq("id", target.id);
  if (!uErr) {
    result.updated.push({
      match_number: feed.targetMatchNumber,
      slot: feed.targetSlot,
      team: winner,
    });
  }
}
