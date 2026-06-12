import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardRow = {
  id: string;
  display_name: string;
  current_points: number;
  rank: number;
};

function compareLeaderboardRows(
  a: { display_name: unknown; current_points: unknown },
  b: { display_name: unknown; current_points: unknown },
): number {
  const pointsDiff =
    Number(b.current_points ?? 0) - Number(a.current_points ?? 0);
  if (pointsDiff !== 0) return pointsDiff;

  const nameA = String(a.display_name ?? "Player").toLocaleLowerCase();
  const nameB = String(b.display_name ?? "Player").toLocaleLowerCase();
  return nameA.localeCompare(nameB);
}

export async function getLeaderboard(
  supabase: SupabaseClient,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, current_points");

  if (error || !data) {
    return [];
  }

  const sorted = [...data].sort(compareLeaderboardRows);

  return sorted.map((row, index) => ({
    id: row.id as string,
    display_name: (row.display_name as string) || "Player",
    current_points: Number(row.current_points ?? 0),
    rank: index + 1,
  }));
}
