import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardRow = {
  id: string;
  display_name: string;
  current_points: number;
  rank: number;
};

export async function getLeaderboard(
  supabase: SupabaseClient,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, current_points")
    .order("current_points", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row, index) => ({
    id: row.id as string,
    display_name: (row.display_name as string) || "Player",
    current_points: Number(row.current_points ?? 0),
    rank: index + 1,
  }));
}
