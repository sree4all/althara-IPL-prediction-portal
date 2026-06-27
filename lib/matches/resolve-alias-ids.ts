import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureNumber, idsByFixtureNumber } from "@/lib/matches/dedupe-by-match-number";

type MatchAliasRow = {
  id: string;
  external_key?: string | null;
  match_number?: number | null;
};

/** In-memory alias lookup — avoids reloading the full matches table per score run. */
export function buildMatchAliasIndex(
  rows: MatchAliasRow[],
): Map<string, string[]> {
  const byFixture = idsByFixtureNumber(rows as (MatchAliasRow & { id: string })[]);
  const index = new Map<string, string[]>();
  for (const row of rows) {
    const n = fixtureNumber(row);
    const ids = n != null ? (byFixture.get(n) ?? [row.id]) : [row.id];
    for (const id of ids) {
      index.set(id, ids);
    }
  }
  return index;
}

/** All match row ids sharing the same fixture number (WC26-M8 vs wc2026:m8 duplicates). */
export async function resolveMatchAliasIds(
  supabase: SupabaseClient,
  matchId: string,
): Promise<string[]> {
  const { data: allMatches, error } = await supabase
    .from("matches")
    .select("id, external_key, match_number");
  if (error || !allMatches?.length) return [matchId];

  const index = buildMatchAliasIndex(allMatches);
  return index.get(matchId) ?? [matchId];
}
