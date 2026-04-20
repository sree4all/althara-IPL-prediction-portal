import { createClient } from "@/lib/supabase/server";
import { CommunityPicksList } from "@/components/matches/community-picks-list";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("home_team, away_team, match_time_utc")
    .eq("id", id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        {match?.home_team} vs {match?.away_team}
      </h1>
      <p className="text-sm text-muted-foreground">UTC: {match?.match_time_utc}</p>
      <CommunityPicksList matchId={id} />
    </div>
  );
}

