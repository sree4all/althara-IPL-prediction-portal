import type { SupabaseClient } from "@supabase/supabase-js";
import { feedsFromSource, type BracketFeed } from "@/lib/fifa/bracket-map";

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

function isPlaceholder(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  if (PLACEHOLDER.test(t)) return true;
  return t.startsWith("Winner ") || t.startsWith("Loser ");
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

async function applyFeed(
  supabase: SupabaseClient,
  feed: BracketFeed,
  winner: string,
  seasonYear: number,
  result: PropagationResult,
) {
  const externalKey = `WC26-M${feed.targetMatchNumber}`;
  const { data: target, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_team_display, away_team_display")
    .eq("external_key", externalKey)
    .eq("season_year", seasonYear)
    .maybeSingle();

  if (error || !target) return;

  const slotTeam =
    feed.targetSlot === "home"
      ? (target.home_team as string)
      : (target.away_team as string);

  if (!isPlaceholder(slotTeam) && slotTeam.trim() !== winner) {
    result.conflicts.push({
      match_number: feed.targetMatchNumber,
      slot: feed.targetSlot,
      existing_team: slotTeam,
      attempted_team: winner,
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
