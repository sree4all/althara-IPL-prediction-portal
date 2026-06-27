import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeMatchesByFixtureNumber } from "@/lib/matches/dedupe-by-match-number";
import { buildMatchAliasIndex } from "@/lib/matches/resolve-alias-ids";

export type MatchAliasRow = {
  id: string;
  external_key?: string | null;
  match_number?: number | null;
};

export function aliasIdsFromRows(allMatches: MatchAliasRow[], matchId: string): string[] {
  const index = buildMatchAliasIndex(allMatches);
  return index.get(matchId) ?? [matchId];
}

/** Preferred WC26-M{n} row when duplicate fixture rows exist (WC26-M8 vs wc2026:m8). */
export function canonicalMatchIdFromRows(allMatches: MatchAliasRow[], matchId: string): string {
  const aliasIds = aliasIdsFromRows(allMatches, matchId);
  if (aliasIds.length <= 1) return matchId;

  const aliasRows = aliasIds
    .map((id) => allMatches.find((r) => r.id === id))
    .filter((r): r is MatchAliasRow => r != null);
  const canonical = dedupeMatchesByFixtureNumber(aliasRows)[0];
  return canonical?.id ?? matchId;
}

export async function loadMatchAliasRows(
  supabase: SupabaseClient,
): Promise<MatchAliasRow[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, external_key, match_number");
  if (error) throw new Error(error.message);
  return (data ?? []) as MatchAliasRow[];
}

export async function resolveCanonicalMatchId(
  supabase: SupabaseClient,
  matchId: string,
): Promise<string> {
  const rows = await loadMatchAliasRows(supabase);
  if (!rows.length) return matchId;
  return canonicalMatchIdFromRows(rows, matchId);
}
