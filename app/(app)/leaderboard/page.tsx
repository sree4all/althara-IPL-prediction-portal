import { createClient } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { PageHeader } from "@/components/layout/page-header";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const rows = await getLeaderboard(supabase);

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Sorted by current season points, then player name."
      />
      <LeaderboardTable rows={rows} />
    </div>
  );
}
