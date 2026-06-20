import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fixtureNumber,
  idsByFixtureNumber,
} from "@/lib/matches/dedupe-by-match-number";

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
  const { data: selected, error: selErr } = await supabase
    .from("matches")
    .select("id, external_key, match_number")
    .eq("id", matchId)
    .maybeSingle();
  if (selErr || !selected) return [matchId];

  const fixtureNo = fixtureNumber(selected as MatchAliasRow);
  if (fixtureNo == null) return [matchId];

  const { data: byNumber, error: numErr } = await supabase
    .from("matches")
    .select("id")
    .eq("match_number", fixtureNo);
  if (!numErr && byNumber?.length) {
    return byNumber.map((m) => m.id as string);
  }

  const { data: allMatches, error } = await supabase
    .from("matches")
    .select("id, external_key, match_number");
  if (error || !allMatches?.length) return [matchId];

  const ids = allMatches
    .filter((m) => fixtureNumber(m as MatchAliasRow) === fixtureNo)
    .map((m) => m.id as string);

  return ids.length > 0 ? ids : [matchId];
}
