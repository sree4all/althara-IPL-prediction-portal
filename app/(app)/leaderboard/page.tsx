import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const rows = await getLeaderboard(supabase);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Leaderboard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Sorted by current season points, then player name.
      </p>
      <LeaderboardTable rows={rows} />
    </div>
  );
}
