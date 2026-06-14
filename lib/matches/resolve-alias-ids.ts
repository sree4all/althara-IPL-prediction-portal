import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureNumber } from "@/lib/matches/dedupe-by-match-number";

type MatchRow = {
  id: string;
  external_key?: string | null;
  match_number?: number | null;
};

/** All match row ids sharing the same fixture number (WC26-M8 vs wc2026:m8 duplicates). */
export async function resolveMatchAliasIds(
  supabase: SupabaseClient,
  matchId: string,
): Promise<string[]> {
  const { data: allMatches, error } = await supabase
    .from("matches")
    .select("id, external_key, match_number");
  if (error || !allMatches?.length) return [matchId];

  const selected = allMatches.find((m) => m.id === matchId);
  if (!selected) return [matchId];

  const fixtureNo = fixtureNumber(selected as MatchRow);
  if (fixtureNo == null) return [matchId];

  const ids = allMatches
    .filter((m) => fixtureNumber(m as MatchRow) === fixtureNo)
    .map((m) => m.id as string);

  return ids.length > 0 ? ids : [matchId];
}
